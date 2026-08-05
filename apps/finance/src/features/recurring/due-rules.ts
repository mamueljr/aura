import type { RecurringRule } from '@/types/recurring';

/**
 * Reglas activas que ya deben generar su movimiento del mes de `today`:
 * no se generó todavía este mes y el día de corte ya llegó o pasó.
 */
export function dueRules(rules: RecurringRule[], today: Date): RecurringRule[] {
  const month = today.toISOString().slice(0, 7);
  const day = today.getDate();
  return rules.filter((r) => r.active && r.lastRunMonth !== month && day >= r.dayOfMonth);
}
