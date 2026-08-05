import Dexie, { type Table } from 'dexie';
import type { Budget } from '@/types/budget';
import type { Transaction } from '@/types/transaction';

/**
 * Base de datos local de Aura Finance (IndexedDB vía Dexie).
 *
 * Migraciones: cada cambio de esquema incrementa `.version(n)`.
 * Nunca se modifica una versión ya publicada.
 */
export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;

  constructor() {
    super('aura-finance');
    this.version(1).stores({
      transactions: 'id, type, category, date',
    });
    // v2: presupuesto mensual por categoría de gasto.
    this.version(2).stores({
      budgets: 'category',
    });
  }
}

export const db = new FinanceDatabase();
