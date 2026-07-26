import { beforeEach, describe, expect, it } from 'vitest';

import type { Playlist, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

import { exportSnapshot, mergeSnapshot } from './snapshot';
import type { SyncSnapshot } from './types';

/**
 * La fusión es lo único que puede estropear datos del usuario (playlists,
 * favoritos, historial), así que cada regla documentada tiene su caso.
 */

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

function playlist(id: string, updatedAt: number, extra: Partial<Playlist> = {}): Playlist {
  return {
    id,
    name: `Lista ${id}`,
    trackIds: [],
    createdAt: 0,
    updatedAt,
    ...extra,
  };
}

function snapshot(partial: Partial<SyncSnapshot> = {}): SyncSnapshot {
  return { playlists: [], favorites: [], history: [], settings: {}, ...partial };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('exportSnapshot', () => {
  it('recoge playlists, favoritos, historial y ajustes', async () => {
    await db.playlists.put(playlist('p1', 10));
    await db.tracks.bulkPut([
      track('t1', { favorite: 1, playCount: 3, lastPlayedAt: 500 }),
      track('t2'),
    ]);
    await db.settings.put({ key: 'tema', value: 'oscuro' });

    const result = await exportSnapshot();

    expect(result.playlists).toHaveLength(1);
    expect(result.favorites).toEqual(['t1']);
    expect(result.history).toEqual([{ id: 't1', playCount: 3, lastPlayedAt: 500 }]);
    expect(result.settings).toEqual({ tema: 'oscuro' });
  });

  it('deja fuera lo que se regenera solo (la biblioteca no viaja)', async () => {
    await db.tracks.put(track('t1'));

    const result = await exportSnapshot();

    // Una pista sin reproducciones ni favorito no aporta nada al snapshot.
    expect(result.history).toEqual([]);
    expect(result.favorites).toEqual([]);
    expect(result).not.toHaveProperty('tracks');
  });
});

describe('mergeSnapshot — playlists', () => {
  it('inserta las que solo existen en el remoto', async () => {
    const report = await mergeSnapshot(snapshot({ playlists: [playlist('p1', 10)] }));

    expect(await db.playlists.get('p1')).toBeDefined();
    expect(report.playlists).toBe(1);
  });

  it('la versión más reciente gana', async () => {
    await db.playlists.put(playlist('p1', 10, { name: 'vieja' }));

    await mergeSnapshot(snapshot({ playlists: [playlist('p1', 20, { name: 'nueva' })] }));

    expect((await db.playlists.get('p1'))?.name).toBe('nueva');
  });

  it('no pisa una playlist local más nueva', async () => {
    await db.playlists.put(playlist('p1', 30, { name: 'local reciente' }));

    await mergeSnapshot(snapshot({ playlists: [playlist('p1', 20, { name: 'remota vieja' })] }));

    expect((await db.playlists.get('p1'))?.name).toBe('local reciente');
  });
});

describe('mergeSnapshot — historial', () => {
  it('se queda con el mayor número de reproducciones', async () => {
    await db.tracks.put(track('t1', { playCount: 5, lastPlayedAt: 100 }));

    await mergeSnapshot(
      snapshot({ history: [{ id: 't1', playCount: 2, lastPlayedAt: 900 }] }),
    );

    const merged = await db.tracks.get('t1');
    // Ningún lado pierde: el contador local era mayor, la escucha remota más reciente.
    expect(merged?.playCount).toBe(5);
    expect(merged?.lastPlayedAt).toBe(900);
  });

  it('ignora pistas que no existen en este dispositivo', async () => {
    const report = await mergeSnapshot(
      snapshot({ history: [{ id: 'inexistente', playCount: 9, lastPlayedAt: 1 }] }),
    );

    expect(report.history).toBe(0);
    expect(await db.tracks.get('inexistente')).toBeUndefined();
  });
});

describe('mergeSnapshot — favoritos y ajustes', () => {
  it('añade favoritos remotos sin quitar los locales', async () => {
    await db.tracks.bulkPut([track('t1', { favorite: 1 }), track('t2')]);

    await mergeSnapshot(snapshot({ favorites: ['t2'] }));

    expect((await db.tracks.get('t1'))?.favorite).toBe(1);
    expect((await db.tracks.get('t2'))?.favorite).toBe(1);
  });

  it('respeta los ajustes locales y solo rellena los que faltan', async () => {
    await db.settings.put({ key: 'tema', value: 'oscuro' });

    await mergeSnapshot(snapshot({ settings: { tema: 'claro', idioma: 'es' } }));

    // El tema es preferencia de ESTE dispositivo; el idioma no existía.
    expect((await db.settings.get('tema'))?.value).toBe('oscuro');
    expect((await db.settings.get('idioma'))?.value).toBe('es');
  });
});
