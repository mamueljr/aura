// Sin moneda fija: la app aún no pregunta la divisa del usuario, así que
// formatea el número con separador de miles y símbolo genérico ($).
const number = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatAmount(value: number): string {
  return `$${number.format(value)}`;
}
