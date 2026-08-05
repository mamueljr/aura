import { db } from '@/db/db';
import type { Budget } from '@/types/budget';

export const budgetsRepository = {
  getAll(): Promise<Budget[]> {
    return db.budgets.toArray();
  },

  /** Guarda el límite; si es 0 o menor, borra el presupuesto de la categoría. */
  async set(category: string, monthlyLimit: number): Promise<void> {
    if (monthlyLimit > 0) {
      await db.budgets.put({ category, monthlyLimit });
    } else {
      await db.budgets.delete(category);
    }
  },
};
