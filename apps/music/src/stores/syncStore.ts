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
  /**
   * Espejo para la UI de si hay clave de cifrado en este dispositivo. La fuente
   * de verdad es la tabla `syncSecrets`; esto evita consultas async al pintar.
   */
  encrypted: boolean;

  setConnected: (email: string) => void;
  setLastSync: (iso: string) => void;
  setFileId: (id: string | null) => void;
  setEncrypted: (value: boolean) => void;
  disconnect: () => void;
}

/**
 * Estado de la sincronización con Drive. El access token NO se persiste:
 * vive ~1 h en memoria del provider.
 */
export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      enabled: false,
      accountEmail: null,
      lastSyncAt: null,
      fileId: null,
      encrypted: false,

      setConnected: (email) => set({ enabled: true, accountEmail: email }),
      setLastSync: (iso) => set({ lastSyncAt: iso }),
      setFileId: (id) => set({ fileId: id }),
      setEncrypted: (value) => set({ encrypted: value }),
      disconnect: () =>
        set({ enabled: false, accountEmail: null, lastSyncAt: null, fileId: null }),
    }),
    { name: 'aura-music:sync' },
  ),
);
