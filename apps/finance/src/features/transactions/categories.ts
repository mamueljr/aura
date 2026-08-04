import type { TransactionType } from '@/types/transaction';

export const CATEGORIES: Record<TransactionType, string[]> = {
  income: ['Salario', 'Freelance', 'Otro ingreso'],
  expense: ['Comida', 'Transporte', 'Vivienda', 'Salud', 'Entretenimiento', 'Otro gasto'],
};
