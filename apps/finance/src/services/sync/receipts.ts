import { decryptBlobIfNeeded, encryptBlob } from '@aura/sync/crypto';

import { db } from '@/db/db';
import type { Transaction } from '@/types/transaction';

import { loadKey } from './crypto';
import { provider } from './provider';
import { TOMBSTONE_RETENTION_DAYS } from './snapshot';

/**
 * Sincronización de los comprobantes (la foto del recibo).
 *
 * Los bytes NO caben en el snapshot: viajan por el `SyncBlobChannel` del
 * proveedor — el mismo canal por el que Home sube sus documentos y Music el
 * audio — y en el snapshot solo queda `receiptDriveFileId`.
 *
 * Si el proveedor no ofrece canal de binarios, todo esto se salta en silencio:
 * los movimientos siguen sincronizando y el comprobante se queda local.
 */

/** Prefijo propio: `appDataFolder` es compartido con Home y Music. */
const RECEIPT_PREFIX = 'receipt-';

/** Movimientos vivos que tienen comprobante. */
async function withReceipt(): Promise<Transaction[]> {
  return db.transactions.filter((t) => !t.deletedAt && !!t.receiptId).toArray();
}

/**
 * Sube los comprobantes que faltan y baja los que este dispositivo no tiene.
 *
 * @returns `true` si cambió alguna referencia, es decir, si hace falta volver a
 * publicar el snapshot. Sin eso las referencias se quedarían solo aquí y el
 * otro dispositivo vería el movimiento sin poder descargar su comprobante —
 * exactamente el fallo que ya nos costó una tarde en Music.
 */
export async function syncReceipts(): Promise<boolean> {
  const blobs = provider.blobs;
  if (!blobs) return false;

  const secret = await loadKey();
  let refsChanged = false;

  for (const transaction of await withReceipt()) {
    const receiptId = transaction.receiptId!;
    const local = await db.receipts.get(receiptId);

    if (local?.blob) {
      if (transaction.receiptDriveFileId) continue;
      try {
        const outgoing = secret ? await encryptBlob(local.blob, secret.key) : local.blob;
        const ref = await blobs.put(outgoing, { name: `${RECEIPT_PREFIX}${receiptId}` });
        // `updatedAt` SÍ se toca: la fusión es última-escritura-gana, así que
        // sin mover la marca la referencia nunca llegaría al otro dispositivo
        // (su fila tendría la misma fecha y descartaría esta).
        await db.transactions.update(transaction.id, {
          receiptDriveFileId: ref,
          receiptType: local.blob.type || undefined,
          updatedAt: new Date().toISOString(),
        });
        refsChanged = true;
      } catch (error) {
        console.warn(`No se pudo subir el comprobante de "${transaction.description}":`, error);
      }
      continue;
    }

    // Sin copia local pero con referencia: llegó del otro dispositivo.
    if (transaction.receiptDriveFileId) {
      try {
        const raw = await blobs.get(transaction.receiptDriveFileId);
        // Los subidos antes de activar el cifrado no llevan cabecera y pasan
        // tal cual; el MIME se restaura desde `receiptType`.
        const blob = await decryptBlobIfNeeded(raw, secret?.key ?? null, transaction.receiptType);
        await db.receipts.put({ id: receiptId, blob });
      } catch (error) {
        console.warn(`No se pudo descargar el comprobante de "${transaction.description}":`, error);
      }
    }
  }

  // Un borrado llegado del otro dispositivo deja su comprobante huérfano aquí.
  const deleted = await db.transactions.filter((t) => !!t.deletedAt && !!t.receiptId).toArray();
  for (const transaction of deleted) {
    await db.receipts.delete(transaction.receiptId!);
  }

  return refsChanged;
}

/**
 * Borra en Drive los comprobantes de los movimientos cuya lápida está a punto
 * de purgarse. Se espera a que caduque el tombstone, no al borrado: hasta
 * entonces el otro dispositivo todavía puede no haberse enterado.
 */
export async function purgeExpiredReceipts(): Promise<void> {
  const blobs = provider.blobs;
  if (!blobs) return;

  const cutoff = new Date(Date.now() - TOMBSTONE_RETENTION_DAYS * 86_400_000).toISOString();
  const expired = await db.transactions
    .filter((t) => !!t.deletedAt && t.deletedAt < cutoff && !!t.receiptDriveFileId)
    .toArray();

  for (const transaction of expired) {
    try {
      await blobs.remove(transaction.receiptDriveFileId!);
    } catch (error) {
      console.warn('No se pudo borrar un comprobante en Drive:', error);
    }
  }
}

/**
 * Reescribe en Drive todos los comprobantes con la clave dada (o sin ninguna,
 * para dejarlos en claro). Se usa al activar y al desactivar el cifrado: si no,
 * los ya subidos se quedarían con el formato anterior y el otro dispositivo no
 * podría abrirlos.
 */
export async function reuploadReceipts(key: CryptoKey | null): Promise<void> {
  const blobs = provider.blobs;
  if (!blobs) return;

  for (const transaction of await withReceipt()) {
    if (!transaction.receiptDriveFileId) continue;
    const local = await db.receipts.get(transaction.receiptId!);
    if (!local?.blob) continue;

    try {
      const outgoing = key ? await encryptBlob(local.blob, key) : local.blob;
      await blobs.put(outgoing, {
        ref: transaction.receiptDriveFileId,
        name: `${RECEIPT_PREFIX}${transaction.receiptId}`,
      });
    } catch (error) {
      console.warn(`No se pudo reescribir el comprobante de "${transaction.description}":`, error);
    }
  }
}
