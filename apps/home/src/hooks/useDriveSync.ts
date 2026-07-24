import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { APP_CONFIG } from '@/config/app'
import { syncNow, SyncAuthError } from '@/services/drive-sync.service'
import { useSyncStore } from '@/stores/sync.store'

let didRun = false

/**
 * Sincronización automática al abrir la app (una vez por sesión) cuando
 * la cuenta de Drive está conectada. Silenciosa: si requiere interacción,
 * no molesta — se reconecta desde Ajustes.
 */
export function useDriveSync() {
  const enabled = useSyncStore((s) => s.enabled)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !APP_CONFIG.googleClientId || didRun) return
    didRun = true
    void (async () => {
      try {
        const result = await syncNow({ interactive: false })
        if (result.action === 'pulled' || result.action === 'merged') {
          await queryClient.invalidateQueries()
        }
      } catch (error) {
        if (!(error instanceof SyncAuthError)) {
          console.warn('Sincronización automática falló:', error)
        }
      }
    })()
  }, [enabled, queryClient])
}
