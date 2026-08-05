import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncState {
  /** Conectado a Google Drive; habilita la sincronización al abrir la app. */
  enabled: boolean;
  /** Cuenta conectada ("Conectado como…"). */
  accountEmail: string | null;
  /** Última sincronización exitosa (ISO). */
  lastSyncAt: string | null;
  /** Id del archivo de respaldo en Drive (evita re-buscarlo). */
  fileId: string | null;

  setConnected: (email: string) => void;
  setLastSync: (iso: string) => void;
  setFileId: (id: string | null) => void;
  disconnect: () => void;
}

/**
 * Estado de la sincronización con Drive. El access token NO se persiste:
 * vive en memoria del provider mientras dura la sesión.
 */
export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      enabled: false,
      accountEmail: null,
      lastSyncAt: null,
      fileId: null,

      setConnected: (email) => set({ enabled: true, accountEmail: email }),
      setLastSync: (iso) => set({ lastSyncAt: iso }),
      setFileId: (id) => set({ fileId: id }),
      disconnect: () => set({ enabled: false, accountEmail: null, lastSyncAt: null, fileId: null }),
    }),
    { name: 'aura-finance:sync' },
  ),
);
