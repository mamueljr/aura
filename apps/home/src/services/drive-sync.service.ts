import type {
  AuraSyncEnvelope,
  SyncResult as CoreSyncResult,
  EncryptedEnvelope,
  SyncPayload,
  SyncProvider,
} from '@aura/core/sync'
import { documentsRepo } from '@/repositories'
import { BACKUP_TABLES, db } from '@/repositories/db'
import {
  exportBackup,
  importBackup,
  purgeOldTombstones,
  TOMBSTONE_RETENTION_DAYS,
} from '@/services/backup.service'
import {
  deleteLocalDocumentBlob,
  getLocalDocumentBlob,
  putLocalDocumentBlob,
} from '@/services/document-blobs.service'
import { driveProvider, getAccessToken } from '@/services/drive-provider'
import {
  clearKey,
  decryptBlobIfNeeded,
  decryptEnvelope,
  deriveKey,
  encryptBlob,
  encryptEnvelope,
  loadKey,
  newKdfParams,
  saveKey,
  SyncCryptoError,
} from '@/services/sync-crypto.service'
import { useSyncStore } from '@/stores/sync.store'
import type { BaseEntity } from '@/types/entities'

/**
 * Aura Sync — orquestación (Aura Home).
 *
 * Decide qué lado gana y cómo se fusiona; el transporte lo pone un
 * `SyncProvider` de `@aura/core` (hoy `drive-provider`). El respaldo JSON
 * completo (backup.service) viaja como payload; el contenido de los documentos
 * va por el canal de binarios, nunca dentro del snapshot.
 *
 * La fusión es registro a registro con última-escritura-gana (updatedAt),
 * incluyendo tombstones (deletedAt), así que las eliminaciones se propagan
 * y no hay conflictos que el usuario deba resolver: si ambos lados
 * cambiaron, se fusiona y se sube el resultado.
 */

/** Nombre del payload de Home en el proveedor. No cambiar: localiza el archivo ya existente. */
const BACKUP_KEY = 'aura-home-backup.json'

/** El proveedor activo. Cambiarlo por otro `SyncProvider<Blob>` no requiere tocar este archivo. */
const provider: SyncProvider<Blob> = driveProvider

/**
 * Resultados que `syncNow` produce realmente: los fallos se lanzan como
 * excepción, así que las variantes `conflict`/`error` del contrato no aplican.
 * Se deriva del tipo compartido para que no puedan divergir.
 */
export type SyncResult = Extract<
  CoreSyncResult,
  { action: 'pushed' | 'up-to-date' | 'pulled' | 'merged' }
>

export { loadGis, SyncAuthError } from '@/services/drive-provider'

// ---------- Estado local ----------

/** Fecha (ISO) del cambio local más reciente, o null si no hay datos. */
async function getLatestLocalChange(): Promise<string | null> {
  let latest: string | null = null
  await db.transaction('r', BACKUP_TABLES.slice(), async () => {
    for (const table of BACKUP_TABLES) {
      const rows = (await db.table(table).toArray()) as BaseEntity[]
      for (const row of rows) {
        const stamp = row.updatedAt ?? row.createdAt
        if (stamp && (!latest || stamp > latest)) latest = stamp
      }
    }
  })
  return latest
}

// ---------- Contenido de documentos (individual, fuera del snapshot) ----------

/**
 * Sube el contenido de los documentos nuevos (sin driveFileId) y descarga
 * el de los que llegaron por sync de metadata pero cuyo archivo aún no
 * está en este dispositivo. También libera los blobs locales de
 * documentos ya eliminados (el tombstone es lo único que debe persistir).
 * Cada documento es independiente: un error en uno no detiene los demás.
 */
async function syncDocumentBlobs(): Promise<void> {
  const blobs = provider.blobs
  if (!blobs) return

  const secret = await loadKey()
  const docs = await documentsRepo.getAll()
  for (const doc of docs) {
    const local = await getLocalDocumentBlob(doc.id)
    if (local) {
      if (!doc.driveFileId) {
        try {
          const outgoing = secret ? await encryptBlob(local, secret.key) : local
          const ref = await blobs.put(outgoing, { name: `doc-${doc.id}` })
          await documentsRepo.update(doc.id, { driveFileId: ref })
        } catch (error) {
          console.warn(`No se pudo subir el archivo de "${doc.title}":`, error)
        }
      }
      continue
    }
    if (doc.driveFileId) {
      try {
        const raw = await blobs.get(doc.driveFileId)
        // Los archivos subidos antes de activar el cifrado no llevan cabecera
        // y pasan tal cual; el MIME se restaura desde la metadata.
        const blob = await decryptBlobIfNeeded(raw, secret?.key ?? null, doc.fileType)
        await putLocalDocumentBlob(doc.id, blob)
      } catch (error) {
        console.warn(`No se pudo descargar el archivo de "${doc.title}":`, error)
      }
    }
  }

  const deleted = await db.documents.filter((d) => !!d.deletedAt).toArray()
  for (const doc of deleted) await deleteLocalDocumentBlob(doc.id)
}

