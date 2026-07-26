import Dexie, { type Table } from 'dexie';

import type {
  AlbumEntry,
  ArtistEntry,
  CoverArt,
  GenreEntry,
  KeyValueEntry,
  LibraryFolder,
  PersistedPlaybackState,
  Playlist,
  SyncSecret,
  Track,
} from '@/core/types';

/**
 * Local-first storage. Everything the app knows lives here; the audio files
 * themselves stay on disk and are read on demand through the folder handles.
 */
export class AuraDatabase extends Dexie {
  tracks!: Table<Track, string>;
  covers!: Table<CoverArt, string>;
  folders!: Table<LibraryFolder, number>;
  playlists!: Table<Playlist, string>;
  albums!: Table<AlbumEntry, string>;
  artists!: Table<ArtistEntry, string>;
  genres!: Table<GenreEntry, string>;
  playbackState!: Table<PersistedPlaybackState, string>;
  settings!: Table<KeyValueEntry, string>;
  syncSecrets!: Table<SyncSecret, string>;

  constructor() {
    super('aura-music');
    this.version(1).stores({
      tracks:
        'id, folderId, title, artist, albumArtist, album, genre, favorite, addedAt, lastPlayedAt, playCount',
      covers: 'id',
      folders: '++id',
      playlists: 'id, name, updatedAt',
      albums: 'id, name, artist',
      artists: 'id, name',
      genres: 'id, name',
      playbackState: 'id',
    });
    // v2: generic key-value table (negative cache for online cover lookups…)
    this.version(2).stores({
      settings: 'key',
    });
    // v3: Aura Sync encryption key. Deliberately outside the synced snapshot:
    // the key must never travel inside the backup it encrypts.
    this.version(3).stores({
      syncSecrets: 'id',
    });
  }
}

export const db = new AuraDatabase();
