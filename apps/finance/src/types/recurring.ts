import type { TransactionType } from './transaction';

export interface RecurringRule {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  accountId: string;
  /** Día del mes en que se genera el movimiento (1–28, evita líos con meses cortos). */
  dayOfMonth: number;
  active: boolean;
  /** "YYYY-MM" del último mes en que ya se generó el movimiento — evita duplicarlo. */
  lastRunMonth: string | null;
  createdAt: string;
}

export type NewRecurringRule = Omit<RecurringRule, 'id' | 'lastRunMonth' | 'createdAt'>;
