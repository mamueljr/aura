import type { Transaction } from '@/types/transaction';

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  const label = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Gastos del mes indicado, agrupados por categoría y ordenados de mayor a menor. */
export function expensesByCategory(transactions: Transaction[], month: string): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(month)) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Ingresos y gastos por mes, del más reciente al más antiguo. */
export function totalsByMonth(transactions: Transaction[], limit = 6): MonthTotal[] {
  const totals = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = totals.get(month) ?? { income: 0, expense: 0 };
    if (t.type === 'income') entry.income += t.amount;
    else entry.expense += t.amount;
    totals.set(month, entry);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([month, { income, expense }]) => ({ month, income, expense }));
}
