import { createDriveProvider } from '@aura/sync/drive';

import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';

/**
 * El proveedor de sincronización de Aura Music.
 *
 * Vive en su propio módulo para que la orquestación (`index.ts`) y la subida de
 * la biblioteca (`library.ts`) lo compartan sin importarse entre sí.
 */
export const provider = createDriveProvider({
  clientId: APP_CONFIG.googleClientId,
  getAccountHint: () => useSyncStore.getState().accountEmail,
  getFileId: () => useSyncStore.getState().fileId,
  setFileId: (id) => useSyncStore.getState().setFileId(id),
});

/** Nombre del respaldo de Music. Distinto al de Home: comparten `appDataFolder`. */
export const BACKUP_KEY = 'aura-music-backup.json';
