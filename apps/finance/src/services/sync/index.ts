import type {
  AuraSyncEnvelope,
  EncryptedEnvelope,
  SyncPayload,
  SyncResult as CoreSyncResult,
} from '@aura/core/sync';

import { db } from '@/db/db';
import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';
import {
  clearKey,
  decryptEnvelope,
  deriveKey,
  encryptEnvelope,
  loadKey,
  newKdfParams,
  saveKey,
  SyncCryptoError,
} from './crypto';
import { BACKUP_KEY, provider } from './provider';
import { purgeExpiredReceipts, reuploadReceipts, syncReceipts } from './receipts';
import { exportSnapshot, mergeSnapshot, purgeOldTombstones, totalMerged, type SyncSnapshot } from './snapshot';

/**
 * Aura Sync — orquestación de Aura Finance.
 *
 * Mismo contrato (`@aura/core/sync`) y mismo transporte (`@aura/sync/drive`)
 * que Home y Music; este archivo solo decide qué lado gana. Qué se replica y
 * cómo se fusiona vive en `snapshot.ts`.
 *
 * El cifrado extremo a extremo es **opt-in**: mientras no se active, el
 * respaldo viaja en JSON legible (como cualquier respaldo de Drive). Al
 * activarlo, lo que se sube deja de poder leerse sin la frase del usuario.
 *
 * Los comprobantes (fotos) no caben en el snapshot: viajan por el canal de
 * binarios (`receipts.ts`) y aquí solo queda su referencia.
 */

export { loadGis, SyncAuthError } from '@aura/sync/drive';
export { SyncCryptoError } from './crypto';
export type { SyncSnapshot };

export type SyncResult = Extract<
  CoreSyncResult,
  { action: 'pushed' | 'up-to-date' | 'pulled' | 'merged' }
>;

const SCHEMA_VERSION = 6;

/** Fecha (ISO) del cambio local más reciente entre las 4 colecciones, o null si no hay datos. */
async function latestLocalChange(): Promise<string | null> {
  let latest: string | null = null;
  await db.transaction(
    'r',
    [db.transactions, db.accounts, db.budgets, db.recurringRules],
    async () => {
      const tables = [db.transactions, db.accounts, db.budgets, db.recurringRules];
      for (const table of tables) {
        const rows = await table.toArray();
        for (const row of rows as { updatedAt: string }[]) {
          if (!latest || row.updatedAt > latest) latest = row.updatedAt;
        }
      }
    },
  );
  return latest;
}

