import { beforeEach, describe, expect, it } from 'vitest'
import { db, tasksRepo } from '@/repositories'
import {
  exportBackup,
  importBackup,
  purgeOldTombstones,
  TOMBSTONE_RETENTION_DAYS,
  type AuraBackup,
} from '@/services/backup.service'
import type { TaskItem } from '@/types/entities'

function makeBackup(tasks: Partial<TaskItem>[]): string {
  const backup = {
    app: 'aura-home',
    appVersion: '1.0.0',
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    data: { tasks },
  } as unknown as AuraBackup
  return JSON.stringify(backup)
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('importBackup — validación', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('rechaza JSON inválido', async () => {
    await expect(importBackup('esto no es json')).rejects.toThrow('JSON válido')
  })

  it('rechaza archivos que no son respaldos de Aura Home', async () => {
    await expect(importBackup(JSON.stringify({ app: 'otra-app', data: {} }))).rejects.toThrow(
      'respaldo de Aura Home',
    )
  })

  it('rechaza tablas que no son arreglos', async () => {
    await expect(
      importBackup(JSON.stringify({ app: 'aura-home', data: { tasks: 'basura' } })),
    ).rejects.toThrow('respaldo de Aura Home')
  })

  it('rechaza respaldos de un esquema más nuevo', async () => {
    const backup = JSON.parse(makeBackup([])) as AuraBackup
    backup.schemaVersion = db.verno + 1
    await expect(importBackup(JSON.stringify(backup))).rejects.toThrow('versión más nueva')
  })

  it('ignora filas sin id', async () => {
    const imported = await importBackup(makeBackup([{ title: 'sin id' } as Partial<TaskItem>]))
    expect(imported).toBe(0)
  })
})

describe('importBackup — fusión última-escritura-gana', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('inserta registros nuevos', async () => {
    const imported = await importBackup(
      makeBackup([
        {
          id: 'r1',
          title: 'Remota',
          priority: 'media',
          tags: [],
          createdAt: isoDaysAgo(1),
          updatedAt: isoDaysAgo(1),
        },
      ]),
    )
    expect(imported).toBe(1)
    expect((await tasksRepo.getById('r1'))?.title).toBe('Remota')
  })

  it('el registro con updatedAt más reciente gana; el más viejo no sobrescribe', async () => {
    const local = await tasksRepo.create({ title: 'Local', priority: 'media', tags: [] })

    const stale = await importBackup(
      makeBackup([{ ...local, title: 'Vieja', updatedAt: isoDaysAgo(2) }]),
    )
    expect(stale).toBe(0)
    expect((await tasksRepo.getById(local.id))?.title).toBe('Local')

    const fresh = await importBackup(
      makeBackup([
        { ...local, title: 'Nueva', updatedAt: new Date(Date.now() + 1000).toISOString() },
      ]),
    )
    expect(fresh).toBe(1)
    expect((await tasksRepo.getById(local.id))?.title).toBe('Nueva')
  })

  it('propaga eliminaciones: un tombstone remoto más reciente borra el registro local', async () => {
    const local = await tasksRepo.create({ title: 'Borrada en la otra PC', priority: 'media', tags: [] })
    const deletedAt = new Date(Date.now() + 1000).toISOString()

    await importBackup(makeBackup([{ ...local, updatedAt: deletedAt, deletedAt }]))

    expect(await tasksRepo.getById(local.id)).toBeUndefined()
    expect((await db.tasks.get(local.id))?.deletedAt).toBe(deletedAt)
  })

  it('no resucita: un respaldo viejo sin tombstone no revive un registro borrado aquí', async () => {
    const local = await tasksRepo.create({ title: 'Se borra aquí', priority: 'media', tags: [] })
    const snapshot = await exportBackup()
    await new Promise((resolve) => setTimeout(resolve, 5))
    await tasksRepo.remove(local.id)

    const imported = await importBackup(JSON.stringify(snapshot))
    expect(imported).toBe(0)
    expect(await tasksRepo.getById(local.id)).toBeUndefined()
  })

  it('una edición posterior al borrado remoto gana sobre el tombstone', async () => {
    const local = await tasksRepo.create({ title: 'Editada aquí', priority: 'media', tags: [] })
    await importBackup(
      makeBackup([{ ...local, updatedAt: isoDaysAgo(1), deletedAt: isoDaysAgo(1) }]),
    )
    expect((await tasksRepo.getById(local.id))?.title).toBe('Editada aquí')
  })
})

describe('importBackup — compatibilidad con documentos en formato antiguo', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('migra fileData (data-URL) de un respaldo viejo a documentBlobs y no lo persiste en la fila', async () => {
    const dataUrl = `data:text/plain;base64,${btoa('contenido viejo')}`
    const backup = {
      app: 'aura-home',
      appVersion: '0.13.0',
      schemaVersion: db.verno,
      exportedAt: new Date().toISOString(),
      data: {
        documents: [
          {
            id: 'd1',
            title: 'Garantía vieja',
            category: 'garantia',
            fileName: 'garantia.txt',
            fileType: 'text/plain',
            fileSize: 16,
            fileData: dataUrl,
            createdAt: isoDaysAgo(1),
            updatedAt: isoDaysAgo(1),
          },
        ],
      },
    } as unknown as AuraBackup

    const imported = await importBackup(JSON.stringify(backup))
    expect(imported).toBe(1)

    const stored = await db.documents.get('d1')
    expect(stored).toBeDefined()
    expect((stored as unknown as { fileData?: string }).fileData).toBeUndefined()

    const blob = await db.documentBlobs.get('d1')
    expect(blob).toBeDefined()
    expect(await blob?.blob.text()).toBe('contenido viejo')
  })
})

describe('purgeOldTombstones', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('elimina tombstones viejos y conserva los recientes y los registros vivos', async () => {
    const oldStamp = isoDaysAgo(TOMBSTONE_RETENTION_DAYS + 1)
    const recentStamp = isoDaysAgo(1)
    await db.tasks.bulkAdd([
      {
        id: 'viejo',
        title: 'Purgable',
        priority: 'media',
        tags: [],
        createdAt: oldStamp,
        updatedAt: oldStamp,
        deletedAt: oldStamp,
      },
      {
        id: 'reciente',
        title: 'Aún no',
        priority: 'media',
        tags: [],
        createdAt: recentStamp,
        updatedAt: recentStamp,
        deletedAt: recentStamp,
      },
      {
        id: 'vivo',
        title: 'Vivo',
        priority: 'media',
        tags: [],
        createdAt: oldStamp,
        updatedAt: oldStamp,
      },
    ] as TaskItem[])

    await purgeOldTombstones()

    expect(await db.tasks.get('viejo')).toBeUndefined()
    expect((await db.tasks.get('reciente'))?.deletedAt).toBe(recentStamp)
    expect((await db.tasks.get('vivo'))?.title).toBe('Vivo')
  })
})