/** Elimina en el proveedor el archivo de los documentos cuyo tombstone está por purgarse. */
async function purgeExpiredDocumentBlobs(): Promise<void> {
  const blobs = provider.blobs
  if (!blobs) return

  const cutoff = new Date(
    Date.now() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const expired = await db.documents
    .filter((d) => !!d.deletedAt && d.deletedAt < cutoff && !!d.driveFileId)
    .toArray()
  for (const doc of expired) {
    if (doc.driveFileId) await blobs.remove(doc.driveFileId)
  }
}

// ---------- API pública ----------

async function push(): Promise<SyncResult> {
  const backup = await exportBackup()
  const secret = await loadKey()
  const payload = secret ? await encryptEnvelope(backup, secret.key, secret.kdf) : backup
  await provider.push(BACKUP_KEY, payload)
  useSyncStore.getState().setLastSync(backup.exportedAt)
  return { action: 'pushed', syncedAt: backup.exportedAt }
}

/**
 * Devuelve el snapshot en claro: descifra si el payload viene cifrado.
 * Sin clave en este dispositivo no se puede continuar — mejor fallar claro
 * que tratar un sobre cifrado como si fuera un respaldo vacío.
 */
async function openPayload(payload: SyncPayload): Promise<AuraSyncEnvelope> {
  if (!('ciphertext' in payload)) return payload as AuraSyncEnvelope

  const secret = await loadKey()
  if (!secret) {
    throw new SyncCryptoError(
      'El respaldo está cifrado. Introduce tu frase de cifrado en Ajustes para usarlo en este dispositivo.',
    )
  }
  return (await decryptEnvelope(payload, secret.key)) as AuraSyncEnvelope
}

/** Inicia sesión con el proveedor (popup) y devuelve la cuenta conectada. */
export async function connect(): Promise<string> {
  const account = (await provider.connect?.()) ?? 'cuenta conectada'
  useSyncStore.getState().setConnected(account)
  return account
}

async function syncMetadata(): Promise<SyncResult> {
  const { lastSyncAt } = useSyncStore.getState()

  const payload = await provider.pull(BACKUP_KEY)
  if (!payload) return push()
  const remote = await openPayload(payload)

  const localChange = await getLatestLocalChange()

  const remoteChanged = !lastSyncAt || remote.exportedAt > lastSyncAt
  const localChanged = lastSyncAt ? (localChange ?? '') > lastSyncAt : localChange !== null

  if (!remoteChanged && !localChanged) {
    const syncedAt = new Date().toISOString()
    useSyncStore.getState().setLastSync(syncedAt)
    return { action: 'up-to-date', syncedAt }
  }
  if (localChanged && !remoteChanged) return push()
  if (remoteChanged && !localChanged) {
    const imported = await importBackup(JSON.stringify(remote))
    const syncedAt = new Date().toISOString()
    useSyncStore.getState().setLastSync(syncedAt)
    return { action: 'pulled', syncedAt, imported }
  }
  // Ambos lados cambiaron: fusionar lo remoto en lo local y subir el resultado.
  const imported = await importBackup(JSON.stringify(remote))
  const pushed = await push()
  return { action: 'merged', syncedAt: pushed.syncedAt, imported }
}

/**
 * Sincroniza según qué lado cambió desde la última vez.
 * Si ambos cambiaron, fusiona registro a registro y sube el resultado.
 * Al final, sincroniza el contenido de los documentos: cada archivo viaja
 * como binario individual, nunca dentro del snapshot JSON.
 */
export async function syncNow(opts?: { interactive?: boolean }): Promise<SyncResult> {
  // Pre-vuelo: falla rápido (y sin tocar nada local) si la sesión ya no sirve.
  // Único punto que sigue siendo específico de Drive; el resto es agnóstico.
  await getAccessToken(opts)
  await purgeExpiredDocumentBlobs()
  await purgeOldTombstones()

  const result = await syncMetadata()
  await syncDocumentBlobs()
  return result
}

/** Cierra la sesión: revoca credenciales y limpia el estado persistido. */
export function disconnect(): void {
  provider.disconnect?.()
  useSyncStore.getState().disconnect()
}

// ---------- Cifrado extremo a extremo (opt-in) ----------

/**
 * Reescribe los adjuntos que ESTE dispositivo tiene en local, cifrados o en
 * claro según `key`, reemplazando el archivo remoto en su sitio.
 *
 * Los documentos cuyo contenido no está en este dispositivo no se pueden
 * reescribir desde aquí: se quedan como estén hasta que sincronice el
 * dispositivo que sí los tiene.
 */
async function reuploadBlobs(key: CryptoKey | null): Promise<void> {
  const blobs = provider.blobs
  if (!blobs) return

  const docs = await documentsRepo.getAll()
  for (const doc of docs) {
    if (!doc.driveFileId) continue
    const local = await getLocalDocumentBlob(doc.id)
    if (!local) continue
    try {
      const outgoing = key ? await encryptBlob(local, key) : local
      await blobs.put(outgoing, { ref: doc.driveFileId, name: `doc-${doc.id}` })
    } catch (error) {
      console.warn(`No se pudo reescribir el archivo de "${doc.title}":`, error)
    }
  }
}

/** ¿Hay clave de cifrado en este dispositivo? */
export async function isEncryptionEnabled(): Promise<boolean> {
  return (await loadKey()) !== null
}

/**
 * Activa el cifrado: deriva la clave de la frase y vuelve a subir todo cifrado.
 *
 * ⚠️ Si se olvida la frase, el respaldo remoto queda irrecuperable.
 */
export async function enableEncryption(passphrase: string): Promise<void> {
  const kdf = newKdfParams()
  const key = await deriveKey(passphrase, kdf)
  await saveKey(key, kdf)
  await reuploadBlobs(key)
  await push()
  useSyncStore.getState().setEncrypted(true)
}

/**
 * Desbloquea en OTRO dispositivo un respaldo ya cifrado: toma la sal del sobre
 * remoto para derivar la misma clave. La frase se verifica descifrando antes de
 * guardarla, así una frase incorrecta no se queda registrada.
 */
export async function unlockEncryption(passphrase: string): Promise<void> {
  const payload = await provider.pull(BACKUP_KEY)
  if (!payload || !('ciphertext' in payload)) {
    throw new SyncCryptoError('El respaldo remoto no está cifrado.')
  }
  await unlockWithPayload(payload, passphrase)
}

async function unlockWithPayload(
  payload: EncryptedEnvelope,
  passphrase: string,
): Promise<void> {
  if (!payload.kdf) {
    throw new SyncCryptoError('El respaldo cifrado no indica cómo derivar la clave.')
  }
  const key = await deriveKey(passphrase, payload.kdf)
  // Verificar ANTES de guardar: una frase incorrecta no debe quedar registrada.
  await decryptEnvelope(payload, key)
  await saveKey(key, payload.kdf)
  useSyncStore.getState().setEncrypted(true)
}

/**
 * Punto de entrada de la UI. Si el respaldo remoto ya está cifrado, desbloquea
 * este dispositivo con la frase existente; si no, activa el cifrado por primera
 * vez.
 *
 * La distinción evita el error caro: que un segundo dispositivo "active" el
 * cifrado por su cuenta, genere una clave nueva y deje el respaldo ilegible
 * para el primero.
 */
export async function setUpEncryption(passphrase: string): Promise<'unlocked' | 'enabled'> {
  const payload = await provider.pull(BACKUP_KEY)
  if (payload && 'ciphertext' in payload) {
    await unlockWithPayload(payload, passphrase)
    return 'unlocked'
  }
  await enableEncryption(passphrase)
  return 'enabled'
}

/**
 * Desactiva el cifrado y deja el respaldo remoto legible otra vez.
 *
 * Primero baja y descifra lo que falte: soltar la clave con un adjunto cifrado
 * que solo exista en la nube lo volvería irrecuperable.
 */
export async function disableEncryption(): Promise<void> {
  if (!(await loadKey())) return
  await syncDocumentBlobs()
  await reuploadBlobs(null)
  await clearKey()
  await push()
  useSyncStore.getState().setEncrypted(false)
}
