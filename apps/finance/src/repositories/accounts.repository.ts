import { db } from '@/db/db';
import type { Account, NewAccount } from '@/types/account';

export const accountsRepository = {
  getAll(): Promise<Account[]> {
    return db.accounts.toArray();
  },

  async create(data: NewAccount): Promise<Account> {
    const account: Account = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.accounts.add(account);
    return account;
  },

  update(id: string, data: NewAccount): Promise<number> {
    return db.accounts.update(id, data);
  },

  /** No se puede borrar la última cuenta ni una con movimientos — evita dejar huérfanos. */
  async remove(id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const total = await db.accounts.count();
    if (total <= 1) return { ok: false, reason: 'Debe quedar al menos una cuenta.' };

    const inUse = await db.transactions.where('accountId').equals(id).count();
    if (inUse > 0) {
      return { ok: false, reason: 'Esta cuenta tiene movimientos. Muévelos antes de borrarla.' };
    }

    await db.accounts.delete(id);
    return { ok: true };
  },
};
