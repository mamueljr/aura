import type { KdfParams } from '@aura/core/sync'
import { db } from '@/repositories/db'

/**
 * Aura Sync — persistencia local de la clave de cifrado (Aura Home).
 *
 * El cifrado en sí vive en `@aura/sync/crypto`, compartido con el resto del
 * ecosistema. Lo único específico de cada app es DÓNDE se guarda la clave
 * derivada: aquí, en la tabla `syncSecrets` de la base de Home.
 *
 * La clave se conserva derivada (y no extraíble) para que la sincronización
 * automática no pida la frase en cada arranque; los datos locales ya están en
 * claro en IndexedDB, así que exigirla cada vez no protegería nada adicional
 * en este dispositivo.
 */

// Se reexporta el cifrado compartido para no cambiar los imports de la app.
export {
  ALGORITHM,
  decryptBlobIfNeeded,
  decryptEnvelope,
  deriveKey,
  encryptBlob,
  encryptEnvelope,
  newKdfParams,
  SyncCryptoError,
} from '@aura/sync/crypto'

const SECRET_ID = 'default'

export async function saveKey(key: CryptoKey, kdf: KdfParams): Promise<void> {
  await db.syncSecrets.put({ id: SECRET_ID, key, kdf })
}

export async function loadKey(): Promise<{ key: CryptoKey; kdf: KdfParams } | null> {
  const row = await db.syncSecrets.get(SECRET_ID)
  return row ? { key: row.key, kdf: row.kdf } : null
}

export async function clearKey(): Promise<void> {
  await db.syncSecrets.delete(SECRET_ID)
}
