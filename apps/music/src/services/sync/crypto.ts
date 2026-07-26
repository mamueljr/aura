import type { KdfParams } from '@aura/core/sync';

import { db } from '@/infrastructure/db/db';

/**
 * Persistencia local de la clave de cifrado (Aura Music).
 *
 * El cifrado vive en `@aura/sync/crypto`, compartido con el ecosistema; lo
 * único propio de cada app es dónde se guarda la clave derivada.
 */
export {
  decryptBlobIfNeeded,
  decryptEnvelope,
  deriveKey,
  encryptBlob,
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
