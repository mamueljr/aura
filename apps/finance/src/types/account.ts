export interface Account {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type NewAccount = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export const ACCOUNT_COLORS = ['#10b981', '#f59e0b', '#38bdf8', '#f472b6', '#a78bfa', '#f87171'];
