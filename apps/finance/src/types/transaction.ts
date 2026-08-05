export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  accountId: string;
  /** Referencia a un Blob en la tabla `receipts` — la foto del comprobante, si hay una. */
  receiptId?: string;
  createdAt: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
