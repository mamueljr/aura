import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/db';

import { receiptsRepository } from './receipts.repository';
import { transactionsRepository } from './transactions.repository';

/**
 * Borrar un movimiento no lo borra: lo marca. De eso depende que la
 * eliminación llegue al otro dispositivo en vez de resucitar en la siguiente
 * fusión — y también que la foto del comprobante no se quede colgada.
 */

const nuevo = (extra: Record<string, unknown> = {}) => ({
  type: 'expense' as const,
  description: 'Súper',
  amount: 250,
  category: 'Comida',
  date: '2026-08-01',
  accountId: 'acc-1',
  ...extra,
});

beforeEach(async () => {
  await Promise.all([db.transactions, db.receipts].map((t) => t.clear()));
});

describe('remove', () => {
  it('marca en vez de borrar, para que el borrado viaje', async () => {
    const tx = await transactionsRepository.create(nuevo());

    await transactionsRepository.remove(tx.id);

    // La fila sigue en la base…
    const fila = await db.transactions.get(tx.id);
    expect(fila).toBeDefined();
    expect(fila!.deletedAt).toBeTruthy();
    // …pero la app ya no la ve.
    expect(await transactionsRepository.getAll()).toEqual([]);
  });

  it('mueve `updatedAt` al borrar, o la lápida perdería la fusión', async () => {
    const tx = await transactionsRepository.create(nuevo());

    await transactionsRepository.remove(tx.id);

    const fila = await db.transactions.get(tx.id);
    expect(fila!.updatedAt >= tx.updatedAt).toBe(true);
    expect(fila!.updatedAt).toBe(fila!.deletedAt);
  });

  it('se lleva por delante el comprobante local', async () => {
    const receiptId = await receiptsRepository.save(new Blob(['foto'], { type: 'image/jpeg' }));
    const tx = await transactionsRepository.create(nuevo({ receiptId }));

    await transactionsRepository.remove(tx.id);

    expect(await receiptsRepository.get(receiptId)).toBeUndefined();
  });

  it('un movimiento sin comprobante se borra sin quejarse', async () => {
    const tx = await transactionsRepository.create(nuevo());

    await expect(transactionsRepository.remove(tx.id)).resolves.toBeUndefined();
  });
});

describe('getAll', () => {
  it('ordena de la más reciente a la más antigua', async () => {
    await transactionsRepository.create(nuevo({ date: '2026-07-01', description: 'Vieja' }));
    await transactionsRepository.create(nuevo({ date: '2026-08-15', description: 'Nueva' }));
    await transactionsRepository.create(nuevo({ date: '2026-08-01', description: 'Media' }));

    expect((await transactionsRepository.getAll()).map((t) => t.description)).toEqual([
      'Nueva',
      'Media',
      'Vieja',
    ]);
  });

  it('deja fuera las lápidas', async () => {
    const tx = await transactionsRepository.create(nuevo());
    await transactionsRepository.create(nuevo({ description: 'Viva' }));

    await transactionsRepository.remove(tx.id);

    expect((await transactionsRepository.getAll()).map((t) => t.description)).toEqual(['Viva']);
  });
});
