import { beforeEach, describe, expect, it } from 'vitest';

import type { Playlist, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

import { exportSnapshot, mergeSnapshot, purgeOldTombstones } from './snapshot';
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

  it('deja fuera lo que se regenera solo', async () => {
    await db.tracks.put(track('t1'));

    const result = await exportSnapshot();

    // Una pista sin reproducciones ni favorito no aporta nada al snapshot, y
    // sin audio subido tampoco viaja su ficha.
    expect(result.history).toEqual([]);
    expect(result.favorites).toEqual([]);
    expect(result.tracks).toEqual([]);
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

describe('propagar borrados', () => {
  it('una playlist borrada viaja como lápida y no reaparece', async () => {
    // El dispositivo A la borró: su lápida es más reciente que la copia de B.
    await db.playlists.put(playlist('p1', 10, { name: 'Mi lista' }));

    await mergeSnapshot(
      snapshot({ playlists: [playlist('p1', 20, { deletedAt: 20 })] }),
    );

    const local = await db.playlists.get('p1');
    expect(local?.deletedAt).toBe(20);
  });

  it('la lápida viaja en el snapshot', async () => {
    await db.playlists.put(playlist('p1', 20, { deletedAt: 20 }));

    const result = await exportSnapshot();

    // Si se omitiera, el otro dispositivo la reenviaría y reaparecería.
    expect(result.playlists.map((p) => p.id)).toEqual(['p1']);
  });

  it('quitar un favorito se propaga', async () => {
    await db.tracks.put(track('t1', { favorite: 1, favoriteAt: 10 }));

    await mergeSnapshot(
      snapshot({ favoriteMarks: [{ id: 't1', favorite: 0, at: 20 }] }),
    );

    expect((await db.tracks.get('t1'))?.favorite).toBe(0);
  });

  it('no revive un favorito que se quitó después', async () => {
    // Local lo quitó en t=30; el remoto trae una marca más vieja.
    await db.tracks.put(track('t1', { favorite: 0, favoriteAt: 30 }));

    await mergeSnapshot(
      snapshot({ favoriteMarks: [{ id: 't1', favorite: 1, at: 20 }] }),
    );

    expect((await db.tracks.get('t1'))?.favorite).toBe(0);
  });

  it('un respaldo antiguo no revive un favorito ya quitado', async () => {
    await db.tracks.put(track('t1', { favorite: 0, favoriteAt: 30 }));

    // Sin `favoriteMarks`: sería la lista de ids de v1/v2.
    await mergeSnapshot(snapshot({ favorites: ['t1'] }));

    expect((await db.tracks.get('t1'))?.favorite).toBe(0);
  });

  it('purga las lápidas caducadas, no las recientes', async () => {
    const hace40Dias = Date.now() - 40 * 24 * 60 * 60 * 1000;
    await db.playlists.bulkPut([
      playlist('vieja', hace40Dias, { deletedAt: hace40Dias }),
      playlist('reciente', Date.now(), { deletedAt: Date.now() }),
    ]);

    await purgeOldTombstones();

    expect(await db.playlists.get('vieja')).toBeUndefined();
    // Purgarla antes de que el otro dispositivo sincronice la haría reaparecer.
    expect(await db.playlists.get('reciente')).toBeDefined();
  });
});

describe('snapshot — biblioteca en la nube', () => {
  it('solo exporta las pistas que ya tienen audio subido', async () => {
    await db.tracks.bulkPut([
      track('subida', { driveFileId: 'drive-1' }),
      track('sin-subir'),
    ]);

    const result = await exportSnapshot();

    // Exportar una pista sin `driveFileId` la mostraría en el otro
    // dispositivo sin forma de reproducirla.
    expect(result.tracks?.map((t) => t.id)).toEqual(['subida']);
  });

  it('no expone datos propios del dispositivo de origen', async () => {
    await db.tracks.put(track('t1', { driveFileId: 'drive-1', folderId: 7, opfs: 1 }));

    const [exported] = (await exportSnapshot()).tracks ?? [];

    expect(exported).not.toHaveProperty('folderId');
    expect(exported).not.toHaveProperty('opfs');
  });

  it('trae las pistas de la nube a una carpeta sintética', async () => {
    const remote = { ...track('nube-1'), driveFileId: 'drive-1' } as never;

    const report = await mergeSnapshot(snapshot({ tracks: [remote] }));

    const saved = await db.tracks.get('nube-1');
    const folder = await db.folders.get(saved!.folderId);
    expect(report.tracks).toBe(1);
    expect(folder?.mode).toBe('cloud');
    // Llega sin copia local: se descargará al reproducirla.
    expect(saved?.opfs).toBe(0);
  });

  it('reutiliza la misma carpeta de nube en sincronizaciones sucesivas', async () => {
    const uno = { ...track('nube-1'), driveFileId: 'd1' } as never;
    const dos = { ...track('nube-2'), driveFileId: 'd2' } as never;

    await mergeSnapshot(snapshot({ tracks: [uno] }));
    await mergeSnapshot(snapshot({ tracks: [dos] }));

    const folders = await db.folders.toArray();
    expect(folders.filter((f) => f.mode === 'cloud')).toHaveLength(1);
  });

  it('no pisa una pista que ya existe en este dispositivo', async () => {
    await db.tracks.put(track('t1', { folderId: 3, opfs: 1, path: 'ruta/real.mp3' }));
    const remote = { ...track('t1'), driveFileId: 'd1', path: 'otra/ruta.mp3' } as never;

    const report = await mergeSnapshot(snapshot({ tracks: [remote] }));

    const local = await db.tracks.get('t1');
    // La copia local y su ruta real mandan sobre la de la nube.
    expect(local?.path).toBe('ruta/real.mp3');
    expect(local?.opfs).toBe(1);
    expect(report.tracks).toBe(0);
  });

  it('sigue leyendo un respaldo v1, sin pistas', async () => {
    const report = await mergeSnapshot(snapshot({ playlists: [playlist('p1', 10)] }));

    expect(report.tracks).toBe(0);
    expect(await db.playlists.get('p1')).toBeDefined();
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
