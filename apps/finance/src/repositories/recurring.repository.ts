import { db } from '@/db/db';
import type { NewRecurringRule, RecurringRule } from '@/types/recurring';
import { dueRules } from '@/features/recurring/due-rules';
import { transactionsRepository } from './transactions.repository';

export const recurringRepository = {
  getAll(): Promise<RecurringRule[]> {
    return db.recurringRules.toArray();
  },

  async create(data: NewRecurringRule): Promise<RecurringRule> {
    const rule: RecurringRule = {
      ...data,
      id: crypto.randomUUID(),
      lastRunMonth: null,
      createdAt: new Date().toISOString(),
    };
    await db.recurringRules.add(rule);
    return rule;
  },

  update(id: string, data: Partial<NewRecurringRule>): Promise<number> {
    return db.recurringRules.update(id, data);
  },

  remove(id: string): Promise<void> {
    return db.recurringRules.delete(id);
  },

  /** Genera el movimiento del mes para cada regla vencida y marca el mes como corrido. */
  async runDue(today = new Date()): Promise<number> {
    const rules = await db.recurringRules.toArray();
    const due = dueRules(rules, today);
    const month = today.toISOString().slice(0, 7);

    for (const rule of due) {
      await transactionsRepository.create({
        type: rule.type,
        description: rule.description,
        amount: rule.amount,
        category: rule.category,
        accountId: rule.accountId,
        date: `${month}-${String(rule.dayOfMonth).padStart(2, '0')}`,
      });
      await db.recurringRules.update(rule.id, { lastRunMonth: month });
    }

    return due.length;
  },
};
