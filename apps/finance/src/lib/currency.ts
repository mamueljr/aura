import { useEffect, useState } from 'react';

export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'Dólar estadounidense (USD)' },
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'COP', label: 'Peso colombiano (COP)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'PEN', label: 'Sol peruano (PEN)' },
  { code: 'GTQ', label: 'Quetzal guatemalteco (GTQ)' },
  { code: 'BRL', label: 'Real brasileño (BRL)' },
];

const STORAGE_KEY = 'aura-finance:currency';
const DEFAULT_CURRENCY = 'USD';

function readStoredCurrency(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CURRENCY;
}

/** Moneda elegida por el usuario, persistida en localStorage. */
export function useCurrency(): [string, (code: string) => void] {
  const [code, setCodeState] = useState(readStoredCurrency);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setCodeState(e.newValue ?? DEFAULT_CURRENCY);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function setCode(next: string) {
    localStorage.setItem(STORAGE_KEY, next);
    setCodeState(next);
  }

  return [code, setCode];
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatAmount(value: number, currencyCode: string): string {
  let formatter = formatters.get(currencyCode);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es', { style: 'currency', currency: currencyCode });
    formatters.set(currencyCode, formatter);
  }
  return formatter.format(value);
}
