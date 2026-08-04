import { db } from '@/db/db';
import type { NewTransaction, Transaction } from '@/types/transaction';

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

  remove(id: string): Promise<void> {
    return db.transactions.delete(id);
  },
};
