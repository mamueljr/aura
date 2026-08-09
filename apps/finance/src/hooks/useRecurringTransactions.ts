import { useEffect } from 'react';
import { recurringRepository } from '@/repositories/recurring.repository';

// Flag de sesión (igual que useFinanceSync): StrictMode monta el efecto dos
// veces en dev y sin esto `runDue` correría en paralelo y duplicaría
// movimientos. En producción también evita re-generar al remontar el shell.
let didRun = false;

/** Genera, una vez por apertura de la app, los movimientos de las reglas vencidas del mes. */
export function useRecurringTransactions() {
  useEffect(() => {
    if (didRun) return;
    didRun = true;
    void recurringRepository.runDue();
  }, []);
}
