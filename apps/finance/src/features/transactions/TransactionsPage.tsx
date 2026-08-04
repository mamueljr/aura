import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Badge } from '@aura/ui/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { transactionsRepository } from '@/repositories/transactions.repository';
import type { NewTransaction, Transaction } from '@/types/transaction';
import { TransactionFormDialog } from './TransactionFormDialog';
import { formatAmount } from './format';

export function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const transactions = useLiveQuery(() => transactionsRepository.getAll(), []);

  const income = transactions?.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const expense = transactions?.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const balance = income - expense;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setFormOpen(true);
  }

  async function handleSubmit(data: NewTransaction) {
    if (editing) {
      await transactionsRepository.update(editing.id, data);
    } else {
      await transactionsRepository.create(data);
    }
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
        <Button size="icon" onClick={openNew} aria-label="Nuevo movimiento">
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
                  aria-label={`Editar ${t.description}`}
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Eliminar ${t.description}`}
                  onClick={() => setPendingDelete(t)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Eliminar movimiento"
        description={`"${pendingDelete?.description}" se eliminará permanentemente.`}
        onConfirm={() => {
          if (pendingDelete) void transactionsRepository.remove(pendingDelete.id);
        }}
      />
    </main>
  );
}
