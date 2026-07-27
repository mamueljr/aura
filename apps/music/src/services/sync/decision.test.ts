import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { useSyncStore } from '@/stores/syncStore';

/**
 * Qué lado gana al sincronizar. Se prueba con un proveedor en memoria porque el
 * fallo que motivó estos casos era invisible sin ejercitar la decisión: el
 * teléfono tenía el audio subido, pero al no haber playlists ni reproducciones
 * `syncNow` lo daba por "sin cambios" y nunca publicaba el índice, así que el
 * otro dispositivo no veía nada.
 */
const fake = vi.hoisted(() => ({ remote: { payload: null as unknown } }));

vi.mock('./provider', () => ({
  BACKUP_KEY: 'aura-music-backup.json',
  provider: {
    id: 'fake',
    getAccessToken: () => Promise.resolve('token'),
    pull: () => Promise.resolve(fake.remote.payload),
    push: (_key: string, payload: unknown) => {
      fake.remote.payload = payload;
      return Promise.resolve();
    },
    remove: () => Promise.resolve(),
    connect: () => Promise.resolve('persona@example.com'),
    disconnect: () => {},
    blobs: undefined,
  },
}));

const { syncNow } = await import('./index');

function track(id: string, extra: Partial<Track> = {}): Track {
  return {
    id,
    folderId: 1,
    path: `${id}.mp3`,
    fileName: `${id}.mp3`,
    title: id,
    artist: 'A',
    albumArtist: 'A',
    album: 'X',
    genre: 'G',
    duration: 1,
    size: 1,
    lastModified: 0,
    searchText: id,
    favorite: 0,
    playCount: 0,
    addedAt: 0,
    ...extra,
  };
}

function remoteEnvelope(exportedAt: string, tracks: unknown[] = []) {
  return {
    app: 'aura-music',
    appVersion: 'test',
    schemaVersion: 2,
    exportedAt,
    data: { playlists: [], favorites: [], history: [], settings: {}, tracks },
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  fake.remote.payload = null;
  useSyncStore.setState({
    enabled: true,
    accountEmail: 'persona@example.com',
    lastSyncAt: null,
    fileId: null,
    encrypted: false,
  });
});

describe('syncNow — publicar el índice de la biblioteca', () => {
  it('publica el audio subido aunque no haya playlists ni reproducciones', async () => {
    // El caso real: el índice remoto es de este mismo dispositivo y no hay
    // ningún cambio "clásico" que delate que se subió música.
    const yaSincronizado = '2026-07-26T10:00:00.000Z';
    useSyncStore.setState({ lastSyncAt: yaSincronizado });
    fake.remote.payload = remoteEnvelope(yaSincronizado);
    await db.tracks.put(track('t1', { driveFileId: 'drive-1' }));

    const result = await syncNow();

    expect(result.action).not.toBe('up-to-date');
    const published = (fake.remote.payload as { data: { tracks: { id: string }[] } }).data;
    expect(published.tracks.map((t) => t.id)).toEqual(['t1']);
  });

  it('no publica de más si el índice remoto ya menciona lo subido', async () => {
    const yaSincronizado = '2026-07-26T10:00:00.000Z';
    useSyncStore.setState({ lastSyncAt: yaSincronizado });
    fake.remote.payload = remoteEnvelope(yaSincronizado, [
      { ...track('t1'), driveFileId: 'drive-1' },
    ]);
    await db.tracks.put(track('t1', { driveFileId: 'drive-1' }));

    expect((await syncNow()).action).toBe('up-to-date');
  });

  it('una biblioteca recién escaneada cuenta como cambio local', async () => {
    const yaSincronizado = '2026-07-26T10:00:00.000Z';
    useSyncStore.setState({ lastSyncAt: yaSincronizado });
    fake.remote.payload = remoteEnvelope(yaSincronizado);
    // Sin subir (no hay driveFileId), pero añadida después de la última sync.
    await db.tracks.put(track('t1', { addedAt: Date.parse('2026-07-26T12:00:00.000Z') }));

    expect((await syncNow()).action).not.toBe('up-to-date');
  });

  it('trae las pistas nuevas aunque el índice remoto parezca viejo por el reloj', async () => {
    // El caso real: el teléfono sube y publica, pero su reloj va por detrás del
    // PC. Comparando solo `exportedAt` contra `lastSyncAt`, el PC descartaría
    // el índice nuevo — y encima publicaría el suyo, con menos pistas.
    useSyncStore.setState({ lastSyncAt: '2026-07-27T12:00:00.000Z' });
    fake.remote.payload = remoteEnvelope('2026-07-27T11:55:00.000Z', [
      { ...track('nueva'), driveFileId: 'drive-nueva' },
    ]);

    const result = await syncNow();

    expect(await db.tracks.get('nueva')).toBeDefined();
    expect(result.action).not.toBe('up-to-date');
  });

  it('no borra del índice remoto lo que este dispositivo aún no tiene', async () => {
    useSyncStore.setState({ lastSyncAt: '2026-07-27T12:00:00.000Z' });
    fake.remote.payload = remoteEnvelope('2026-07-27T11:55:00.000Z', [
      { ...track('a'), driveFileId: 'd-a' },
      { ...track('b'), driveFileId: 'd-b' },
    ]);
    await db.tracks.put(track('a', { driveFileId: 'd-a' }));

    await syncNow();

    const published = (fake.remote.payload as { data: { tracks: { id: string }[] } }).data;
    expect(published.tracks.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });

  it('sube por primera vez cuando no hay nada remoto', async () => {
    await db.tracks.put(track('t1', { driveFileId: 'drive-1' }));

    expect((await syncNow()).action).toBe('pushed');
    expect(fake.remote.payload).not.toBeNull();
  });
});
