import { createDriveProvider } from '@aura/sync/drive';

import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';

/**
 * El proveedor de sincronización de Aura Finance.
 *
 * Mismo transporte (`@aura/sync/drive`) y mismo Client ID que Home/Music;
 * cada app solo aporta dónde cachea el id de archivo y la cuenta conectada.
 */
export const provider = createDriveProvider({
  clientId: APP_CONFIG.googleClientId,
  getAccountHint: () => useSyncStore.getState().accountEmail,
  getFileId: () => useSyncStore.getState().fileId,
  setFileId: (id) => useSyncStore.getState().setFileId(id),
});

/** Nombre del respaldo de Finance. Distinto al de Home/Music: comparten `appDataFolder`. */
export const BACKUP_KEY = 'aura-finance-backup.json';
