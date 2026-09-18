import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

vi.mock('@/infrastructure/fs/opfs', () => ({
  opfsSupported: vi.fn(async () => true),
  saveTrackToOpfs: vi.fn(async () => true),
}));
vi.mock('@/infrastructure/fs/fileSystem', () => ({
  getTrackFile: vi.fn(async () => new File(['audio'], 'song.mp3')),
}));

import { getTrackFile } from '@/infrastructure/fs/fileSystem';
import { saveTrackToOpfs } from '@/infrastructure/fs/opfs';
import { importFolderToApp } from './importer';

/**
 * Importar copia los archivos a OPFS para poder reproducir sin permisos. Lo
 * importante no es la copia en sí (mockeada) sino qué filas se marcan y qué
 * se salta: nunca hay que re-copiar una pista que ya está en la app.
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

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  await db.folders.bulkPut([{ id: FOLDER, name: 'Música', mode: 'fs-access', addedAt: 0 }]);
  vi.clearAllMocks();
});

describe('importFolderToApp', () => {
  it('copia solo las pistas que no tienen copia y marca la carpeta como importada', async () => {
    await db.tracks.bulkPut([track('a'), track('b', { opfs: 1 })]);

    const progress = await importFolderToApp(FOLDER);

    expect(progress.done).toBe(1);
    expect(saveTrackToOpfs).toHaveBeenCalledTimes(1);
    expect(await db.tracks.get('a')).toMatchObject({ opfs: 1 });
    expect(await db.folders.get(FOLDER)).toMatchObject({ imported: true });
  });

  it('no re-copia una pista que ya está en la app', async () => {
    await db.tracks.bulkPut([track('a', { opfs: 1 })]);

    const progress = await importFolderToApp(FOLDER);

    expect(progress.total).toBe(0);
    expect(saveTrackToOpfs).not.toHaveBeenCalled();
    expect(getTrackFile).not.toHaveBeenCalled();
  });
});
