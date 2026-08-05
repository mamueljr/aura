import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/types/transaction';
import { expensesByCategory, monthLabel, totalsByMonth } from './aggregate';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    description: 'movimiento',
    amount: 100,
    category: 'Otro gasto',
    date: '2026-08-01',
    accountId: 'acc-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('expensesByCategory', () => {
  it('suma los gastos del mes por categoría, ordenados de mayor a menor', () => {
    const transactions = [
      tx({ category: 'Comida', amount: 50, date: '2026-08-05' }),
      tx({ category: 'Comida', amount: 30, date: '2026-08-12' }),
      tx({ category: 'Transporte', amount: 200, date: '2026-08-20' }),
    ];

    expect(expensesByCategory(transactions, '2026-08')).toEqual([
      { category: 'Transporte', amount: 200 },
      { category: 'Comida', amount: 80 },
    ]);
  });

  it('ignora ingresos y movimientos de otros meses', () => {
    const transactions = [
      tx({ type: 'income', category: 'Salario', amount: 1000, date: '2026-08-01' }),
      tx({ category: 'Comida', amount: 40, date: '2026-07-31' }),
    ];

    expect(expensesByCategory(transactions, '2026-08')).toEqual([]);
  });
});

describe('totalsByMonth', () => {
  it('agrupa ingresos y gastos por mes, del más reciente al más antiguo', () => {
    const transactions = [
      tx({ type: 'income', amount: 1000, date: '2026-06-01' }),
      tx({ type: 'expense', amount: 200, date: '2026-06-15' }),
      tx({ type: 'income', amount: 1200, date: '2026-07-01' }),
      tx({ type: 'expense', amount: 300, date: '2026-07-20' }),
    ];

    expect(totalsByMonth(transactions)).toEqual([
      { month: '2026-07', income: 1200, expense: 300 },
      { month: '2026-06', income: 1000, expense: 200 },
    ]);
  });

  it('respeta el límite de meses devueltos', () => {
    const transactions = [
      tx({ date: '2026-01-01' }),
      tx({ date: '2026-02-01' }),
      tx({ date: '2026-03-01' }),
    ];

    expect(totalsByMonth(transactions, 2)).toHaveLength(2);
  });
});

describe('monthLabel', () => {
  it('formatea "YYYY-MM" como mes y año en español, con mayúscula inicial', () => {
    expect(monthLabel('2026-08')).toBe('Agosto de 2026');
  });
});
