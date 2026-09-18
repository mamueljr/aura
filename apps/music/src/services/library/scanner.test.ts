import { beforeEach, describe, expect, it } from 'vitest';

import type { CoverArt, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

import { pruneOrphanCovers, removeFolder } from './scanner';

/**
 * El escaneo es la operación más delicada de la biblioteca: un diff mal
 * calculado borra canciones sin deshacer. `runScan` necesita un Web Worker y
 * handles de archivo, así que aquí se cubre lo que sí se puede probar en node
 * con `fake-indexeddb`: la limpieza de portadas huérfanas y el borrado de una
 * carpeta completa.
 */

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

function cover(id: string): CoverArt {
  return { id, blob: new Blob(['x']) };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('pruneOrphanCovers', () => {
  it('borra la portada que ninguna pista referencia y conserva la usada', async () => {
    await db.tracks.bulkPut([
      track('a', { coverId: 'cover-a' }),
      track('b'), // sin portada
    ]);
    await db.covers.bulkPut([cover('cover-a'), cover('cover-huerfana')]);

    await pruneOrphanCovers();

    expect(await db.covers.get('cover-a')).toBeTruthy();
    expect(await db.covers.get('cover-huerfana')).toBeUndefined();
  });

  it('no borra nada cuando todas las portadas están referenciadas', async () => {
    await db.tracks.bulkPut([track('a', { coverId: 'cover-a' })]);
    await db.covers.bulkPut([cover('cover-a')]);

    await pruneOrphanCovers();

    expect(await db.covers.count()).toBe(1);
  });
});

describe('removeFolder', () => {
  it('borra la carpeta y sus pistas, conservando las de otra carpeta', async () => {
    await db.folders.bulkPut([
      { id: FOLDER, name: 'Música', mode: 'fs-access', addedAt: 0 },
      { id: FOLDER + 1, name: 'Otra', mode: 'fs-access', addedAt: 0 },
    ]);
    await db.tracks.bulkPut([
      track('a'),
      track('b', { folderId: FOLDER + 1, path: 'b.mp3' }),
    ]);

    await removeFolder(FOLDER);

    expect(await db.folders.get(FOLDER)).toBeUndefined();
    expect(await db.tracks.get('a')).toBeUndefined();
    expect(await db.tracks.get('b')).toBeTruthy();
  });

  it('reconstruye los agregados tras el borrado', async () => {
    await db.folders.bulkPut([{ id: FOLDER, name: 'Música', mode: 'fs-access', addedAt: 0 }]);
    await db.tracks.bulkPut([track('a')]);

    await removeFolder(FOLDER);

    expect(await db.albums.count()).toBe(0);
    expect(await db.artists.count()).toBe(0);
    expect(await db.genres.count()).toBe(0);
  });
});
