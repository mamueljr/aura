import { lazy, Suspense, type ReactNode } from 'react';

/**
 * Las páginas se cargan bajo demanda y se envuelven en `Page`. Viven aquí y no
 * en `router.tsx` porque ese módulo exporta el router (un valor, no un
 * componente) y mezclarlos rompe el fast refresh en desarrollo.
 */

export const HomePage = lazy(() => import('@/features/home/HomePage'));
export const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
export const ArtistDetailPage = lazy(() => import('@/features/library/ArtistDetailPage'));
export const AlbumDetailPage = lazy(() => import('@/features/library/AlbumDetailPage'));
export const GenreDetailPage = lazy(() => import('@/features/library/GenreDetailPage'));
export const FavoritesPage = lazy(() => import('@/features/favorites/FavoritesPage'));
export const PlaylistsPage = lazy(() => import('@/features/playlists/PlaylistsPage'));
export const PlaylistDetailPage = lazy(() => import('@/features/playlists/PlaylistDetailPage'));
export const SearchPage = lazy(() => import('@/features/search/SearchPage'));
export const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
export const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
export const AboutPage = lazy(() => import('@/features/about/AboutPage'));

export function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-aura-1" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
