import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/db';
import { useSyncStore } from '@/stores/syncStore';

/**
 * Los comprobantes son lo único de Finance que no cabe en el snapshot: viajan
 * por el canal de binarios y en el respaldo solo queda su referencia.
 *
 * Eso abre dos formas de perder la foto que los tests de fusión no ven: subir
 * el archivo pero no publicar la referencia (el otro dispositivo ve el
 * movimiento y no puede descargarla), y cambiar el cifrado sin reescribir lo
 * ya subido (queda ilegible). Ambas tienen su caso aquí.
 */
const fake = vi.hoisted(() => {
  const archivos = new Map<string, Blob>();
  return { remote: null as unknown, archivos, siguienteRef: 1 };
});

vi.mock('./provider', () => ({
  BACKUP_KEY: 'aura-finance-backup.json',
  provider: {
    id: 'fake',
    getAccessToken: () => Promise.resolve('token-de-prueba'),
    pull: () => Promise.resolve(fake.remote),
    push: (_key: string, payload: unknown) => {
      fake.remote = payload;
      return Promise.resolve();
    },
    remove: () => Promise.resolve(),
    connect: () => Promise.resolve('persona@example.com'),
    disconnect: () => {},
    blobs: {
      put: (blob: Blob, opts?: { ref?: string | null }) => {
        const ref = opts?.ref ?? `drive-${fake.siguienteRef++}`;
        fake.archivos.set(ref, blob);
        return Promise.resolve(ref);
      },
      get: (ref: string) => {
        const blob = fake.archivos.get(ref);
        return blob ? Promise.resolve(blob) : Promise.reject(new Error('no existe'));
      },
      remove: (ref: string) => {
        fake.archivos.delete(ref);
        return Promise.resolve();
      },
    },
  },
}));

const { purgeExpiredReceipts, reuploadReceipts, syncReceipts } = await import('./receipts');
const { setUpEncryption, syncNow } = await import('./index');
const { mergeSnapshot } = await import('./snapshot');
const { clearKey } = await import('./crypto');

const FRASE = 'una frase larga y secreta';
const FOTO = 'JPEG-de-mentira-con-el-ticket';

async function movimientoConComprobante(
  id: string,
  extra: Partial<{ deletedAt: string; receiptDriveFileId: string; receiptType: string }> = {},
): Promise<string> {
  const receiptId = `rec-${id}`;
  const now = new Date().toISOString();
  await db.transactions.put({
    id,
    type: 'expense',
    description: `Movimiento ${id}`,
    amount: 100,
    category: 'Otro gasto',
    date: '2026-08-01',
    accountId: 'acc-1',
    receiptId,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });
  return receiptId;
}

const guardarFoto = (receiptId: string, texto = FOTO): Promise<unknown> =>
  db.receipts.put({ id: receiptId, blob: new Blob([texto], { type: 'image/jpeg' }) });

const textoEnDrive = async (ref: string): Promise<string> =>
  fake.archivos.get(ref)!.text();

beforeEach(async () => {
  fake.remote = null;
  fake.archivos.clear();
  fake.siguienteRef = 1;
  await clearKey();
  await Promise.all([db.transactions, db.receipts].map((t) => t.clear()));
  useSyncStore.setState({
    enabled: true,
    accountEmail: 'persona@example.com',
    lastSyncAt: null,
    fileId: null,
    encrypted: false,
  });
});

describe('subida', () => {
  it('sube el comprobante y anota su referencia', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);

    expect(await syncReceipts()).toBe(true);

    const tx = (await db.transactions.get('t1'))!;
    expect(tx.receiptDriveFileId).toBeTruthy();
    expect(tx.receiptType).toBe('image/jpeg');
    expect(await textoEnDrive(tx.receiptDriveFileId!)).toBe(FOTO);
  });

  it('no lo vuelve a subir si ya tiene referencia', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    await syncReceipts();

    // Nada que publicar la segunda vez: si devolviera `true`, cada
    // sincronización dispararía un push extra para siempre.
    expect(await syncReceipts()).toBe(false);
    expect(fake.archivos.size).toBe(1);
  });

  it('publica la referencia en el respaldo, no solo en local', async () => {
    // El fallo que ya nos costó una tarde en Music: el archivo sube pero el
    // índice no, y el otro dispositivo ve el movimiento sin poder descargarlo.
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);

    await syncNow();

    const subido = fake.remote as { data: { transactions: { receiptDriveFileId?: string }[] } };
    expect(subido.data.transactions[0].receiptDriveFileId).toBeTruthy();
  });

  it('la referencia sobrevive a la fusión en el otro dispositivo', async () => {
    const receiptId = await movimientoConComprobante('t1');
    const sinRef = (await db.transactions.get('t1'))!;
    await guardarFoto(receiptId);
    await syncReceipts();
    const conRef = (await db.transactions.get('t1'))!;

    // El otro dispositivo tiene esa misma fila, sin tocar y sin referencia.
    await db.transactions.clear();
    await db.transactions.put(sinRef);

    await mergeSnapshot({
      transactions: [conRef],
      accounts: [],
      budgets: [],
      recurringRules: [],
    });

    // La fusión es última-escritura-gana: si anotar la referencia no moviera
    // `updatedAt`, la fila entrante se descartaría por empate y la foto sería
    // inalcanzable desde aquí para siempre.
    expect((await db.transactions.get('t1'))!.receiptDriveFileId).toBe(conRef.receiptDriveFileId);
  });
});

