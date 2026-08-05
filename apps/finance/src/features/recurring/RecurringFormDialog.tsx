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
import { Switch } from '@aura/ui/components/switch';
import { Tabs, TabsList, TabsTrigger } from '@aura/ui/components/tabs';
import { CATEGORIES } from '@/features/transactions/categories';
import type { Account } from '@/types/account';
import type { NewRecurringRule, RecurringRule } from '@/types/recurring';
import type { TransactionType } from '@/types/transaction';

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RecurringRule | null;
  accounts: Account[];
  onSubmit: (data: NewRecurringRule) => void;
}

function initialState(rule: RecurringRule | null, accounts: Account[]) {
  return {
    type: rule?.type ?? ('expense' as TransactionType),
    description: rule?.description ?? '',
    amount: rule ? String(rule.amount) : '',
    category: rule?.category ?? CATEGORIES.expense[0],
    accountId: rule?.accountId ?? accounts[0]?.id ?? '',
    dayOfMonth: rule ? String(rule.dayOfMonth) : '1',
    active: rule?.active ?? true,
  };
}

export function RecurringFormDialog({ open, onOpenChange, rule, accounts, onSubmit }: RecurringFormDialogProps) {
  const [form, setForm] = useState(() => initialState(rule, accounts));

  useEffect(() => {
    if (open) setForm(initialState(rule, accounts));
  }, [open, rule, accounts]);

  const set = <K extends keyof ReturnType<typeof initialState>>(
    key: K,
    value: ReturnType<typeof initialState>[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const amount = Number(form.amount);
  const dayOfMonth = Number(form.dayOfMonth);
  const valid =
    form.description.trim().length > 0 &&
    amount > 0 &&
    form.accountId !== '' &&
    dayOfMonth >= 1 &&
    dayOfMonth <= 28;

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
      accountId: form.accountId,
      dayOfMonth,
      active: form.active,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar recurrente' : 'Nuevo recurrente'}</DialogTitle>
          <DialogDescription>Se repite cada mes — renta, salario, suscripciones.</DialogDescription>
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
            <Label htmlFor="rr-desc">Descripción</Label>
            <Input
              id="rr-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rr-amount">Monto</Label>
              <Input
                id="rr-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-day">Día del mes</Label>
              <Input
                id="rr-day"
                type="number"
                inputMode="numeric"
                min="1"
                max="28"
                value={form.dayOfMonth}
                onChange={(e) => set('dayOfMonth', e.target.value)}
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

          <div className="flex items-center justify-between">
            <Label htmlFor="rr-active">Activo</Label>
            <Switch id="rr-active" checked={form.active} onCheckedChange={(v) => set('active', v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {rule ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
