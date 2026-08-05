export interface BudgetProgress {
  spent: number;
  limit: number;
  /** 0–100, saturado en 100 aunque el gasto supere el límite (para el ancho de la barra). */
  pct: number;
  over: boolean;
}

export function budgetProgress(spent: number, limit: number): BudgetProgress {
  return {
    spent,
    limit,
    pct: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0,
    over: spent > limit,
  };
}
