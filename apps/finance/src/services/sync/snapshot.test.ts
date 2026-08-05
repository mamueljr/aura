import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import type { Transaction } from '@/types/transaction';
import type { Account } from '@/types/account';
import type { Budget } from '@/types/budget';
import { exportSnapshot, mergeSnapshot, purgeOldTombstones, type SyncSnapshot } from './snapshot';

/**
 * La fusión es lo único que puede estropear datos del usuario (movimientos,
 * cuentas, presupuestos, recurrentes), así que cada regla documentada tiene
 * su caso: última-escritura-gana, y los tombstones se propagan en vez de
 * resucitar el registro.
 */

function tx(id: string, updatedAt: string, extra: Partial<Transaction> = {}): Transaction {
  return {
    id,
    type: 'expense',
    description: id,
    amount: 100,
    category: 'Otro gasto',
    date: '2026-08-01',
    accountId: 'acc-1',
    createdAt: updatedAt,
    updatedAt,
    ...extra,
  };
}

function account(id: string, updatedAt: string, extra: Partial<Account> = {}): Account {
  return {
    id,
    name: id,
    color: '#10b981',
    createdAt: updatedAt,
    updatedAt,
    ...extra,
  };
}

function budget(category: string, updatedAt: string, extra: Partial<Budget> = {}): Budget {
  return { category, monthlyLimit: 500, updatedAt, ...extra };
}

function emptySnapshot(): SyncSnapshot {
  return { transactions: [], accounts: [], budgets: [], recurringRules: [] };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('exportSnapshot', () => {
  it('recoge las 4 colecciones, tombstones incluidos', async () => {
    await db.transactions.put(tx('t1', '2026-08-01T00:00:00.000Z'));
    await db.transactions.put(tx('t2', '2026-08-02T00:00:00.000Z', { deletedAt: '2026-08-02T00:00:00.000Z' }));
    await db.accounts.put(account('a1', '2026-08-01T00:00:00.000Z'));

    const snapshot = await exportSnapshot();
    expect(snapshot.transactions).toHaveLength(2);
    expect(snapshot.accounts).toHaveLength(1);
  });
});

describe('mergeSnapshot', () => {
  it('el remoto gana si es más reciente que el local', async () => {
    await db.transactions.put(tx('t1', '2026-08-01T00:00:00.000Z', { description: 'vieja' }));

    const counts = await mergeSnapshot({
      ...emptySnapshot(),
      transactions: [tx('t1', '2026-08-05T00:00:00.000Z', { description: 'nueva' })],
    });

    expect(counts.transactions).toBe(1);
    expect((await db.transactions.get('t1'))?.description).toBe('nueva');
  });

  it('el local gana si es más reciente que el remoto (no se sobrescribe)', async () => {
    await db.transactions.put(tx('t1', '2026-08-05T00:00:00.000Z', { description: 'nueva' }));

    const counts = await mergeSnapshot({
      ...emptySnapshot(),
      transactions: [tx('t1', '2026-08-01T00:00:00.000Z', { description: 'vieja' })],
    });

    expect(counts.transactions).toBe(0);
    expect((await db.transactions.get('t1'))?.description).toBe('nueva');
  });

  it('un tombstone remoto se propaga en vez de resucitar el registro', async () => {
    await db.transactions.put(tx('t1', '2026-08-01T00:00:00.000Z'));

    await mergeSnapshot({
      ...emptySnapshot(),
      transactions: [
        tx('t1', '2026-08-05T00:00:00.000Z', { deletedAt: '2026-08-05T00:00:00.000Z' }),
      ],
    });

    expect((await db.transactions.get('t1'))?.deletedAt).toBe('2026-08-05T00:00:00.000Z');
  });

  it('agrega un registro que no existía localmente', async () => {
    const counts = await mergeSnapshot({
      ...emptySnapshot(),
      accounts: [account('a1', '2026-08-01T00:00:00.000Z')],
    });

    expect(counts.accounts).toBe(1);
    expect(await db.accounts.get('a1')).toBeDefined();
  });

  it('budgets se fusiona por categoría, no por id', async () => {
    await db.budgets.put(budget('Comida', '2026-08-01T00:00:00.000Z', { monthlyLimit: 300 }));

    await mergeSnapshot({
      ...emptySnapshot(),
      budgets: [budget('Comida', '2026-08-05T00:00:00.000Z', { monthlyLimit: 500 })],
    });

    expect((await db.budgets.get('Comida'))?.monthlyLimit).toBe(500);
  });
});

describe('purgeOldTombstones', () => {
  it('borra definitivamente un tombstone de más de 30 días', async () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await db.transactions.put(tx('t1', old, { deletedAt: old }));

    await purgeOldTombstones();

    expect(await db.transactions.get('t1')).toBeUndefined();
  });

  it('conserva un tombstone reciente', async () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await db.transactions.put(tx('t1', recent, { deletedAt: recent }));

    await purgeOldTombstones();

    expect(await db.transactions.get('t1')).toBeDefined();
  });

  it('conserva un registro sin borrar, sin importar su antigüedad', async () => {
    const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    await db.transactions.put(tx('t1', old));

    await purgeOldTombstones();

    expect(await db.transactions.get('t1')).toBeDefined();
  });
});
