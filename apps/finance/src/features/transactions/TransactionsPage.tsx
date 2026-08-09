import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Badge } from '@aura/ui/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { accountsRepository } from '@/repositories/accounts.repository';
import { transactionsRepository } from '@/repositories/transactions.repository';
import type { NewTransaction, Transaction } from '@/types/transaction';
import { formatAmount, useCurrency } from '@/lib/currency';
import { balanceOf } from './balances';
import { ReceiptViewerDialog } from './ReceiptViewerDialog';
import { TransactionFormDialog } from './TransactionFormDialog';

export function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
  const [currency] = useCurrency();
  const transactions = useLiveQuery(() => transactionsRepository.getAll(), []);
  const accounts = useLiveQuery(() => accountsRepository.getAll(), []);

  if (!transactions || !accounts) return null;

  const visible = accountFilter ? transactions.filter((t) => t.accountId === accountFilter) : transactions;
  const income = visible.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = visible.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  const accountName = accounts.find((a) => a.id === accountFilter)?.name;

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
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button size="icon" onClick={openNew} aria-label="Nuevo movimiento">
          <Plus />
        </Button>
      </div>

      {accounts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={accountFilter === null}
            onClick={() => setAccountFilter(null)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              accountFilter === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            Todas
          </button>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={accountFilter === a.id}
              onClick={() => setAccountFilter(a.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                accountFilter === a.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: a.color }} aria-hidden="true" />
              {a.name}
              <span className="tabular-nums">
                {formatAmount(balanceOf(transactions.filter((t) => t.accountId === a.id)), currency)}
              </span>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardDescription>Balance{accountName ? ` — ${accountName}` : ''}</CardDescription>
          <CardTitle className="text-3xl">{formatAmount(balance, currency)}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6 text-sm">
          <span className="text-muted-foreground">
            Ingresos <span className="font-medium text-foreground">{formatAmount(income, currency)}</span>
          </span>
          <span className="text-muted-foreground">
            Gastos <span className="font-medium text-foreground">{formatAmount(expense, currency)}</span>
          </span>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {accountFilter
              ? 'Sin movimientos en esta cuenta todavía.'
              : 'Sin movimientos todavía. Agrega el primero con el botón de arriba.'}
          </p>
        )}
        {visible.map((t) => (
          <Card key={t.id} size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.description}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{t.category}</Badge>
                  {!accountFilter && accounts.length > 1 && (
                    <span>{accounts.find((a) => a.id === t.accountId)?.name}</span>
                  )}
                  <span>{t.date}</span>
                  {t.receiptId && (
                    <button
                      type="button"
                      onClick={() => setViewingReceiptId(t.receiptId ?? null)}
                      aria-label={`Ver comprobante de ${t.description}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={t.type === 'income' ? 'text-finance-1 font-semibold' : 'font-semibold'}>
                  {t.type === 'income' ? '+' : '-'}
                  {formatAmount(t.amount, currency)}
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
        accounts={accounts}
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

      <ReceiptViewerDialog
        receiptId={viewingReceiptId}
        onOpenChange={(open) => {
          if (!open) setViewingReceiptId(null);
        }}
      />
    </div>
  );
}
