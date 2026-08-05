import { db } from '@/db/db';
import type { NewTransaction, Transaction } from '@/types/transaction';
import { receiptsRepository } from './receipts.repository';

export const transactionsRepository = {
  getAll(): Promise<Transaction[]> {
    return db.transactions.orderBy('date').reverse().toArray();
  },

  async create(data: NewTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.transactions.add(transaction);
    return transaction;
  },

  update(id: string, data: NewTransaction): Promise<number> {
    return db.transactions.update(id, data);
  },

  /** Borra el movimiento y, si tenía uno, su comprobante — nunca deja el Blob huérfano. */
  async remove(id: string): Promise<void> {
    const transaction = await db.transactions.get(id);
    await db.transactions.delete(id);
    if (transaction?.receiptId) await receiptsRepository.remove(transaction.receiptId);
  },
};
