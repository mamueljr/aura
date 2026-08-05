import { db } from '@/db/db';
import type { Account, NewAccount } from '@/types/account';

export const accountsRepository = {
  async getAll(): Promise<Account[]> {
    const rows = await db.accounts.toArray();
    return rows.filter((a) => !a.deletedAt);
  },

  async create(data: NewAccount): Promise<Account> {
    const now = new Date().toISOString();
    const account: Account = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.accounts.add(account);
    return account;
  },

  update(id: string, data: NewAccount): Promise<number> {
    return db.accounts.update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  /** No se puede borrar la última cuenta ni una con movimientos — evita dejar huérfanos. */
  async remove(id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const accounts = await accountsRepository.getAll();
    if (accounts.length <= 1) return { ok: false, reason: 'Debe quedar al menos una cuenta.' };

    const inUse = await db.transactions
      .where('accountId')
      .equals(id)
      .filter((t) => !t.deletedAt)
      .count();
    if (inUse > 0) {
      return { ok: false, reason: 'Esta cuenta tiene movimientos. Muévelos antes de borrarla.' };
    }

    const now = new Date().toISOString();
    await db.accounts.update(id, { deletedAt: now, updatedAt: now });
    return { ok: true };
  },
};
