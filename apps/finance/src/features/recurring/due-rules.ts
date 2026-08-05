import type { RecurringRule } from '@/types/recurring';

/**
 * "YYYY-MM" del mes **local**.
 *
 * `toISOString()` da el mes en UTC, y eso no cuadra con `getDate()`, que es
 * local: en México (UTC-6), a partir de las 18:00 del último día del mes el
 * código ya creía estar en el siguiente y adelantaba la generación. Mezclar
 * las dos zonas en la misma decisión es la trampa; aquí todo es local.
 */
export function localMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Reglas activas que ya deben generar su movimiento del mes de `today`:
 * no se generó todavía este mes y el día de corte ya llegó o pasó.
 */
export function dueRules(rules: RecurringRule[], today: Date): RecurringRule[] {
  const month = localMonth(today);
  const day = today.getDate();
  return rules.filter((r) => r.active && r.lastRunMonth !== month && day >= r.dayOfMonth);
}
