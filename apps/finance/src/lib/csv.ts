import type { Transaction } from '@/types/transaction';

const HEADERS = ['fecha', 'tipo', 'categoría', 'descripción', 'monto'];

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = transactions.map((t) =>
    [t.date, t.type === 'income' ? 'ingreso' : 'gasto', t.category, t.description, String(t.amount)]
      .map(escapeCell)
      .join(','),
  );
  return [HEADERS.join(','), ...rows].join('\n');
}

export function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
