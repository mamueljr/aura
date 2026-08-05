import { db } from '@/db/db';
import type { NewTransaction, Transaction } from '@/types/transaction';
import { receiptsRepository } from './receipts.repository';

export const transactionsRepository = {
  async getAll(): Promise<Transaction[]> {
    const rows = await db.transactions.orderBy('date').reverse().toArray();
    return rows.filter((t) => !t.deletedAt);
  },

  async create(data: NewTransaction): Promise<Transaction> {
    const now = new Date().toISOString();
    const transaction: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.transactions.add(transaction);
    return transaction;
  },

  update(id: string, data: NewTransaction): Promise<number> {
    return db.transactions.update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  /**
   * Borrado suave (tombstone): se propaga a otros dispositivos al sincronizar
   * en vez de resucitar. Si tenía comprobante, ese sí se borra ya — los
   * comprobantes todavía no viajan por Aura Sync (ver ESTADO-MIGRACION §10).
   */
  async remove(id: string): Promise<void> {
    const transaction = await db.transactions.get(id);
    const now = new Date().toISOString();
    await db.transactions.update(id, { deletedAt: now, updatedAt: now });
    if (transaction?.receiptId) await receiptsRepository.remove(transaction.receiptId);
  },
};
