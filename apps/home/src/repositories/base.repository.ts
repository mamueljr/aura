import type { Table, UpdateSpec } from 'dexie'
import type { BaseEntity, NewEntity } from '@/types/entities'

/**
 * Repositorio genérico con CRUD sobre una tabla Dexie.
 * La UI nunca toca Dexie directamente: siempre pasa por un repositorio,
 * de modo que migrar a un backend remoto solo requiera cambiar esta capa.
 */
export class BaseRepository<T extends BaseEntity> {
  protected readonly table: Table<T, string>

  constructor(table: Table<T, string>) {
    this.table = table
  }

  getAll(): Promise<T[]> {
    return this.table.filter((row) => !row.deletedAt).toArray()
  }

  async getById(id: string): Promise<T | undefined> {
    const row = await this.table.get(id)
    return row && !row.deletedAt ? row : undefined
  }

  async create(data: NewEntity<T>): Promise<T> {
    const now = new Date().toISOString()
    // El cast es seguro: NewEntity<T> + los campos base reconstruyen T.
    const entity = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as unknown as T
    await this.table.add(entity)
    return entity
  }

  async update(
    id: string,
    changes: Partial<NewEntity<T>>,
  ): Promise<T | undefined> {
    await this.table.update(id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    } as UpdateSpec<T>)
    return this.getById(id)
  }

  /**
   * Borrado suave: marca el registro con `deletedAt` (tombstone) para que
   * la eliminación se propague al sincronizar. La purga definitiva la hace
   * `purgeOldTombstones` (backup.service).
   */
  async remove(id: string): Promise<void> {
    const now = new Date().toISOString()
    await this.table.update(id, {
      deletedAt: now,
      updatedAt: now,
    } as unknown as UpdateSpec<T>)
  }

  /** Borrado suave en cascada de los registros cuyo índice coincide. */
  async removeWhere(index: string, value: string): Promise<void> {
    const now = new Date().toISOString()
    await this.table
      .where(index)
      .equals(value)
      .modify({ deletedAt: now, updatedAt: now } as unknown as UpdateSpec<T>)
  }

  count(): Promise<number> {
    return this.table.filter((row) => !row.deletedAt).count()
  }
}
