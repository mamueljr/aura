export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
