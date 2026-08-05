import type { KdfParams } from '@aura/core/sync';

import { db } from '@/db/db';

/**
 * Aura Sync — persistencia local de la clave de cifrado (Aura Finance).
 *
 * El cifrado en sí vive en `@aura/sync/crypto`, compartido con Home y Music.
 * Lo único propio de cada app es DÓNDE guarda la clave derivada: aquí, en la
 * tabla `syncSecrets` de la base de Finance.
 */

// Se reexporta el cifrado compartido para que la app tenga un solo import.
export {
  decryptEnvelope,
  deriveKey,
  encryptEnvelope,
  newKdfParams,
  SyncCryptoError,
} from '@aura/sync/crypto';

const SECRET_ID = 'default';

export async function saveKey(key: CryptoKey, kdf: KdfParams): Promise<void> {
  await db.syncSecrets.put({ id: SECRET_ID, key, kdf });
}

export async function loadKey(): Promise<{ key: CryptoKey; kdf: KdfParams } | null> {
  const row = await db.syncSecrets.get(SECRET_ID);
  return row ? { key: row.key, kdf: row.kdf } : null;
}

export async function clearKey(): Promise<void> {
  await db.syncSecrets.delete(SECRET_ID);
}
