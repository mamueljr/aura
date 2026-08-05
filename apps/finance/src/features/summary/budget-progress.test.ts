import { describe, expect, it } from 'vitest';
import { budgetProgress } from './budget-progress';

describe('budgetProgress', () => {
  it('calcula el porcentaje gastado del límite', () => {
    expect(budgetProgress(50, 200)).toEqual({ spent: 50, limit: 200, pct: 25, over: false });
  });

  it('satura el porcentaje en 100 aunque el gasto supere el límite', () => {
    const result = budgetProgress(300, 200);
    expect(result.pct).toBe(100);
    expect(result.over).toBe(true);
  });

  it('sin límite (0) no calcula porcentaje', () => {
    expect(budgetProgress(50, 0)).toEqual({ spent: 50, limit: 0, pct: 0, over: true });
  });
});