async function push(): Promise<SyncResult> {
  const data = await exportSnapshot();
  const envelope: AuraSyncEnvelope<SyncSnapshot> = {
    app: APP_CONFIG.slug,
    appVersion: APP_CONFIG.version,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  // Con clave en este dispositivo, lo que sale hacia Drive va cifrado.
  const secret = await loadKey();
  const payload = secret ? await encryptEnvelope(envelope, secret.key, secret.kdf) : envelope;
  await provider.push(BACKUP_KEY, payload);
  useSyncStore.getState().setLastSync(envelope.exportedAt);
  return { action: 'pushed', syncedAt: envelope.exportedAt };
}

/**
 * Devuelve el sobre en claro, descifrando si hace falta.
 *
 * Sin clave en este dispositivo no se puede seguir: fallar claro es mucho mejor
 * que tratar un sobre cifrado como un respaldo vacío, porque eso subiría
 * después lo local encima y borraría los datos del otro dispositivo.
 */
async function openPayload(payload: SyncPayload): Promise<AuraSyncEnvelope<SyncSnapshot>> {
  if (!('ciphertext' in payload)) return payload as AuraSyncEnvelope<SyncSnapshot>;

  const secret = await loadKey();
  if (!secret) {
    throw new SyncCryptoError(
      'El respaldo está cifrado. Escribe tu frase de cifrado en Ajustes para usarlo en este dispositivo.',
    );
  }
  return (await decryptEnvelope(payload, secret.key)) as AuraSyncEnvelope<SyncSnapshot>;
}

/**
 * Sincroniza según qué lado cambió desde la última vez. Si ambos cambiaron,
 * fusiona lo remoto sobre lo local (registro a registro, última-escritura-gana
 * incluyendo tombstones) y sube el resultado.
 */
export async function syncNow(opts?: { interactive?: boolean }): Promise<SyncResult> {
  // Pre-vuelo: falla rápido si la sesión ya no sirve, antes de tocar nada.
  await provider.getAccessToken(opts);
  // Antes de purgar las lápidas: después ya no queda de dónde sacar qué
  // comprobantes sobran en Drive.
  await purgeExpiredReceipts();
  await purgeOldTombstones();

  const result = await reconcile();

  // Los comprobantes van después del snapshot: hasta fusionarlo no se sabe qué
  // movimientos existen ni cuáles traen referencia.
  if (await syncReceipts()) await push();
  return result;
}

/** Decide qué lado gana y deja el snapshot al día en ambos. */
async function reconcile(): Promise<SyncResult> {
  const payload = await provider.pull(BACKUP_KEY);
  if (!payload) return push();

  const remote = await openPayload(payload);
  const { lastSyncAt } = useSyncStore.getState();
  const localChange = await latestLocalChange();

  const remoteChanged = !lastSyncAt || remote.exportedAt > lastSyncAt;
  const localChanged = lastSyncAt ? (localChange ?? '') > lastSyncAt : localChange !== null;

  if (!remoteChanged && !localChanged) {
    const syncedAt = new Date().toISOString();
    useSyncStore.getState().setLastSync(syncedAt);
    return { action: 'up-to-date', syncedAt };
  }
  if (localChanged && !remoteChanged) return push();

  const imported = totalMerged(await mergeSnapshot(remote.data));
  if (remoteChanged && !localChanged) {
    const syncedAt = new Date().toISOString();
    useSyncStore.getState().setLastSync(syncedAt);
    return { action: 'pulled', syncedAt, imported };
  }
  // Ambos lados cambiaron: ya se fusionó lo remoto; ahora sube el resultado.
  const pushed = await push();
  return { action: 'merged', syncedAt: pushed.syncedAt, imported };
}

/** Inicia sesión con Google y devuelve la cuenta conectada. */
export async function connect(): Promise<string> {
  const account = (await provider.connect?.()) ?? 'cuenta conectada';
  useSyncStore.getState().setConnected(account);
  return account;
}

/** Cierra la sesión: revoca credenciales y limpia el estado persistido. */
export function disconnect(): void {
  provider.disconnect?.();
  useSyncStore.getState().disconnect();
}

// ---------- Cifrado extremo a extremo (opt-in) ----------

/** ¿Hay clave de cifrado en este dispositivo? */
export async function isEncryptionEnabled(): Promise<boolean> {
  return (await loadKey()) !== null;
}

/**
 * Desbloquea este dispositivo contra un respaldo YA cifrado en otro: la sal
 * viaja en el sobre, así que la misma frase deriva la misma clave.
 *
 * Se verifica descifrando ANTES de guardar, para que una frase incorrecta no
 * quede registrada y rompa las siguientes sincronizaciones.
 */
async function unlockWith(payload: EncryptedEnvelope, passphrase: string): Promise<void> {
  if (!payload.kdf) {
    throw new SyncCryptoError('El respaldo cifrado no indica cómo derivar la clave.');
  }
  const key = await deriveKey(passphrase, payload.kdf);
  await decryptEnvelope(payload, key);
  await saveKey(key, payload.kdf);
  useSyncStore.getState().setEncrypted(true);
}

/**
 * Punto de entrada de la UI para activar el cifrado.
 *
 * Si el respaldo remoto YA está cifrado, este dispositivo se desbloquea con la
 * frase existente en vez de activar el cifrado de cero. La distinción evita el
 * error caro: que un segundo dispositivo genere su propia clave y deje el
 * respaldo ilegible para el primero.
 *
 * ⚠️ Si se olvida la frase, el respaldo en Drive queda irrecuperable: la clave
 * no sale del dispositivo y no hay puerta trasera.
 */
export async function setUpEncryption(passphrase: string): Promise<'unlocked' | 'enabled'> {
  await provider.getAccessToken({ interactive: true });

  const payload = await provider.pull(BACKUP_KEY);
  if (payload && 'ciphertext' in payload) {
    await unlockWith(payload, passphrase);
    return 'unlocked';
  }

  // Si había un respaldo en claro, se incorpora ANTES de cifrar: el push de
  // abajo lo sobrescribe, y sin esto se perdería lo que el otro dispositivo
  // hubiera subido y aquí todavía no estuviera.
  if (payload) await mergeSnapshot((payload as AuraSyncEnvelope<SyncSnapshot>).data);

  const kdf = newKdfParams();
  const key = await deriveKey(passphrase, kdf);
  await saveKey(key, kdf);
  useSyncStore.getState().setEncrypted(true);
  // Los comprobantes ya subidos están en claro: hay que reescribirlos, o el
  // otro dispositivo se encontraría el respaldo cifrado y las fotos no.
  await reuploadReceipts(key);
  // Vuelve a subirlo todo, ya cifrado: si no, el archivo en claro seguiría en
  // Drive hasta el siguiente cambio local.
  await push();
  return 'enabled';
}

/**
 * Desactiva el cifrado y deja el respaldo remoto legible otra vez.
 *
 * Primero se baja lo que falte: soltar la clave con un comprobante cifrado que
 * solo exista en la nube lo volvería irrecuperable.
 */
export async function disableEncryption(): Promise<void> {
  if (!(await loadKey())) return;
  await provider.getAccessToken({ interactive: true });
  await syncReceipts();
  await reuploadReceipts(null);
  await clearKey();
  useSyncStore.getState().setEncrypted(false);
  await push();
}
