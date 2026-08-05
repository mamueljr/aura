import { useEffect } from 'react';
import { recurringRepository } from '@/repositories/recurring.repository';

/** Genera, una vez por apertura de la app, los movimientos de las reglas vencidas del mes. */
export function useRecurringTransactions() {
  useEffect(() => {
    void recurringRepository.runDue();
  }, []);
}
