import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { Input } from '@aura/ui/components/input';
import { Label } from '@aura/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aura/ui/components/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AccountFormDialog } from '@/features/accounts/AccountFormDialog';
import { CATEGORIES } from '@/features/transactions/categories';
import { CURRENCIES, useCurrency } from '@/lib/currency';
import { downloadTextFile, transactionsToCsv } from '@/lib/csv';
import { accountsRepository } from '@/repositories/accounts.repository';
import { budgetsRepository } from '@/repositories/budgets.repository';
import { transactionsRepository } from '@/repositories/transactions.repository';
import type { Account, NewAccount } from '@/types/account';

export function SettingsPage() {
  const [currency, setCurrency] = useCurrency();
  const budgets = useLiveQuery(() => budgetsRepository.getAll(), []);
  const accounts = useLiveQuery(() => accountsRepository.getAll(), []);
  const limitByCategory = new Map(budgets?.map((b) => [b.category, b.monthlyLimit]));

  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport() {
    const transactions = await transactionsRepository.getAll();
    const csv = transactionsToCsv(transactions);
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(csv, `aura-finance-${today}.csv`, 'text/csv');
  }

  function openNewAccount() {
    setEditingAccount(null);
    setAccountFormOpen(true);
  }

  function openEditAccount(a: Account) {
    setEditingAccount(a);
    setAccountFormOpen(true);
  }

  async function handleAccountSubmit(data: NewAccount) {
    if (editingAccount) {
      await accountsRepository.update(editingAccount.id, data);
    } else {
      await accountsRepository.create(data);
    }
  }

  async function handleAccountDelete() {
    if (!pendingDelete) return;
    const result = await accountsRepository.remove(pendingDelete.id);
    setDeleteError(result.ok ? null : result.reason);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Moneda</CardTitle>
          <CardDescription>En qué divisa se muestran tus movimientos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="settings-currency">Divisa</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="settings-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cuentas</CardTitle>
              <CardDescription>Efectivo, banco, tarjeta — donde vive tu dinero.</CardDescription>
            </div>
            <Button size="icon" variant="outline" onClick={openNewAccount} aria-label="Nueva cuenta">
              <Plus />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          {accounts?.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ backgroundColor: a.color }} aria-hidden="true" />
                <span className="text-sm">{a.name}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Editar ${a.name}`}
                  onClick={() => openEditAccount(a)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Eliminar ${a.name}`}
                  onClick={() => {
                    setDeleteError(null);
                    setPendingDelete(a);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presupuestos</CardTitle>
          <CardDescription>Límite mensual por categoría de gasto. Déjalo en 0 para quitarlo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CATEGORIES.expense.map((category) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <Label htmlFor={`budget-${category}`} className="flex-1 font-normal">
                {category}
              </Label>
              <Input
                id={`budget-${category}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                className="w-28"
                defaultValue={limitByCategory.get(category) ?? ''}
                onBlur={(e) => void budgetsRepository.set(category, Number(e.target.value))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exportar</CardTitle>
          <CardDescription>Descarga todos tus movimientos como CSV.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download /> Exportar movimientos
          </Button>
        </CardContent>
      </Card>

      <AccountFormDialog
        open={accountFormOpen}
        onOpenChange={setAccountFormOpen}
        account={editingAccount}
        onSubmit={handleAccountSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Eliminar cuenta"
        description={`"${pendingDelete?.name}" se eliminará permanentemente.`}
        onConfirm={() => void handleAccountDelete()}
      />
    </div>
  );
}
