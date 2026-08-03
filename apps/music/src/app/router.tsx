import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';
import {
  AboutPage,
  AlbumDetailPage,
  ArtistDetailPage,
  FavoritesPage,
  GenreDetailPage,
  HomePage,
  LibraryPage,
  Page,
  PlaylistDetailPage,
  PlaylistsPage,
  SearchPage,
  SettingsPage,
  StatsPage,
} from '@/app/pages';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        {
          index: true,
          element: (
            <Page>
              <HomePage />
            </Page>
          ),
        },
        {
          path: 'library',
          element: (
            <Page>
              <LibraryPage />
            </Page>
          ),
        },
        {
          path: 'artists/:id',
          element: (
            <Page>
              <ArtistDetailPage />
            </Page>
          ),
        },
        {
          path: 'albums/:id',
          element: (
            <Page>
              <AlbumDetailPage />
            </Page>
          ),
        },
        {
          path: 'genres/:id',
          element: (
            <Page>
              <GenreDetailPage />
            </Page>
          ),
        },
        {
          path: 'favorites',
          element: (
            <Page>
              <FavoritesPage />
            </Page>
          ),
        },
        {
          path: 'playlists',
          element: (
            <Page>
              <PlaylistsPage />
            </Page>
          ),
        },
        {
          path: 'playlists/:id',
          element: (
            <Page>
              <PlaylistDetailPage />
            </Page>
          ),
        },
        {
          path: 'search',
          element: (
            <Page>
              <SearchPage />
            </Page>
          ),
        },
        {
          path: 'stats',
          element: (
            <Page>
              <StatsPage />
            </Page>
          ),
        },
        {
          path: 'settings',
          element: (
            <Page>
              <SettingsPage />
            </Page>
          ),
        },
        {
          path: 'about',
          element: (
            <Page>
              <AboutPage />
            </Page>
          ),
        },
        {
          path: '*',
          element: (
            <Page>
              <HomePage />
            </Page>
          ),
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
