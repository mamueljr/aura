import { createDriveProvider } from '@aura/sync/drive'
import { APP_CONFIG } from '@/config/app'
import { useSyncStore } from '@/stores/sync.store'

/**
 * Aura Sync — provider de Google Drive de Aura Home.
 *
 * La implementación vive en `@aura/sync/drive`, compartida con el resto del
 * ecosistema. Aquí solo se inyecta lo propio de Home: su Client ID y el store
 * donde se cachea el id del archivo remoto (persistido, para no re-buscarlo en
 * cada arranque) y la cuenta conectada.
 */
export const driveProvider = createDriveProvider({
  clientId: APP_CONFIG.googleClientId,
  getAccountHint: () => useSyncStore.getState().accountEmail,
  getFileId: () => useSyncStore.getState().fileId,
  setFileId: (id) => useSyncStore.getState().setFileId(id),
})

export const getAccessToken = driveProvider.getAccessToken
export { loadGis, SyncAuthError } from '@aura/sync/drive'
