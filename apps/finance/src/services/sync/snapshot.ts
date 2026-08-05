import { db } from '@/db/db';
import type { Account } from '@/types/account';
import type { Budget } from '@/types/budget';
import type { RecurringRule } from '@/types/recurring';
import type { Transaction } from '@/types/transaction';

/**
 * Snapshot portable de los datos de Finance — el `data` de un
 * `AuraSyncEnvelope`. Incluye tombstones (`deletedAt`) a propósito: sin
 * ellos, borrar en un dispositivo no se propagaría al fusionar.
 *
 * Los bytes de los comprobantes (`receipts`) NO viajan aquí: van por el canal
 * de binarios (`receipts.ts`) y en el snapshot solo queda su referencia, dentro
 * de la propia transacción (`receiptDriveFileId`).
 */
export interface SyncSnapshot {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  recurringRules: RecurringRule[];
}

export async function exportSnapshot(): Promise<SyncSnapshot> {
  const [transactions, accounts, budgets, recurringRules] = await Promise.all([
    db.transactions.toArray(),
    db.accounts.toArray(),
    db.budgets.toArray(),
    db.recurringRules.toArray(),
  ]);
  return { transactions, accounts, budgets, recurringRules };
}

/** Última-escritura-gana por `id`: cada fila entrante sobrevive si es más reciente que la local. */
function mergeById<T extends { id: string; updatedAt: string }>(local: T[], incoming: T[]): T[] {
  const localMap = new Map(local.map((row) => [row.id, row]));
  return incoming.filter((row) => {
    const current = localMap.get(row.id);
    return !current || row.updatedAt > current.updatedAt;
  });
}

/** Igual que `mergeById`, pero para `budgets`, que no tiene `id` — la clave es `category`. */
function mergeByCategory(local: Budget[], incoming: Budget[]): Budget[] {
  const localMap = new Map(local.map((row) => [row.category, row]));
  return incoming.filter((row) => {
    const current = localMap.get(row.category);
    return !current || row.updatedAt > current.updatedAt;
  });
}

export interface MergeCounts {
  transactions: number;
  accounts: number;
  budgets: number;
  recurringRules: number;
}

export function totalMerged(counts: MergeCounts): number {
  return counts.transactions + counts.accounts + counts.budgets + counts.recurringRules;
}

/** Fusiona el snapshot remoto sobre lo local (registro a registro) y aplica los ganadores. */
export async function mergeSnapshot(remote: SyncSnapshot): Promise<MergeCounts> {
  const local = await exportSnapshot();

  const winners = {
    transactions: mergeById(local.transactions, remote.transactions ?? []),
    accounts: mergeById(local.accounts, remote.accounts ?? []),
    budgets: mergeByCategory(local.budgets, remote.budgets ?? []),
    recurringRules: mergeById(local.recurringRules, remote.recurringRules ?? []),
  };

  await db.transaction(
    'rw',
    [db.transactions, db.accounts, db.budgets, db.recurringRules],
    async () => {
      if (winners.transactions.length) await db.transactions.bulkPut(winners.transactions);
      if (winners.accounts.length) await db.accounts.bulkPut(winners.accounts);
      if (winners.budgets.length) await db.budgets.bulkPut(winners.budgets);
      if (winners.recurringRules.length) await db.recurringRules.bulkPut(winners.recurringRules);
    },
  );

  return {
    transactions: winners.transactions.length,
    accounts: winners.accounts.length,
    budgets: winners.budgets.length,
    recurringRules: winners.recurringRules.length,
  };
}

/** Días que un tombstone se conserva antes de purgarse definitivamente. */
export const TOMBSTONE_RETENTION_DAYS = 30;

/**
 * Elimina definitivamente los tombstones más viejos que TOMBSTONE_RETENTION_DAYS.
 * Se llama al sincronizar; para entonces todos los dispositivos activos ya
 * recibieron la eliminación.
 */
export async function purgeOldTombstones(): Promise<void> {
  const cutoff = new Date(Date.now() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.transaction(
    'rw',
    [db.transactions, db.accounts, db.budgets, db.recurringRules],
    async () => {
      await db.transactions.filter((r) => !!r.deletedAt && r.deletedAt < cutoff).delete();
      await db.accounts.filter((r) => !!r.deletedAt && r.deletedAt < cutoff).delete();
      await db.budgets.filter((r) => !!r.deletedAt && r.deletedAt < cutoff).delete();
      await db.recurringRules.filter((r) => !!r.deletedAt && r.deletedAt < cutoff).delete();
    },
  );
}
