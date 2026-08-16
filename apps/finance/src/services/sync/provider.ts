import { createDriveProvider, tokenFromStorage, tokenToStorage } from '@aura/sync/drive';

import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';

/**
 * El proveedor de sincronización de Aura Finance.
 *
 * Mismo transporte (`@aura/sync/drive`) y mismo Client ID que Home/Music;
 * cada app solo aporta dónde cachea el id de archivo y la cuenta conectada.
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

/** Nombre del respaldo de Finance. Distinto al de Home/Music: comparten `appDataFolder`. */
export const BACKUP_KEY = 'aura-finance-backup.json';
