import type { Transaction } from '@/types/transaction';

export function balanceOf(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
}
