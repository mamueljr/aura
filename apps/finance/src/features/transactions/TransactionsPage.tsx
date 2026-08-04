import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Badge } from '@aura/ui/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { transactionsRepository } from '@/repositories/transactions.repository';
import type { NewTransaction } from '@/types/transaction';
import { TransactionFormDialog } from './TransactionFormDialog';
import { formatAmount } from './format';

export function TransactionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const transactions = useLiveQuery(() => transactionsRepository.getAll(), []);

  const income = transactions?.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const expense = transactions?.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const balance = income - expense;

  async function handleCreate(data: NewTransaction) {
    await transactionsRepository.create(data);
  }

  async function handleRemove(id: string) {
    await transactionsRepository.remove(id);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="finance-gradient flex size-10 items-center justify-center rounded-xl text-white">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <h1 className="finance-text text-xl font-bold">Aura Finance</h1>
        </div>
        <Button size="icon" onClick={() => setDialogOpen(true)} aria-label="Nuevo movimiento">
          <Plus />
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardDescription>Balance</CardDescription>
          <CardTitle className="text-3xl">{formatAmount(balance)}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6 text-sm">
          <span className="text-muted-foreground">
            Ingresos <span className="font-medium text-foreground">{formatAmount(income)}</span>
          </span>
          <span className="text-muted-foreground">
            Gastos <span className="font-medium text-foreground">{formatAmount(expense)}</span>
          </span>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        {transactions?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin movimientos todavía. Agrega el primero con el botón de arriba.
          </p>
        )}
        {transactions?.map((t) => (
          <Card key={t.id} size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.description}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{t.category}</Badge>
                  <span>{t.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={t.type === 'income' ? 'text-finance-1 font-semibold' : 'font-semibold'}>
                  {t.type === 'income' ? '+' : '-'}
                  {formatAmount(t.amount)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Eliminar ${t.description}`}
                  onClick={() => handleRemove(t.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <TransactionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreate} />
    </main>
  );
}
