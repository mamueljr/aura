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

/**
 * Marca de orden de bytes. Excel no detecta UTF-8 por su cuenta al abrir un
 * `.csv`: sin esto, "categoría" y "descripción" salen como "categorÃ­a". Es
 * invisible en cualquier otro programa.
 */
const BOM = '﻿';

/** Descarga el CSV en un formato que Excel abre sin romper los acentos. */
export function downloadCsv(content: string, fileName: string) {
  downloadTextFile(BOM + content, fileName, 'text/csv;charset=utf-8');
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
