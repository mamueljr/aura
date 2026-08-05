import { useLiveQuery } from 'dexie-react-hooks';
import { Download } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { Input } from '@aura/ui/components/input';
import { Label } from '@aura/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aura/ui/components/select';
import { CATEGORIES } from '@/features/transactions/categories';
import { CURRENCIES, useCurrency } from '@/lib/currency';
import { downloadTextFile, transactionsToCsv } from '@/lib/csv';
import { budgetsRepository } from '@/repositories/budgets.repository';
import { transactionsRepository } from '@/repositories/transactions.repository';

export function SettingsPage() {
  const [currency, setCurrency] = useCurrency();
  const budgets = useLiveQuery(() => budgetsRepository.getAll(), []);
  const limitByCategory = new Map(budgets?.map((b) => [b.category, b.monthlyLimit]));

  async function handleExport() {
    const transactions = await transactionsRepository.getAll();
    const csv = transactionsToCsv(transactions);
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(csv, `aura-finance-${today}.csv`, 'text/csv');
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
    </div>
  );
}
