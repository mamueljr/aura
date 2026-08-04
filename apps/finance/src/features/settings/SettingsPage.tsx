import { Download } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { Label } from '@aura/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aura/ui/components/select';
import { CURRENCIES, useCurrency } from '@/lib/currency';
import { downloadTextFile, transactionsToCsv } from '@/lib/csv';
import { transactionsRepository } from '@/repositories/transactions.repository';

export function SettingsPage() {
  const [currency, setCurrency] = useCurrency();

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
