import { useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';
import { SyncAuthError, syncNow } from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';

let didRun = false;

/**
 * Sincronización automática al abrir la app (una vez por sesión) cuando la
 * cuenta de Drive está conectada. Silenciosa: si requiere interacción, no
 * molesta — se reconecta desde Ajustes. Las tablas usan `useLiveQuery`, así
 * que la UI se actualiza sola en cuanto `mergeSnapshot` escribe — no hace
 * falta invalidar nada a mano.
 */
export function useFinanceSync() {
  const enabled = useSyncStore((s) => s.enabled);

  useEffect(() => {
    if (!enabled || !APP_CONFIG.googleClientId || didRun) return;
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