describe('descarga', () => {
  it('el otro dispositivo lo baja a partir de la referencia', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    await syncReceipts();
    const ref = (await db.transactions.get('t1'))!.receiptDriveFileId!;

    // "Otro dispositivo": tiene el movimiento (con la referencia) pero no la foto.
    await db.receipts.clear();
    await movimientoConComprobante('t1', { receiptDriveFileId: ref, receiptType: 'image/jpeg' });

    await syncReceipts();

    const local = await db.receipts.get(receiptId);
    expect(await local!.blob.text()).toBe(FOTO);
  });

  it('un movimiento borrado se lleva su comprobante local', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    // El borrado llegó del otro dispositivo: la lápida está, la foto sobra.
    await movimientoConComprobante('t1', { deletedAt: new Date().toISOString() });

    await syncReceipts();

    expect(await db.receipts.get(receiptId)).toBeUndefined();
  });
});

describe('cifrado', () => {
  it('con el cifrado activo, en Drive no quedan los bytes originales', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    await setUpEncryption(FRASE);

    await syncReceipts();

    const ref = (await db.transactions.get('t1'))!.receiptDriveFileId!;
    expect(await textoEnDrive(ref)).not.toContain(FOTO);
  });

  it('y al bajarlo se descifra, recuperando el MIME', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    await setUpEncryption(FRASE);
    await syncReceipts();
    const ref = (await db.transactions.get('t1'))!.receiptDriveFileId!;

    await db.receipts.clear();
    await syncReceipts();

    const local = (await db.receipts.get(receiptId))!;
    expect(await local.blob.text()).toBe(FOTO);
    // El cifrado no conserva el MIME: sale de `receiptType`.
    expect(local.blob.type).toBe('image/jpeg');
    expect(ref).toBeTruthy();
  });

  it('activar el cifrado reescribe los comprobantes ya subidos', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    await syncReceipts();
    const ref = (await db.transactions.get('t1'))!.receiptDriveFileId!;
    expect(await textoEnDrive(ref)).toBe(FOTO);

    await setUpEncryption(FRASE);

    // Mismo archivo, ya ilegible: si se quedara en claro, el otro dispositivo
    // se encontraría el respaldo cifrado y las fotos no.
    expect(await textoEnDrive(ref)).not.toContain(FOTO);
  });

  it('reuploadReceipts(null) los devuelve a claro sobre el mismo archivo', async () => {
    const receiptId = await movimientoConComprobante('t1');
    await guardarFoto(receiptId);
    await syncReceipts();
    const ref = (await db.transactions.get('t1'))!.receiptDriveFileId!;
    await setUpEncryption(FRASE);

    await reuploadReceipts(null);

    expect(await textoEnDrive(ref)).toBe(FOTO);
    expect(fake.archivos.size).toBe(1);
  });
});

describe('limpieza en Drive', () => {
  it('borra solo los de lápidas ya caducadas', async () => {
    const viejo = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const reciente = new Date(Date.now() - 2 * 86_400_000).toISOString();
    fake.archivos.set('drive-viejo', new Blob(['x']));
    fake.archivos.set('drive-reciente', new Blob(['y']));
    await movimientoConComprobante('t1', { deletedAt: viejo, receiptDriveFileId: 'drive-viejo' });
    await movimientoConComprobante('t2', {
      deletedAt: reciente,
      receiptDriveFileId: 'drive-reciente',
    });

    await purgeExpiredReceipts();

    // El reciente se queda: el otro dispositivo puede no haberse enterado aún
    // del borrado, y su lápida sigue viva.
    expect(fake.archivos.has('drive-viejo')).toBe(false);
    expect(fake.archivos.has('drive-reciente')).toBe(true);
  });
});
