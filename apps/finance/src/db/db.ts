import Dexie, { type Table } from 'dexie';
import type { Transaction } from '@/types/transaction';

/**
 * Base de datos local de Aura Finance (IndexedDB vía Dexie).
 *
 * Migraciones: cada cambio de esquema incrementa `.version(n)`.
 * Nunca se modifica una versión ya publicada.
 */
export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;

  constructor() {
    super('aura-finance');
    this.version(1).stores({
      transactions: 'id, type, category, date',
    });
  }
}

export const db = new FinanceDatabase();
