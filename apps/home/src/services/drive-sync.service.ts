import type { SyncResult as CoreSyncResult, SyncProvider } from '@aura/core/sync'
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

  const docs = await documentsRepo.getAll()
  for (const doc of docs) {
    const local = await getLocalDocumentBlob(doc.id)
    if (local) {
      if (!doc.driveFileId) {
        try {
          const ref = await blobs.put(local, { name: `doc-${doc.id}` })
          await documentsRepo.update(doc.id, { driveFileId: ref })
        } catch (error) {
          console.warn(`No se pudo subir el archivo de "${doc.title}":`, error)
        }
      }
      continue
    }
    if (doc.driveFileId) {
      try {
        const blob = await blobs.get(doc.driveFileId)
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
  await provider.push(BACKUP_KEY, backup)
  useSyncStore.getState().setLastSync(backup.exportedAt)
  return { action: 'pushed', syncedAt: backup.exportedAt }
}

/** Inicia sesión con el proveedor (popup) y devuelve la cuenta conectada. */
export async function connect(): Promise<string> {
  const account = (await provider.connect?.()) ?? 'cuenta conectada'
  useSyncStore.getState().setConnected(account)
  return account
}

async function syncMetadata(): Promise<SyncResult> {
  const { lastSyncAt } = useSyncStore.getState()

  const remote = await provider.pull(BACKUP_KEY)
  if (!remote) return push()
  if ('ciphertext' in remote) {
    // Reservado para el cifrado opt-in: nada escribe sobres cifrados todavía.
    throw new Error('El respaldo remoto está cifrado y esta versión no puede leerlo.')
  }

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
