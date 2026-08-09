import { db } from '@/db/db';
import type { NewRecurringRule, RecurringRule } from '@/types/recurring';
import { dueRules, localMonth } from '@/features/recurring/due-rules';
import { transactionsRepository } from './transactions.repository';

export const recurringRepository = {
  async getAll(): Promise<RecurringRule[]> {
    const rows = await db.recurringRules.toArray();
    return rows.filter((r) => !r.deletedAt);
  },

  async create(data: NewRecurringRule): Promise<RecurringRule> {
    const now = new Date().toISOString();
    const rule: RecurringRule = {
      ...data,
      id: crypto.randomUUID(),
      lastRunMonth: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.recurringRules.add(rule);
    return rule;
  },

  update(id: string, data: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>): Promise<number> {
    return db.recurringRules.update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  remove(id: string): Promise<void> {
    const now = new Date().toISOString();
    return db.recurringRules.update(id, { deletedAt: now, updatedAt: now }).then(() => undefined);
  },

  /** Genera el movimiento del mes para cada regla vencida y marca el mes como corrido. */
  async runDue(today = new Date()): Promise<number> {
    const month = localMonth(today);

    // Todo en una sola transacción: crear el movimiento y marcar `lastRunMonth`
    // es atómico. Sin ella, un fallo entre los dos pasos (o un cierre de
    // pestaña) dejaba el mes sin marcar y el movimiento ya creado → se
    // duplicaba al reabrir. Además Dexie serializa las transacciones sobre las
    // mismas tablas: una segunda invocación concurrente (p. ej. StrictMode en
    // dev) lee el `lastRunMonth` ya marcado y no vuelve a generar.
    return db.transaction('rw', [db.recurringRules, db.transactions], async () => {
      const due = dueRules(await recurringRepository.getAll(), today);

      for (const rule of due) {
        await transactionsRepository.create({
          type: rule.type,
          description: rule.description,
          amount: rule.amount,
          category: rule.category,
          accountId: rule.accountId,
          date: `${month}-${String(rule.dayOfMonth).padStart(2, '0')}`,
        });
        await recurringRepository.update(rule.id, { lastRunMonth: month });
      }

      return due.length;
    });
  },
};
