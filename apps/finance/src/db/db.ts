import Dexie, { type Table } from 'dexie';
import type { Account } from '@/types/account';
import type { Budget } from '@/types/budget';
import type { RecurringRule } from '@/types/recurring';
import type { Receipt } from '@/types/receipt';
import type { Transaction } from '@/types/transaction';

const DEFAULT_ACCOUNT_NAME = 'General';

/**
 * Base de datos local de Aura Finance (IndexedDB vía Dexie).
 *
 * Migraciones: cada cambio de esquema incrementa `.version(n)`.
 * Nunca se modifica una versión ya publicada.
 */
export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  accounts!: Table<Account, string>;
  recurringRules!: Table<RecurringRule, string>;
  receipts!: Table<Receipt, string>;

  constructor() {
    super('aura-finance');
    this.version(1).stores({
      transactions: 'id, type, category, date',
    });
    // v2: presupuesto mensual por categoría de gasto.
    this.version(2).stores({
      budgets: 'category',
    });
    // v3: cuentas múltiples. Los movimientos existentes se asignan a una
    // cuenta "General" creada en la propia migración — nunca queda un
    // movimiento sin cuenta.
    this.version(3)
      .stores({
        accounts: 'id, name',
        transactions: 'id, type, category, date, accountId',
      })
      .upgrade(async (tx) => {
        const defaultAccount: Account = {
          id: crypto.randomUUID(),
          name: DEFAULT_ACCOUNT_NAME,
          color: '#10b981',
          createdAt: new Date().toISOString(),
        };
        await tx.table('accounts').add(defaultAccount);
        await tx.table('transactions').toCollection().modify({ accountId: defaultAccount.id });
      });

    // v4: transacciones recurrentes (mensuales).
    this.version(4).stores({
      recurringRules: 'id, category, accountId',
    });

    // v5: comprobantes (foto del recibo) como Blob nativo, fuera del JSON
    // de la transacción — igual que documentBlobs en Home.
    this.version(5).stores({
      receipts: 'id',
    });

    // Dexie solo corre `.upgrade()` cuando ya había datos que migrar — una
    // instalación nueva salta directo al esquema final sin pasar por ahí.
    // `ready` sí corre siempre (instalación nueva o existente), así que es
    // el lugar seguro para garantizar que nunca falte al menos una cuenta.
    this.on('ready', async () => {
      const count = await this.accounts.count();
      if (count === 0) {
        await this.accounts.add({
          id: crypto.randomUUID(),
          name: DEFAULT_ACCOUNT_NAME,
          color: '#10b981',
          createdAt: new Date().toISOString(),
        });
      }
    });
  }
}

export const db = new FinanceDatabase();
