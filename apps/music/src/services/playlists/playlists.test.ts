import { beforeEach, describe, expect, it } from 'vitest';

import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

import { parseM3U, parsePlaylistJSON, resolveSmartTrackIds } from './playlists';

/**
 * Importar playlists confía en dos formatos sueltos (M3U de terceros, JSON
 * propio) y en la resolución de pistas inteligentes. Los parsers son puros y
 * merecen casos: un M3U mal parseado no borra nada, pero importa mal.
 */

describe('parseM3U', () => {
  it('extrae título, artista y duración de #EXTINF', () => {
    const { name, entries } = parseM3U('#EXTM3U\n#EXTINF:285,Artista - Canción\nruta/a.mp3\n');

    expect(name).toBe('Imported playlist');
    expect(entries).toEqual([
      { title: 'Canción', artist: 'Artista', duration: 285, path: 'ruta/a.mp3' },
    ]);
  });

  it('tolera el formato sin coma y sin artista', () => {
    const { entries } = parseM3U('#EXTM3U\n#EXTINF:200,Canción Sola\nsola.mp3\n');

    expect(entries[0]).toMatchObject({ title: 'Canción Sola', duration: 200, path: 'sola.mp3' });
  });

  it('lee el nombre desde #PLAYLIST', () => {
    const { name } = parseM3U('#EXTM3U\n#PLAYLIST:Mi lista\n#EXTINF:1,A - B\nb.mp3\n');

    expect(name).toBe('Mi lista');
  });
});

describe('parsePlaylistJSON', () => {
  it('lee nombre, descripción y pistas del formato propio', () => {
    const json = JSON.stringify({
      format: 'aura-music-playlist',
      version: 1,
      name: 'Favoritas',
      description: 'Las mías',
      tracks: [{ title: 'Canción', artist: 'Artista', duration: 180, path: 'a.mp3' }],
    });

    const { name, description, entries } = parsePlaylistJSON(json);

    expect(name).toBe('Favoritas');
    expect(description).toBe('Las mías');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ title: 'Canción', artist: 'Artista', duration: 180 });
  });

  it('descarta entradas sin título', () => {
    const json = JSON.stringify({ name: 'X', tracks: [{ path: 'sin-titulo.mp3' }] });

    expect(parsePlaylistJSON(json).entries).toHaveLength(0);
  });
});

describe('resolveSmartTrackIds', () => {
  function track(id: string, extra: Partial<Track> = {}): Track {
    return {
      id,
      folderId: 1,
      path: `${id}.mp3`,
      fileName: `${id}.mp3`,
      title: id,
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

  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('recentlyAdded devuelve las más recientes primero', async () => {
    await db.tracks.bulkPut([
      track('a', { addedAt: 1 }),
      track('b', { addedAt: 3 }),
      track('c', { addedAt: 2 }),
    ]);

    expect(await resolveSmartTrackIds({ kind: 'recentlyAdded' })).toEqual(['b', 'c', 'a']);
  });

  it('mostPlayed omite las nunca reproducidas', async () => {
    await db.tracks.bulkPut([track('a', { playCount: 0 }), track('b', { playCount: 5 })]);

    expect(await resolveSmartTrackIds({ kind: 'mostPlayed' })).toEqual(['b']);
  });

  it('neverPlayed solo incluye las de playCount 0', async () => {
    await db.tracks.bulkPut([track('a', { playCount: 0 }), track('b', { playCount: 1 })]);

    expect(await resolveSmartTrackIds({ kind: 'neverPlayed' })).toEqual(['a']);
  });
});
