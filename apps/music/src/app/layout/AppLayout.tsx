import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { BottomNav } from '@/app/layout/BottomNav';
import { Sidebar } from '@/app/layout/Sidebar';
import { PermissionBanner } from '@/features/library/components/PermissionBanner';
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { NowPlayingOverlay } from '@/features/player/components/NowPlayingOverlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaSession } from '@/hooks/useMediaSession';
import { usePlaybackPersistence } from '@/hooks/usePlaybackPersistence';
import { useUiStore } from '@/stores/uiStore';

/**
 * La cola y el diálogo de playlists no se ven hasta que el usuario los abre,
 * pero sí se descargaban con la app (la cola arrastra el motor de arrastrar y
 * soltar). Se cargan la primera vez que hacen falta.
 *
 * "Reproduciendo ahora" se queda estático a propósito: comparte la animación
 * de la carátula con el mini reproductor (`layoutId`), y cargarlo tarde
 * rompería esa transición justo la primera vez que se ve.
 */
const QueueSheet = lazy(() =>
  import('@/features/player/components/QueueSheet').then((m) => ({ default: m.QueueSheet })),
);
const AddToPlaylistDialog = lazy(() =>
  import('@/features/playlists/components/AddToPlaylistDialog').then((m) => ({
    default: m.AddToPlaylistDialog,
  })),
);

/**
 * Una vez montado se queda montado: si se desmontara al cerrar, se perdería la
 * animación de salida que el propio componente define.
 */
function useMountOnce(open: boolean): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  return mounted;
}

export function AppLayout() {
  useKeyboardShortcuts();
  useMediaSession();
  usePlaybackPersistence();

  const queueMounted = useMountOnce(useUiStore((s) => s.queueOpen));
  const playlistDialogMounted = useMountOnce(
    useUiStore((s) => s.addToPlaylistTrackIds) !== null,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-h-0 flex-1 overflow-y-auto" id="main-content">
          <PermissionBanner />
          <Outlet />
          {/* Spacer so content never hides behind the mini player */}
          <div className="h-4" />
        </main>
      </div>
      <MiniPlayer />
      <BottomNav />
      <NowPlayingOverlay />
      <Suspense fallback={null}>
        {queueMounted && <QueueSheet />}
        {playlistDialogMounted && <AddToPlaylistDialog />}
      </Suspense>
    </div>
  );
}
