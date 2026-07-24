const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** "$1,234.50" en pesos mexicanos. */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}
