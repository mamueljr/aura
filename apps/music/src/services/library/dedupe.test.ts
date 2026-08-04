import { beforeEach, describe, expect, it } from 'vitest';

import type { Playlist, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

import { contentKey, dedupeLibrary } from './dedupe';

/**
 * Fundir dos filas borra una: si se equivoca, el usuario pierde una canción de
 * su biblioteca y no hay deshacer. Por eso cada regla tiene su caso, y también
 * los casos en los que NO debe fundir.
 */

/** Carpeta real de este dispositivo, con el audio en disco. */
const LOCAL_FOLDER = 1;
/** Carpeta sintética donde aterrizan las pistas recibidas por Aura Sync. */
const CLOUD_FOLDER = 2;

function track(id: string, extra: Partial<Track> = {}): Track {
  return {
    id,
    folderId: LOCAL_FOLDER,
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

/** La misma canción tal y como llega del otro dispositivo. */
const fromCloud = (id: string, extra: Partial<Track> = {}): Track =>
  track(id, { folderId: CLOUD_FOLDER, opfs: 0, driveFileId: `drive-${id}`, ...extra });

function playlist(id: string, trackIds: string[], extra: Partial<Playlist> = {}): Playlist {
  return { id, name: `Lista ${id}`, trackIds, createdAt: 0, updatedAt: 100, ...extra };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  await db.folders.bulkPut([
    { id: LOCAL_FOLDER, name: 'Música', mode: 'fs-access', addedAt: 0 },
    { id: CLOUD_FOLDER, name: 'Aura Sync', mode: 'cloud', addedAt: 0 },
  ]);
});

describe('contentKey', () => {
  it('la misma canción en carpetas distintas comparte huella', () => {
    expect(contentKey(track('a'))).toBe(contentKey(fromCloud('b')));
  });

  it('ignora mayúsculas, acentos y espacios de sobra', () => {
    expect(contentKey(track('a', { title: '  CANCIÓN  ', artist: 'ARTISTA' }))).toBe(
      contentKey(track('b', { title: 'cancion', artist: 'artista' })),
    );
  });

  it('una duración distinta es una versión distinta', () => {
    // Directo, remezcla o edición de radio comparten título y álbum; lo único
    // que los separa de forma fiable es cuánto duran.
    expect(contentKey(track('a', { duration: 180 }))).not.toBe(
      contentKey(track('b', { duration: 240 })),
    );
  });

  it('sin título o sin duración no hay huella: mejor un duplicado que una pérdida', () => {
    expect(contentKey(track('a', { title: '' }))).toBeNull();
    expect(contentKey(track('a', { duration: 0 }))).toBeNull();
  });
});

describe('dedupeLibrary', () => {
  it('conserva el id que conoce el otro dispositivo, no el local', async () => {
    await db.tracks.bulkPut([track('local'), fromCloud('remoto')]);

    expect(await dedupeLibrary()).toBe(1);

    const rows = await db.tracks.toArray();
    expect(rows).toHaveLength(1);
    // Si sobreviviera 'local', las playlists del otro dispositivo apuntarían
    // a una pista que allí no existe.
    expect(rows[0].id).toBe('remoto');
  });

  it('la fila que queda apunta al archivo real de este dispositivo', async () => {
    await db.tracks.bulkPut([
      track('local', { path: 'rock/tema.mp3', opfs: 1 }),
      fromCloud('remoto'),
    ]);

    await dedupeLibrary();

    const [row] = await db.tracks.toArray();
    expect(row.folderId).toBe(LOCAL_FOLDER);
    expect(row.path).toBe('rock/tema.mp3');
    expect(row.opfs).toBe(1);
    // …y sin perder la referencia al audio en la nube.
    expect(row.driveFileId).toBe('drive-remoto');
  });

  it('no pierde escuchas ni la fecha de alta más antigua', async () => {
    await db.tracks.bulkPut([
      track('local', { playCount: 7, lastPlayedAt: 900, addedAt: 100 }),
      fromCloud('remoto', { playCount: 2, lastPlayedAt: 500, addedAt: 400 }),
    ]);

    await dedupeLibrary();

    const [row] = await db.tracks.toArray();
    expect(row.playCount).toBe(7);
    expect(row.lastPlayedAt).toBe(900);
    expect(row.addedAt).toBe(100);
  });

  it('en el favorito gana el cambio más reciente, también si fue quitarlo', async () => {
    await db.tracks.bulkPut([
      track('local', { favorite: 0, favoriteAt: 900 }),
      fromCloud('remoto', { favorite: 1, favoriteAt: 500 }),
    ]);

    await dedupeLibrary();

    const [row] = await db.tracks.toArray();
    expect(row.favorite).toBe(0);
    expect(row.favoriteAt).toBe(900);
  });

  it('reescribe las playlists que apuntaban a la copia que desaparece', async () => {
    await db.tracks.bulkPut([track('local'), fromCloud('remoto')]);
    await db.playlists.put(playlist('p1', ['otra', 'local']));

    await dedupeLibrary();

    const [list] = await db.playlists.toArray();
    expect(list.trackIds).toEqual(['otra', 'remoto']);
  });

  it('si la playlist tenía las dos copias, no deja la canción repetida', async () => {
    await db.tracks.bulkPut([track('local'), fromCloud('remoto')]);
    await db.playlists.put(playlist('p1', ['local', 'remoto']));

    await dedupeLibrary();

    expect((await db.playlists.get('p1'))!.trackIds).toEqual(['remoto']);
  });

  it('no toca `updatedAt` de la playlist: es una corrección, no una edición', async () => {
    // Si lo tocara, esta reescritura le ganaría por fecha a un cambio real
    // hecho en el otro dispositivo y lo descartaría en la siguiente fusión.
    await db.tracks.bulkPut([track('local'), fromCloud('remoto')]);
    await db.playlists.put(playlist('p1', ['local'], { updatedAt: 100 }));

    await dedupeLibrary();

    expect((await db.playlists.get('p1'))!.updatedAt).toBe(100);
  });

  it('funde también tres copias de la misma canción', async () => {
    await db.tracks.bulkPut([
      track('local1', { path: 'a.mp3', playCount: 1 }),
      track('local2', { path: 'b.mp3', playCount: 5 }),
      fromCloud('remoto'),
    ]);

    expect(await dedupeLibrary()).toBe(2);

    const rows = await db.tracks.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('remoto');
    expect(rows[0].playCount).toBe(5);
  });

  it('deja en paz las canciones que solo se parecen', async () => {
    await db.tracks.bulkPut([
      track('a', { title: 'Tema' }),
      track('b', { title: 'Tema', duration: 240 }),
      track('c', { title: 'Tema', album: 'Otro' }),
    ]);

    expect(await dedupeLibrary()).toBe(0);
    expect(await db.tracks.count()).toBe(3);
  });

  it('no agrupa las que no tienen datos suficientes', async () => {
    await db.tracks.bulkPut([
      track('a', { title: '', duration: 180 }),
      track('b', { title: '', duration: 180 }),
      track('c', { duration: 0 }),
      track('d', { duration: 0 }),
    ]);

    expect(await dedupeLibrary()).toBe(0);
    expect(await db.tracks.count()).toBe(4);
  });

  it('pasarla dos veces no cambia nada', async () => {
    await db.tracks.bulkPut([track('local'), fromCloud('remoto')]);
    await db.playlists.put(playlist('p1', ['local']));

    await dedupeLibrary();
    const after = await db.tracks.toArray();

    expect(await dedupeLibrary()).toBe(0);
    expect(await db.tracks.toArray()).toEqual(after);
  });

  it('con las dos copias subidas elige siempre la misma, sin hablar con nadie', async () => {
    // Dos dispositivos pueden haber subido su propia copia. Cada uno debe
    // llegar por su cuenta al mismo superviviente, o no convergen nunca.
    await db.tracks.bulkPut([fromCloud('aaa'), fromCloud('zzz')]);
    await dedupeLibrary();
    const primero = (await db.tracks.toArray())[0].id;

    await Promise.all(db.tables.map((table) => table.clear()));
    await db.folders.bulkPut([
      { id: LOCAL_FOLDER, name: 'Música', mode: 'fs-access', addedAt: 0 },
      { id: CLOUD_FOLDER, name: 'Aura Sync', mode: 'cloud', addedAt: 0 },
    ]);
    // El mismo par, descubierto en el orden contrario.
    await db.tracks.bulkPut([fromCloud('zzz'), fromCloud('aaa')]);
    await dedupeLibrary();

    expect((await db.tracks.toArray())[0].id).toBe(primero);
  });
});
