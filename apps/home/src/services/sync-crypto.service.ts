import type { EncryptedEnvelope, KdfParams } from '@aura/core/sync'
import { db } from '@/repositories/db'

/**
 * Aura Sync — cifrado extremo a extremo (opt-in).
 *
 * Cuando el usuario lo activa, lo que sube al proveedor deja de ser JSON legible
 * y pasa a ser un `EncryptedEnvelope`: ni Google ni nadie con acceso al archivo
 * puede leerlo sin la frase. Los datos LOCALES siguen en claro en IndexedDB —
 * esto protege la copia en la nube, no el dispositivo.
 *
 * Decisiones:
 * - **AES-GCM 256**: cifrado autenticado, así que una frase incorrecta o un
 *   archivo manipulado fallan al descifrar en vez de devolver basura.
 * - **PBKDF2-SHA256, 600 000 iteraciones** (recomendación OWASP para PBKDF2-
 *   SHA256). Está en WebCrypto: sin dependencias nuevas.
 * - **La sal y las iteraciones viajan en el sobre**, no son secretas. Sin ellas
 *   otro dispositivo con la misma frase no podría re-derivar la clave.
 * - **La clave se guarda no extraíble** en IndexedDB para que la sincronización
 *   automática no pida la frase en cada arranque.
 *
 * ⚠️ Si el usuario olvida la frase, el respaldo remoto es irrecuperable: no hay
 * puerta trasera. Por eso el cifrado es opt-in y la UI lo advierte.
 */

export const ALGORITHM = 'AES-GCM-256'
const KDF_NAME = 'PBKDF2'
const KDF_HASH = 'SHA-256'
const KDF_ITERATIONS = 600_000
const IV_BYTES = 12
const SALT_BYTES = 16

/** Cabecera que marca un binario cifrado; permite reconocer los antiguos en claro. */
const BLOB_MAGIC = 'AURAENC1'

/** Frase incorrecta, sobre manipulado o clave ausente. */
export class SyncCryptoError extends Error {
  constructor(message = 'No se pudo descifrar el respaldo. ¿La frase es correcta?') {
    super(message)
    this.name = 'SyncCryptoError'
  }
}

// ---------- base64 ----------

function bytesToBase64(bytes: Uint8Array): string {
  // Por trozos: `String.fromCharCode(...bytes)` desborda la pila con respaldos grandes.
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

// El genérico importa: `BufferSource` de WebCrypto exige un Uint8Array
// respaldado por ArrayBuffer, no por el ArrayBufferLike que se infiere por defecto.
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ---------- Derivación ----------

/** Parámetros nuevos para una frase que se estrena (sal aleatoria). */
export function newKdfParams(): KdfParams {
  return {
    name: KDF_NAME,
    hash: KDF_HASH,
    iterations: KDF_ITERATIONS,
    salt: bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES))),
  }
}

/**
 * Deriva la clave AES a partir de la frase. Devuelve una clave NO extraíble:
 * ni siquiera esta app puede volver a leer sus bytes.
 */
export async function deriveKey(passphrase: string, kdf: KdfParams): Promise<CryptoKey> {
  if (kdf.name !== KDF_NAME) {
    throw new SyncCryptoError(`Derivación no soportada: ${kdf.name}.`)
  }
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    KDF_NAME,
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: KDF_NAME,
      salt: base64ToBytes(kdf.salt),
      iterations: kdf.iterations,
      hash: kdf.hash,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ---------- Sobres ----------

export async function encryptEnvelope(
  payload: unknown,
  key: CryptoKey,
  kdf: KdfParams,
): Promise<EncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    algorithm: ALGORITHM,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    kdf,
  }
}

export async function decryptEnvelope(
  envelope: EncryptedEnvelope,
  key: CryptoKey,
): Promise<unknown> {
  if (envelope.algorithm !== ALGORITHM) {
    throw new SyncCryptoError(`Algoritmo no soportado: ${envelope.algorithm}.`)
  }
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.ciphertext),
    )
  } catch {
    // AES-GCM autentica: aquí caen tanto la frase equivocada como un archivo alterado.
    throw new SyncCryptoError()
  }
  return JSON.parse(new TextDecoder().decode(plaintext))
}

// ---------- Binarios (documentos) ----------

/** Cifra un binario anteponiendo la cabecera y el IV. */
export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    await blob.arrayBuffer(),
  )
  return new Blob([new TextEncoder().encode(BLOB_MAGIC), iv, new Uint8Array(ciphertext)], {
    type: 'application/octet-stream',
  })
}

/**
 * Descifra si el binario lleva la cabecera; si no, lo devuelve tal cual (fue
 * subido antes de activar el cifrado). `type` restaura el MIME original, que
 * el cifrado no conserva.
 */
export async function decryptBlobIfNeeded(
  blob: Blob,
  key: CryptoKey | null,
  type?: string,
): Promise<Blob> {
  const header = new TextDecoder().decode(await blob.slice(0, BLOB_MAGIC.length).arrayBuffer())
  if (header !== BLOB_MAGIC) return blob

  if (!key) {
    throw new SyncCryptoError('El archivo está cifrado y no hay clave en este dispositivo.')
  }
  const iv = new Uint8Array(
    await blob.slice(BLOB_MAGIC.length, BLOB_MAGIC.length + IV_BYTES).arrayBuffer(),
  )
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      await blob.slice(BLOB_MAGIC.length + IV_BYTES).arrayBuffer(),
    )
    return new Blob([plaintext], type ? { type } : undefined)
  } catch {
    throw new SyncCryptoError('No se pudo descifrar un archivo adjunto.')
  }
}

// ---------- Clave persistida ----------

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
