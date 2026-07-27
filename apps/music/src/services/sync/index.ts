import type { AuraSyncEnvelope, EncryptedEnvelope, SyncPayload } from '@aura/core/sync';

import { db } from '@/infrastructure/db/db';
import { useSyncStore } from '@/stores/syncStore';

import {
  clearKey,
  decryptEnvelope,
  deriveKey,
  loadKey,
  newKdfParams,
  saveKey,
  SyncCryptoError,
} from './crypto';
import { reuploadTracks } from './library';
import { BACKUP_KEY, provider } from './provider';
import { pushSnapshot } from './push';
import { mergeSnapshot, totalMerged } from './snapshot';
import type { SyncSnapshot } from './types';

/**
 * Aura Sync — orquestación de Aura Music.
 *
 * Mismo contrato que Aura Home (`@aura/core/sync`) y mismo transporte
 * (`@aura/sync/drive`); este archivo solo decide qué lado gana. Qué se replica
 * y cómo se fusiona vive en `snapshot.ts`.
 *
 * (Sustituye al `NoopSyncProvider` que había aquí de placeholder.)
 */

export { loadGis, SyncAuthError } from '@aura/sync/drive';
export type { SyncSnapshot };

export type SyncResult =
  | { action: 'pushed' | 'up-to-date'; syncedAt: string }
  | { action: 'pulled' | 'merged'; syncedAt: string; imported: number };

/** Momento del cambio local más reciente, o null si no hay nada que sincronizar. */
async function latestLocalChange(): Promise<string | null> {
  const [playlists, tracks] = await Promise.all([db.playlists.toArray(), db.tracks.toArray()]);
  let latest = 0;
  for (const playlist of playlists) latest = Math.max(latest, playlist.updatedAt ?? 0);
  for (const track of tracks) latest = Math.max(latest, track.lastPlayedAt ?? 0);
  return latest > 0 ? new Date(latest).toISOString() : null;
}

async function push(): Promise<SyncResult> {
  return { action: 'pushed', syncedAt: await pushSnapshot() };
}

/** Devuelve el snapshot en claro: descifra si viene cifrado. */
async function openPayload(payload: SyncPayload): Promise<AuraSyncEnvelope<SyncSnapshot>> {
  if (!('ciphertext' in payload)) return payload as AuraSyncEnvelope<SyncSnapshot>;

  const secret = await loadKey();
  if (!secret) {
    throw new SyncCryptoError(
      'El respaldo está cifrado. Introduce tu frase de cifrado para usarlo en este dispositivo.',
    );
  }
  return (await decryptEnvelope(payload, secret.key)) as AuraSyncEnvelope<SyncSnapshot>;
}

/**
 * Sincroniza según qué lado cambió desde la última vez. Si ambos cambiaron,
 * fusiona lo remoto sobre lo local y sube el resultado.
 */
export async function syncNow(opts?: { interactive?: boolean }): Promise<SyncResult> {
  // Pre-vuelo: falla rápido si la sesión ya no sirve, antes de tocar nada.
  await provider.getAccessToken(opts);

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

export async function isEncryptionEnabled(): Promise<boolean> {
  return (await loadKey()) !== null;
}

async function unlockWithPayload(payload: EncryptedEnvelope, passphrase: string): Promise<void> {
  if (!payload.kdf) {
    throw new SyncCryptoError('El respaldo cifrado no indica cómo derivar la clave.');
  }
  const key = await deriveKey(passphrase, payload.kdf);
  // Verificar ANTES de guardar: una frase incorrecta no debe quedar registrada.
  await decryptEnvelope(payload, key);
  await saveKey(key, payload.kdf);
  useSyncStore.getState().setEncrypted(true);
}

/**
 * Punto de entrada de la UI: desbloquea este dispositivo si el respaldo remoto
 * ya está cifrado, o activa el cifrado por primera vez si no lo está. Evita que
 * un segundo dispositivo genere otra clave y deje el respaldo ilegible.
 *
 * ⚠️ Si se olvida la frase, el respaldo remoto queda irrecuperable.
 */
export async function setUpEncryption(passphrase: string): Promise<'unlocked' | 'enabled'> {
  const payload = await provider.pull(BACKUP_KEY);
  if (payload && 'ciphertext' in payload) {
    await unlockWithPayload(payload, passphrase);
    return 'unlocked';
  }
  const kdf = newKdfParams();
  const key = await deriveKey(passphrase, kdf);
  await saveKey(key, kdf);
  // El audio ya subido se reescribe cifrado; si no, quedaría en claro pese a
  // que la UI diga lo contrario. Lo que no esté disponible aquí lo cifrará el
  // dispositivo que lo tenga (no es pérdida, solo cifrado incompleto).
  await reuploadTracks(key);
  await push();
  useSyncStore.getState().setEncrypted(true);
  return 'enabled';
}

/**
 * Desactiva el cifrado y deja el respaldo remoto legible otra vez.
 *
 * Antes de soltar la clave reescribe en claro el audio ya subido: sin ella, un
 * archivo cifrado que solo exista en la nube sería irrecuperable. Si alguna
 * pista no tiene copia en este dispositivo **no se desactiva nada** y se avisa,
 * en vez de dejarla inaccesible en silencio.
 */
export async function disableEncryption(): Promise<number> {
  if (!(await loadKey())) return 0;

  const { converted, unavailable } = await reuploadTracks(null);
  if (unavailable > 0) {
    throw new SyncCryptoError(
      `${unavailable} pistas solo existen cifradas en la nube. Reprodúcelas en este dispositivo (o hazlo desde el que las tiene) antes de desactivar el cifrado.`,
    );
  }

  await clearKey();
  await push();
  useSyncStore.getState().setEncrypted(false);
  return converted;
}
