import { beforeEach, describe, expect, it } from 'vitest'
import { db, tasksRepo } from '@/repositories'

describe('BaseRepository — borrado suave (tombstones)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })

  it('remove() oculta el registro pero lo conserva como tombstone', async () => {
    const task = await tasksRepo.create({ title: 'Lavar el auto', priority: 'media', tags: [] })
    await tasksRepo.remove(task.id)

    expect(await tasksRepo.getAll()).toHaveLength(0)
    expect(await tasksRepo.getById(task.id)).toBeUndefined()
    expect(await tasksRepo.count()).toBe(0)

    const raw = await db.tasks.get(task.id)
    expect(raw).toBeDefined()
    expect(raw?.deletedAt).toBeTruthy()
    expect(raw?.updatedAt).toBe(raw?.deletedAt)
  })

  it('removeWhere() aplica borrado suave en cascada', async () => {
    const parent = await tasksRepo.create({ title: 'Padre', priority: 'media', tags: [] })
    await tasksRepo.create({ title: 'Hija 1', priority: 'media', tags: [], parentId: parent.id })
    await tasksRepo.create({ title: 'Hija 2', priority: 'media', tags: [], parentId: parent.id })
    const other = await tasksRepo.create({ title: 'Ajena', priority: 'media', tags: [] })

    await tasksRepo.removeWhere('parentId', parent.id)
    await tasksRepo.remove(parent.id)

    const visible = await tasksRepo.getAll()
    expect(visible.map((t) => t.id)).toEqual([other.id])
    expect(await db.tasks.count()).toBe(4)
  })
})
