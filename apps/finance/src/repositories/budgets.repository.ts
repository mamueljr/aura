import { db } from '@/db/db';
import type { Budget } from '@/types/budget';

export const budgetsRepository = {
  async getAll(): Promise<Budget[]> {
    const rows = await db.budgets.toArray();
    return rows.filter((b) => !b.deletedAt);
  },

  /**
   * Guarda el límite; si es 0 o menor, lo marca como borrado (tombstone) en
   * vez de eliminar la fila — así la quita se propaga al sincronizar.
   */
  async set(category: string, monthlyLimit: number): Promise<void> {
    const now = new Date().toISOString();
    if (monthlyLimit > 0) {
      await db.budgets.put({ category, monthlyLimit, updatedAt: now });
    } else {
      await db.budgets.put({ category, monthlyLimit: 0, updatedAt: now, deletedAt: now });
    }
  },
};
