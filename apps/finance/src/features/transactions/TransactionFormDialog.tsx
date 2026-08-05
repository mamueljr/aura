import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aura/ui/components/dialog';
import { Button } from '@aura/ui/components/button';
import { Input } from '@aura/ui/components/input';
import { Label } from '@aura/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aura/ui/components/select';
import { Tabs, TabsList, TabsTrigger } from '@aura/ui/components/tabs';
import type { Account } from '@/types/account';
import type { NewTransaction, Transaction, TransactionType } from '@/types/transaction';
import { CATEGORIES } from './categories';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  accounts: Account[];
  onSubmit: (data: NewTransaction) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialState(transaction: Transaction | null, accounts: Account[]) {
  return {
    type: transaction?.type ?? ('expense' as TransactionType),
    description: transaction?.description ?? '',
    amount: transaction ? String(transaction.amount) : '',
    category: transaction?.category ?? CATEGORIES.expense[0],
    date: transaction?.date ?? today(),
    accountId: transaction?.accountId ?? accounts[0]?.id ?? '',
  };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  accounts,
  onSubmit,
}: TransactionFormDialogProps) {
  const [form, setForm] = useState(() => initialState(transaction, accounts));

  useEffect(() => {
    if (open) setForm(initialState(transaction, accounts));
  }, [open, transaction, accounts]);

  const set = <K extends keyof ReturnType<typeof initialState>>(
    key: K,
    value: ReturnType<typeof initialState>[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const amount = Number(form.amount);
  const valid = form.description.trim().length > 0 && amount > 0 && form.accountId !== '';

  function setType(type: TransactionType) {
    setForm((f) => ({ ...f, type, category: CATEGORIES[type][0] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      type: form.type,
      description: form.description.trim(),
      amount,
      category: form.category,
      date: form.date,
      accountId: form.accountId,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
          <DialogDescription>Registra un ingreso o un gasto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={form.type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">
                Gasto
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1">
                Ingreso
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="tx-desc">Descripción</Label>
            <Input
              id="tx-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Monto</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[form.type].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={form.accountId} onValueChange={(v) => set('accountId', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {transaction ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
