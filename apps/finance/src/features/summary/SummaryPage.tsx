import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardDescription, CardHeader } from '@aura/ui/components/card';
import { transactionsRepository } from '@/repositories/transactions.repository';
import { formatAmount } from '@/features/transactions/format';
import { currentMonthKey, expensesByCategory, monthLabel, totalsByMonth } from './aggregate';

export function SummaryPage() {
  const transactions = useLiveQuery(() => transactionsRepository.getAll(), []);

  if (!transactions) return null;

  const month = currentMonthKey();
  const categories = expensesByCategory(transactions, month);
  const maxCategory = Math.max(...categories.map((c) => c.amount), 0);
  const months = totalsByMonth(transactions);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardDescription>Gastos por categoría — {monthLabel(month)}</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin gastos este mes todavía.</p>
          ) : (
            <div className="space-y-3">
              {categories.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="font-medium tabular-nums">{formatAmount(c.amount)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxCategory ? (c.amount / maxCategory) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Por mes</CardDescription>
        </CardHeader>
        <CardContent>
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
          ) : (
            <div className="space-y-3">
              {months.map((m) => {
                const balance = m.income - m.expense;
                return (
                  <div key={m.month} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{monthLabel(m.month)}</span>
                    <div className="flex items-center gap-4 tabular-nums">
                      <span className="text-finance-1">+{formatAmount(m.income)}</span>
                      <span className="text-muted-foreground">-{formatAmount(m.expense)}</span>
                      <span
                        className={`font-medium ${balance < 0 ? 'text-destructive' : 'text-finance-1'}`}
                      >
                        {formatAmount(balance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
