import { BACKUP_TABLES, db, type BackupTable } from '@/repositories/db'
import { APP_CONFIG } from '@/config/app'
import { dataUrlToBlob } from '@/utils/images'
import type { BaseEntity } from '@/types/entities'

export interface AuraBackup {
  app: string
  appVersion: string
  schemaVersion: number
  exportedAt: string
  data: Record<BackupTable, BaseEntity[]>
}

/** Exporta toda la base local como objeto de respaldo serializable. */
export async function exportBackup(): Promise<AuraBackup> {
  const data = {} as AuraBackup['data']
  await db.transaction('r', BACKUP_TABLES.slice(), async () => {
    for (const table of BACKUP_TABLES) {
      data[table] = (await db.table(table).toArray()) as BaseEntity[]
    }
  })
  return {
    app: 'aura-home',
    appVersion: APP_CONFIG.version,
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/** Descarga el respaldo como archivo JSON. */
export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `aura-home-respaldo-${backup.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isValidBackup(value: unknown): value is AuraBackup {
  if (typeof value !== 'object' || value === null) return false
  const backup = value as Partial<AuraBackup>
  if (
    backup.app !== 'aura-home' ||
    typeof backup.data !== 'object' ||
    backup.data === null
  ) {
    return false
  }
  // Toda tabla presente debe ser un arreglo; ninguna puede traer basura.
  return Object.values(backup.data).every((rows) => Array.isArray(rows))
}

/** Fecha del último cambio de un registro (incluye eliminación). */
function lastChange(row: BaseEntity): string {
  return row.updatedAt ?? row.createdAt ?? ''
}

/**
 * Importa un respaldo fusionándolo registro a registro: para cada id,
 * gana la versión con `updatedAt` más reciente ("última escritura gana").
 * Los tombstones (`deletedAt`) también se fusionan así, de modo que las
 * eliminaciones hechas en otro dispositivo se propagan en vez de que el
 * registro "resucite". Devuelve el número de registros aplicados.
 */
export async function importBackup(json: string): Promise<number> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!isValidBackup(parsed)) {
    throw new Error('El archivo no es un respaldo de Aura Home.')
  }
  if (
    typeof parsed.schemaVersion === 'number' &&
    parsed.schemaVersion > db.verno
  ) {
    throw new Error(
      'El respaldo proviene de una versión más nueva de Aura Home. ' +
        'Actualiza la app en este dispositivo e inténtalo de nuevo.',
    )
  }

  let imported = 0
  await db.transaction('rw', [...BACKUP_TABLES, 'documentBlobs'], async () => {
    for (const table of BACKUP_TABLES) {
      const rows = parsed.data[table]
      if (!Array.isArray(rows)) continue
      const incoming = rows.filter(
        (row): row is BaseEntity =>
          typeof row === 'object' && row !== null && typeof row.id === 'string',
      )
      if (incoming.length === 0) continue
      const local = new Map(
        ((await db.table(table).toArray()) as BaseEntity[]).map((row) => [row.id, row]),
      )
      const winners = incoming.filter((row) => {
        const current = local.get(row.id)
        return !current || lastChange(row) > lastChange(current)
      })
      // Compatibilidad con respaldos manuales anteriores al cambio de
      // documentos a Blob nativo: si traen `fileData` (data-URL), se migra
      // a la tabla local de blobs y se descarta el campo de la fila.
      if (table === 'documents') {
        for (const row of winners as (BaseEntity & { fileData?: string })[]) {
          if (typeof row.fileData !== 'string') continue
          await db.documentBlobs.put({ id: row.id, blob: dataUrlToBlob(row.fileData) })
          delete row.fileData
        }
      }
      await db.table(table).bulkPut(winners)
      imported += winners.length
    }
  })
  return imported
}

/** Días que un tombstone se conserva antes de purgarse definitivamente. */
export const TOMBSTONE_RETENTION_DAYS = 30

/**
 * Elimina definitivamente los registros marcados como borrados hace más de
 * TOMBSTONE_RETENTION_DAYS. Se llama al sincronizar; para entonces todos los
 * dispositivos activos ya recibieron la eliminación.
 */
export async function purgeOldTombstones(): Promise<void> {
  const cutoff = new Date(
    Date.now() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  await db.transaction('rw', BACKUP_TABLES.slice(), async () => {
    for (const table of BACKUP_TABLES) {
      await db
        .table(table)
        .filter((row: BaseEntity) => !!row.deletedAt && row.deletedAt < cutoff)
        .delete()
    }
  })
}
