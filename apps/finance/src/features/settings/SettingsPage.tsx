import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@aura/ui/components/badge';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { Input } from '@aura/ui/components/input';
import { Label } from '@aura/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aura/ui/components/select';
import { Switch } from '@aura/ui/components/switch';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AccountFormDialog } from '@/features/accounts/AccountFormDialog';
import { RecurringFormDialog } from '@/features/recurring/RecurringFormDialog';
import { SyncCard } from '@/features/settings/SyncCard';
import { CATEGORIES } from '@/features/transactions/categories';
import { CURRENCIES, formatAmount, useCurrency } from '@/lib/currency';
import { downloadCsv, transactionsToCsv } from '@/lib/csv';
import { accountsRepository } from '@/repositories/accounts.repository';
import { budgetsRepository } from '@/repositories/budgets.repository';
import { recurringRepository } from '@/repositories/recurring.repository';
import { transactionsRepository } from '@/repositories/transactions.repository';
import type { Account, NewAccount } from '@/types/account';
import type { NewRecurringRule, RecurringRule } from '@/types/recurring';

export function SettingsPage() {
  const [currency, setCurrency] = useCurrency();
  const budgets = useLiveQuery(() => budgetsRepository.getAll(), []);
  const accounts = useLiveQuery(() => accountsRepository.getAll(), []);
  const recurringRules = useLiveQuery(() => recurringRepository.getAll(), []);
  const limitByCategory = new Map(budgets?.map((b) => [b.category, b.monthlyLimit]));

  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [pendingDeleteRule, setPendingDeleteRule] = useState<RecurringRule | null>(null);

  async function handleExport() {
    const transactions = await transactionsRepository.getAll();
    const csv = transactionsToCsv(transactions);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `aura-finance-${today}.csv`);
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
    if (!pendingDeleteAccount) return;
    const result = await accountsRepository.remove(pendingDeleteAccount.id);
    setDeleteError(result.ok ? null : result.reason);
  }

  function openNewRule() {
    setEditingRule(null);
    setRuleFormOpen(true);
  }

  function openEditRule(r: RecurringRule) {
    setEditingRule(r);
    setRuleFormOpen(true);
  }

  async function handleRuleSubmit(data: NewRecurringRule) {
    if (editingRule) {
      await recurringRepository.update(editingRule.id, data);
    } else {
      await recurringRepository.create(data);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SyncCard />

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
                    setPendingDeleteAccount(a);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recurrentes</CardTitle>
              <CardDescription>Renta, salario, suscripciones — se generan solas cada mes.</CardDescription>
            </div>
            <Button size="icon" variant="outline" onClick={openNewRule} aria-label="Nuevo recurrente">
              <Plus />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recurringRules?.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin recurrentes todavía.</p>
          )}
          {recurringRules?.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.description}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{r.category}</Badge>
                  <span>día {r.dayOfMonth}</span>
                  <span className={r.type === 'income' ? 'text-finance-1' : ''}>
                    {r.type === 'income' ? '+' : '-'}
                    {formatAmount(r.amount, currency)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={r.active}
                  onCheckedChange={(active) => void recurringRepository.update(r.id, { active })}
                  aria-label={r.active ? `Desactivar ${r.description}` : `Activar ${r.description}`}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Editar ${r.description}`}
                  onClick={() => openEditRule(r)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Eliminar ${r.description}`}
                  onClick={() => setPendingDeleteRule(r)}
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
        open={pendingDeleteAccount !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteAccount(null);
        }}
        title="Eliminar cuenta"
        description={`"${pendingDeleteAccount?.name}" se eliminará permanentemente.`}
        onConfirm={() => void handleAccountDelete()}
      />

      <RecurringFormDialog
        open={ruleFormOpen}
        onOpenChange={setRuleFormOpen}
        rule={editingRule}
        accounts={accounts ?? []}
        onSubmit={handleRuleSubmit}
      />

      <ConfirmDialog
        open={pendingDeleteRule !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRule(null);
        }}
        title="Eliminar recurrente"
        description={`"${pendingDeleteRule?.description}" se eliminará permanentemente.`}
        onConfirm={() => {
          if (pendingDeleteRule) void recurringRepository.remove(pendingDeleteRule.id);
        }}
      />
    </div>
  );
}
