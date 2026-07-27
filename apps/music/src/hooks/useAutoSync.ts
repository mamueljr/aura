import { useEffect } from 'react';

import { syncNow, SyncAuthError } from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';

let didRun = false;

/**
 * Sincroniza al abrir la app (una vez por sesión) si hay cuenta conectada.
 *
 * Silenciosa: si la sesión de Google caducó no molesta — se reconecta desde
 * Ajustes. Sin esto, un dispositivo recién abierto no vería la música que otro
 * acaba de subir hasta pulsar "Sincronizar ahora" a mano.
 */
export function useAutoSync(): void {
  const enabled = useSyncStore((state) => state.enabled);

  useEffect(() => {
    if (!enabled || didRun) return;
    didRun = true;
    void (async () => {
      try {
        await syncNow({ interactive: false });
      } catch (error) {
        if (!(error instanceof SyncAuthError)) {
          console.warn('Sincronización automática falló:', error);
        }
      }
    })();
  }, [enabled]);
}
