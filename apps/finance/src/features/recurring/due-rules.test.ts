import { describe, expect, it } from 'vitest';
import type { RecurringRule } from '@/types/recurring';
import { dueRules, localMonth } from './due-rules';

function rule(overrides: Partial<RecurringRule>): RecurringRule {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    description: 'Renta',
    amount: 1000,
    category: 'Vivienda',
    accountId: 'acc-1',
    dayOfMonth: 1,
    active: true,
    lastRunMonth: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('dueRules', () => {
  it('incluye una regla activa cuyo día ya llegó y no se ha corrido este mes', () => {
    const today = new Date(2026, 7, 5); // 5 de agosto
    expect(dueRules([rule({ dayOfMonth: 1 })], today)).toHaveLength(1);
  });

  it('excluye una regla cuyo día todavía no llega', () => {
    const today = new Date(2026, 7, 5);
    expect(dueRules([rule({ dayOfMonth: 10 })], today)).toEqual([]);
  });

  it('excluye una regla ya corrida este mes', () => {
    const today = new Date(2026, 7, 5);
    expect(dueRules([rule({ dayOfMonth: 1, lastRunMonth: '2026-08' })], today)).toEqual([]);
  });

  it('excluye una regla inactiva', () => {
    const today = new Date(2026, 7, 5);
    expect(dueRules([rule({ dayOfMonth: 1, active: false })], today)).toEqual([]);
  });

  it('vuelve a incluirla al pasar de mes aunque ya se hubiera corrido el anterior', () => {
    const today = new Date(2026, 8, 2); // 2 de septiembre
    expect(dueRules([rule({ dayOfMonth: 1, lastRunMonth: '2026-08' })], today)).toHaveLength(1);
  });

  it('la última tarde del mes todavía es este mes, no el siguiente', () => {
    // Con `toISOString()` el mes se calculaba en UTC mientras el día se
    // calculaba en local: en México, a partir de las 18:00 del día 31 la regla
    // de julio ya se creía de agosto y adelantaba la generación.
    const today = new Date(2026, 6, 31, 19, 0); // 31 de julio, 19:00 local

    expect(localMonth(today)).toBe('2026-07');
    expect(dueRules([rule({ dayOfMonth: 1, lastRunMonth: '2026-07' })], today)).toEqual([]);
  });

  it('la primera madrugada del mes ya es el mes nuevo', () => {
    // El mismo desfase al revés, para husos horarios positivos.
    const today = new Date(2026, 7, 1, 0, 30); // 1 de agosto, 00:30 local

    expect(localMonth(today)).toBe('2026-08');
    expect(dueRules([rule({ dayOfMonth: 1, lastRunMonth: '2026-07' })], today)).toHaveLength(1);
  });
});
