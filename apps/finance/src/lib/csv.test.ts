import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/types/transaction';

import { transactionsToCsv } from './csv';

/**
 * El CSV es la única salida de Aura Finance hacia fuera. Si el escapado falla,
 * el archivo no da error: se abre con las columnas corridas y los importes en
 * la casilla equivocada. Y las descripciones reales llevan comas — "Súper,
 * farmacia y gasolina" es exactamente lo que la gente escribe.
 */

function tx(extra: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    description: 'Súper',
    amount: 250.5,
    category: 'Comida',
    date: '2026-08-01',
    accountId: 'acc-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...extra,
  };
}

const lineas = (csv: string): string[] => csv.split('\n');

describe('transactionsToCsv', () => {
  it('abre con la cabecera y una línea por movimiento', () => {
    const csv = transactionsToCsv([tx(), tx({ id: 't2' })]);

    expect(lineas(csv)[0]).toBe('fecha,tipo,categoría,descripción,monto');
    expect(lineas(csv)).toHaveLength(3);
  });

  it('traduce el tipo a algo legible', () => {
    expect(transactionsToCsv([tx({ type: 'income' })])).toContain(',ingreso,');
    expect(transactionsToCsv([tx({ type: 'expense' })])).toContain(',gasto,');
  });

  it('escapa las comas en vez de partir la fila', () => {
    const csv = transactionsToCsv([tx({ description: 'Súper, farmacia y gasolina' })]);

    expect(lineas(csv)).toHaveLength(2);
    expect(csv).toContain('"Súper, farmacia y gasolina"');
  });

  it('duplica las comillas, que es como se escapan en CSV', () => {
    const csv = transactionsToCsv([tx({ description: 'Compra "urgente"' })]);

    expect(csv).toContain('"Compra ""urgente"""');
    expect(lineas(csv)).toHaveLength(2);
  });

  it('un salto de línea dentro de una nota no rompe el archivo', () => {
    const csv = transactionsToCsv([tx({ description: 'Primera\nSegunda' })]);

    // Va entrecomillado: el salto queda DENTRO del campo, así que la fila
    // ocupa dos líneas de texto pero sigue siendo un solo registro.
    expect(csv).toContain('"Primera\nSegunda"');
  });

  it('lo que no lleva caracteres raros se deja tal cual', () => {
    const csv = transactionsToCsv([tx({ description: 'Súper' })]);

    expect(lineas(csv)[1]).toBe('2026-08-01,gasto,Comida,Súper,250.5');
  });

  it('sin movimientos exporta solo la cabecera', () => {
    expect(transactionsToCsv([])).toBe('fecha,tipo,categoría,descripción,monto');
  });
});
