import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Playlist, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

vi.mock('@/services/audio/AudioEngine', () => ({
  player: { stop: vi.fn() },
}));
vi.mock('@/services/sync/library', () => ({
  removeUploadedTrack: vi.fn(async () => {}),
}));
vi.mock('@/services/sync/push', () => ({
  pushSnapshot: vi.fn(async () => new Date().toISOString()),
}));
vi.mock('@/services/library/scanner', () => ({
  pruneOrphanCovers: vi.fn(async () => {}),
}));

import { removeTrackFromLibrary } from './actions';

const FOLDER = 1;

function track(id: string, extra: Partial<Track> = {}): Track {
  return {
    id,
    folderId: FOLDER,
    path: `${id}.mp3`,
    fileName: `${id}.mp3`,
    title: 'Canción',
    artist: 'Artista',
    albumArtist: 'Artista',
    album: 'Álbum',
    genre: 'Género',
    duration: 180,
    size: 1000,
    lastModified: 0,
    searchText: id,
    favorite: 0,
    playCount: 0,
    addedAt: 0,
    ...extra,
  };
}

function playlist(id: string, trackIds: string[]): Playlist {
  return { id, name: `Lista ${id}`, trackIds, createdAt: 0, updatedAt: 100 };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  await db.folders.add({ id: FOLDER, name: 'Música', mode: 'fs-access', addedAt: 0 });
});

describe('removeTrackFromLibrary', () => {
  it('borra la fila y la saca de todas las playlists', async () => {
    await db.tracks.bulkPut([track('a'), track('b')]);
    await db.playlists.put(playlist('p1', ['a', 'b']));
    await db.playlists.put(playlist('p2', ['a']));

    await removeTrackFromLibrary('a');

    expect(await db.tracks.count()).toBe(1);
    expect((await db.playlists.get('p1'))!.trackIds).toEqual(['b']);
    expect((await db.playlists.get('p2'))!.trackIds).toEqual([]);
  });

  it('no toca `updatedAt` de las playlists: es una corrección, no una edición', async () => {
    await db.tracks.bulkPut([track('a')]);
    await db.playlists.put(playlist('p1', ['a']));

    await removeTrackFromLibrary('a');

    expect((await db.playlists.get('p1'))!.updatedAt).toBe(100);
  });

  it('no hace nada si la pista no existe', async () => {
    await db.tracks.bulkPut([track('a')]);

    await removeTrackFromLibrary('zzz');

    expect(await db.tracks.count()).toBe(1);
    expect((await db.tracks.toArray())[0].id).toBe('a');
  });

  it('conserva las otras canciones tras reconstruir los índices', async () => {
    await db.tracks.bulkPut([track('a'), track('b')]);

    await removeTrackFromLibrary('a');

    expect((await db.tracks.toArray()).map((t) => t.id).sort()).toEqual(['b']);
  });
});