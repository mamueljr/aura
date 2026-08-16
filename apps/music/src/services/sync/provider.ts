import { createDriveProvider, tokenFromStorage, tokenToStorage } from '@aura/sync/drive';

import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';

/**
 * El proveedor de sincronización de Aura Music.
 *
 * Vive en su propio módulo para que la orquestación (`index.ts`) y la subida de
 * la biblioteca (`library.ts`) lo compartan sin importarse entre sí.
 *
 * El token de acceso se persiste en `localStorage` bajo una clave compartida
 * por todas las apps del ecosistema: comparten origen y Client ID, así que el
 * token emitido para una vale para las demás y cambiar de app no vuelve a pedir
 * el selector de cuenta.
 */
const TOKEN_KEY = 'aura:google:drive-token';

export const provider = createDriveProvider({
  clientId: APP_CONFIG.googleClientId,
  getAccountHint: () => useSyncStore.getState().accountEmail,
  getFileId: () => useSyncStore.getState().fileId,
  setFileId: (id) => useSyncStore.getState().setFileId(id),
  getToken: () => tokenFromStorage(TOKEN_KEY),
  setToken: (token) => tokenToStorage(TOKEN_KEY, token),
});

/** Nombre del respaldo de Music. Distinto al de Home: comparten `appDataFolder`. */
export const BACKUP_KEY = 'aura-music-backup.json';
