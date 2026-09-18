import type { Playlist, SmartPlaylistKind, SmartPlaylistRule, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { downloadBlob, hash53 } from '@/lib/utils';
import { normalize } from '@/services/library/dedupe';

function newId(name: string) {
  return hash53(`playlist::${name}::${Date.now()}::${Math.random()}`);
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const playlist: Playlist = {
    id: newId(name),
    name: name.trim(),
    description: description?.trim() || undefined,
    trackIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.playlists.add(playlist);
  return playlist;
}

// ── Smart playlists ───────────────────────────────────────────────────

/** Nombre canónico (viaja en sync); la UI lo traduce por `playlist.smart.kind`. */
export const SMART_PLAYLIST_LABELS: Record<SmartPlaylistKind, string> = {
  recentlyAdded: 'Recently added',
  mostPlayed: 'Most played',
  neverPlayed: 'Never played',
};

export const SMART_PLAYLIST_LIMIT = 50;

/**
 * Deriva los `trackIds` de una playlist inteligente. No se guardan: la lista
 * se recalcula en cada lectura para que "añadidas recientemente" nunca se quede
 * vieja.
 */
export async function resolveSmartTrackIds(rule: SmartPlaylistRule): Promise<string[]> {
  const limit = rule.limit ?? SMART_PLAYLIST_LIMIT;
  switch (rule.kind) {
    case 'recentlyAdded':
      return (await db.tracks.orderBy('addedAt').reverse().limit(limit).toArray()).map(
        (track) => track.id,
      );
    case 'mostPlayed':
      return (await db.tracks.where('playCount').above(0).reverse().limit(limit).toArray()).map(
        (track) => track.id,
      );
    case 'neverPlayed': {
      const tracks = await db.tracks.where('playCount').equals(0).toArray();
      return tracks
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, limit)
        .map((track) => track.id);
    }
  }
}

export async function createSmartPlaylist(rule: SmartPlaylistRule): Promise<Playlist> {
  const playlist: Playlist = {
    id: hash53(`playlist::smart::${Date.now()}::${Math.random()}`),
    name: SMART_PLAYLIST_LABELS[rule.kind],
    trackIds: [],
    smart: rule,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.playlists.add(playlist);
  return playlist;
}

export async function renamePlaylist(id: string, name: string, description?: string) {
  await db.playlists.update(id, {
    name: name.trim(),
    description: description?.trim() || undefined,
    updatedAt: Date.now(),
  });
}

/**
 * Borra dejando lápida (`deletedAt`) en vez de eliminar la fila: así el borrado
 * viaja a los demás dispositivos. Sin esto, el otro lado volvería a mandar la
 * playlist en la siguiente sincronización y reaparecería.
 */
export async function deletePlaylist(id: string) {
  const now = Date.now();
  await db.playlists.update(id, { deletedAt: now, updatedAt: now, trackIds: [] });
}

export async function duplicatePlaylist(id: string, copySuffix: string): Promise<Playlist | null> {
  const source = await db.playlists.get(id);
  if (!source) return null;
  const copy: Playlist = {
    ...source,
    id: newId(source.name),
    name: `${source.name} (${copySuffix})`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.playlists.add(copy);
  return copy;
}

export async function addTracksToPlaylist(id: string, trackIds: string[]) {
  const playlist = await db.playlists.get(id);
  if (!playlist || playlist.smart) return;
  const existing = new Set(playlist.trackIds);
  const additions = trackIds.filter((tid) => !existing.has(tid));
  if (additions.length === 0) return;
  await db.playlists.update(id, {
    trackIds: [...playlist.trackIds, ...additions],
    updatedAt: Date.now(),
  });
}

export async function removeTrackAt(id: string, index: number) {
  const playlist = await db.playlists.get(id);
  if (!playlist || playlist.smart) return;
  const trackIds = playlist.trackIds.filter((_, i) => i !== index);
  await db.playlists.update(id, { trackIds, updatedAt: Date.now() });
}

export async function moveTrack(id: string, from: number, to: number) {
  const playlist = await db.playlists.get(id);
  if (!playlist || playlist.smart || from === to) return;
  const trackIds = [...playlist.trackIds];
  const [moved] = trackIds.splice(from, 1);
  trackIds.splice(to, 0, moved);
  await db.playlists.update(id, { trackIds, updatedAt: Date.now() });
}

async function playlistTrackIds(playlist: Playlist): Promise<string[]> {
  return playlist.smart ? resolveSmartTrackIds(playlist.smart) : playlist.trackIds;
}

export async function exportPlaylistM3U(id: string) {
  const playlist = await db.playlists.get(id);
  if (!playlist) return;
  const tracks = (await db.tracks.bulkGet(await playlistTrackIds(playlist))).filter(
    (t): t is Track => !!t,
  );
  const lines = ['#EXTM3U'];
  for (const track of tracks) {
    lines.push(`#EXTINF:${Math.round(track.duration)},${track.artist} - ${track.title}`);
    lines.push(track.path);
  }
  downloadBlob(new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' }), `${playlist.name}.m3u8`);
}

export async function exportPlaylistJSON(id: string) {
  const playlist = await db.playlists.get(id);
  if (!playlist) return;
  const tracks = (await db.tracks.bulkGet(await playlistTrackIds(playlist))).filter(
    (t): t is Track => !!t,
  );
  const payload = {
    format: 'aura-music-playlist',
    version: 1,
    name: playlist.name,
    description: playlist.description,
    exportedAt: new Date().toISOString(),
    tracks: tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      path: track.path,
    })),
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `${playlist.name}.json`,
  );
}

// ── Import ────────────────────────────────────────────────────────────

export interface PlaylistImportEntry {
  /** Ruta relativa o absoluta de la pista, si el formato la trae. */
  path?: string;
  title: string;
  artist?: string;
  duration?: number;
}

export interface PlaylistImportReport {
  playlistId: string;
  name: string;
  matched: number;
  missed: number;
}

/** Huella de título+artista+duración: la identidad sin álbum ni ruta. */
function matchKey(entry: PlaylistImportEntry): string | null {
  const title = normalize(entry.title);
  if (!title || !(entry.duration && entry.duration > 0)) return null;
  return hash53(
    ['match', title, normalize(entry.artist ?? ''), Math.round(entry.duration)].join('::'),
  );
}

/**
 * Resuelve las entradas importadas a ids de pistas locales.
 *
 * Orden de coincidencia: ruta exacta → nombre de archivo → título+artista+duración.
 * La ruta gana porque es la única señal inequívoca cuando la misma canción existe
 * en dos carpetas distintas.
 */
async function resolveTrackIds(
  entries: PlaylistImportEntry[],
): Promise<{ ids: string[]; missed: number }> {
  const tracks = await db.tracks.toArray();
  const byPath = new Map<string, Track>();
  const byFileName = new Map<string, Track>();
  const byMatch = new Map<string, Track>();

  for (const track of tracks) {
    if (track.path) byPath.set(normalize(track.path), track);
    if (track.fileName) byFileName.set(normalize(track.fileName), track);
    const key = matchKey({
      title: track.title,
      artist: track.artist,
      duration: track.duration,
    });
    if (key) byMatch.set(key, track);
  }

  const ids: string[] = [];
  let missed = 0;
  for (const entry of entries) {
    let found: Track | undefined;
    if (entry.path) {
      found = byPath.get(normalize(entry.path));
      if (!found) {
        const base = entry.path.split('/').pop();
        if (base) found = byFileName.get(normalize(base));
      }
    }
    if (!found) {
      const key = matchKey(entry);
      if (key) found = byMatch.get(key);
    }
    if (found) ids.push(found.id);
    else missed += 1;
  }
  return { ids, missed };
}

async function createImportedPlaylist(
  name: string,
  description: string | undefined,
  trackIds: string[],
): Promise<Playlist> {
  const playlist: Playlist = {
    id: hash53(`playlist::import::${name}::${Date.now()}::${Math.random()}`),
    name: name.trim() || 'Imported playlist',
    description: description?.trim() || undefined,
    trackIds: [...new Set(trackIds)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.playlists.add(playlist);
  return playlist;
}

interface ParsedPlaylist {
  name: string;
  description?: string;
  entries: PlaylistImportEntry[];
}

export function parseM3U(content: string): ParsedPlaylist {
  const lines = content.split(/\r?\n/);
  const entries: PlaylistImportEntry[] = [];
  let name = '';
  let pending: Partial<PlaylistImportEntry> | null = null;

  const flush = () => {
    if (pending?.title) entries.push({ title: pending.title, ...pending });
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTM3U')) continue;
    if (line.startsWith('#PLAYLIST:')) {
      name = line.slice('#PLAYLIST:'.length).trim();
      continue;
    }
    if (line.startsWith('#EXTINF:')) {
      flush();
      const rest = line.slice('#EXTINF:'.length).trim();
      // `285,Artist - Title` o `285 Artist - Title`
      const comma = rest.indexOf(',');
      const meta = comma >= 0 ? rest.slice(comma + 1).trim() : rest.replace(/^\d+\s*/, '').trim();
      const durationText = comma >= 0 ? rest.slice(0, comma) : rest.match(/^\d+/)?.[0];
      const [artist, ...titleParts] = meta.split(' - ');
      pending = {
        title: (titleParts.join(' - ') || artist || '').trim(),
        artist: titleParts.length ? artist.trim() : undefined,
        duration: durationText ? Number(durationText) : undefined,
      };
      continue;
    }
    if (line.startsWith('#')) continue;
    // Línea de ruta: se asocia al #EXTINF anterior, o va sola.
    if (pending) {
      entries.push({ ...(pending as PlaylistImportEntry), path: line });
      pending = null;
    } else {
      entries.push({ title: line.split('/').pop() ?? line, path: line });
    }
  }
  flush();

  if (!name) name = 'Imported playlist';
  return { name, entries };
}

export function parsePlaylistJSON(content: string): ParsedPlaylist {
  const data = JSON.parse(content) as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name : 'Imported playlist';
  const description = typeof data.description === 'string' ? data.description : undefined;
  const rawTracks = Array.isArray(data.tracks) ? (data.tracks as Record<string, unknown>[]) : [];
  const entries: PlaylistImportEntry[] = rawTracks
    .map((raw) => ({
      path: typeof raw.path === 'string' ? raw.path : undefined,
      title: typeof raw.title === 'string' ? raw.title : '',
      artist: typeof raw.artist === 'string' ? raw.artist : undefined,
      duration: typeof raw.duration === 'number' ? raw.duration : undefined,
    }))
    .filter((entry) => entry.title);
  return { name, description, entries };
}

export async function importPlaylistFile(file: File): Promise<PlaylistImportReport> {
  const content = await file.text();
  const isJson = file.name.toLowerCase().endsWith('.json');
  const parsed = isJson ? parsePlaylistJSON(content) : parseM3U(content);

  const { ids, missed } = await resolveTrackIds(parsed.entries);
  const playlist = await createImportedPlaylist(parsed.name, parsed.description, ids);

  return { playlistId: playlist.id, name: playlist.name, matched: ids.length, missed };
}
