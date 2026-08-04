import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { hash53 } from '@/lib/utils';

/**
 * Una misma canción puede acabar dos veces en la biblioteca: el dispositivo B
 * la recibe por Aura Sync (con el id que le dio A) y además escanea su propia
 * copia en disco, que genera otro id — `trackId` se deriva de `folderId::path`
 * y el `folderId` es el autoincremental de Dexie, propio de cada dispositivo.
 *
 * La identidad real de una canción no está en dónde vive el archivo, así que
 * aquí se deriva del contenido: título, artista, álbum y duración.
 */

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita los acentos: "Canción" == "Cancion"
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Huella de contenido de una pista, o `null` si no hay datos suficientes.
 *
 * Sin título o sin duración no se agrupa: preferimos dejar un duplicado a
 * fusionar dos canciones distintas, que sería irreversible. La duración va
 * redondeada al segundo — es el discriminante fuerte entre versiones (directo,
 * remezcla, edición de radio) que comparten título y álbum.
 */
export function contentKey(track: Track): string | null {
  const title = normalize(track.title);
  if (!title || !(track.duration > 0)) return null;
  return hash53(
    [
      'content',
      title,
      normalize(track.albumArtist || track.artist),
      normalize(track.album),
      Math.round(track.duration),
    ].join('::'),
  );
}

/**
 * De dos filas que son la misma canción, cuál conserva su id.
 *
 * Gana la que ya conoce el resto del ecosistema: la que tiene `driveFileId`
 * viene de otro dispositivo y sus playlists, favoritos e historial la
 * referencian por ese id. Si se quedara el id local, las playlists del otro
 * dispositivo apuntarían a una pista que allí no existe.
 *
 * Con las dos subidas (o ninguna) se ordena por id para que todos los
 * dispositivos elijan lo mismo sin hablar entre ellos.
 */
function pickSurvivor(a: Track, b: Track): [survivor: Track, absorbed: Track] {
  const aShared = !!a.driveFileId;
  const bShared = !!b.driveFileId;
  if (aShared !== bShared) return aShared ? [a, b] : [b, a];
  return a.id <= b.id ? [a, b] : [b, a];
}

/** ¿Esta fila sabe leer el audio de un archivo real de este dispositivo? */
const hasLocalAudio = (track: Track, cloudFolders: Set<number>): boolean =>
  track.opfs === 1 || !cloudFolders.has(track.folderId);

/**
 * Funde `absorbed` dentro de `survivor`. El id es el del superviviente; todo
 * lo demás se queda con el mejor dato de los dos.
 */
function absorb(survivor: Track, absorbed: Track, cloudFolders: Set<number>): Track {
  // La ruta al archivo la aporta la fila que de verdad tiene audio aquí; si
  // ninguna lo tiene, se queda la del superviviente.
  const local = hasLocalAudio(survivor, cloudFolders)
    ? survivor
    : hasLocalAudio(absorbed, cloudFolders)
      ? absorbed
      : survivor;

  // Favorito: gana el cambio más reciente, igual que en la fusión de snapshots.
  const [favorite, favoriteAt] =
    (survivor.favoriteAt ?? 0) >= (absorbed.favoriteAt ?? 0)
      ? [survivor.favorite, survivor.favoriteAt]
      : [absorbed.favorite, absorbed.favoriteAt];

  return {
    ...survivor,
    folderId: local.folderId,
    path: local.path,
    fileName: local.fileName,
    size: local.size,
    lastModified: local.lastModified,
    opfs: local.opfs,
    driveFileId: survivor.driveFileId ?? absorbed.driveFileId,
    coverId: survivor.coverId ?? absorbed.coverId,
    favorite,
    ...(favoriteAt != null ? { favoriteAt } : {}),
    // Monotónico, como el historial del snapshot: nunca se pierde una escucha.
    playCount: Math.max(survivor.playCount ?? 0, absorbed.playCount ?? 0),
    ...(Math.max(survivor.lastPlayedAt ?? 0, absorbed.lastPlayedAt ?? 0) > 0
      ? { lastPlayedAt: Math.max(survivor.lastPlayedAt ?? 0, absorbed.lastPlayedAt ?? 0) }
      : {}),
    addedAt: Math.min(survivor.addedAt ?? Infinity, absorbed.addedAt ?? Infinity),
  };
}

/**
 * Busca canciones repetidas en toda la biblioteca y las funde en una sola fila,
 * arrastrando favoritos, escuchas y referencias de playlist.
 *
 * Es idempotente: pasarla dos veces seguidas no cambia nada. Se llama al
 * terminar un escaneo y al fusionar un snapshot, que son los dos momentos en
 * los que pueden aparecer.
 *
 * @returns cuántas filas se eliminaron por estar repetidas.
 */
export async function dedupeLibrary(): Promise<number> {
  const [tracks, folders] = await Promise.all([db.tracks.toArray(), db.folders.toArray()]);
  const cloudFolders = new Set(
    folders.filter((folder) => folder.mode === 'cloud').map((folder) => folder.id!),
  );

  const byContent = new Map<string, Track>();
  /** Claves con más de una fila: solo esas hay que reescribir. */
  const duplicated = new Set<string>();
  /** id que desaparece → id que se queda */
  const remap = new Map<string, string>();

  for (const track of tracks) {
    const key = contentKey(track);
    if (!key) continue;

    const seen = byContent.get(key);
    if (!seen) {
      byContent.set(key, track);
      continue;
    }

    const [survivor, absorbed] = pickSurvivor(seen, track);
    byContent.set(key, absorb(survivor, absorbed, cloudFolders));
    remap.set(absorbed.id, survivor.id);
    duplicated.add(key);
  }

  if (remap.size === 0) return 0;

  // Con tres copias, la fila que sobrevivió a la primera fusión puede haber
  // sido absorbida por la tercera; `byContent` ya guarda solo la definitiva.
  const merged = [...duplicated].map((key) => byContent.get(key)!);

  // Un id absorbido puede ser a su vez el destino de otro (tres copias de la
  // misma canción); se sigue la cadena hasta el superviviente final.
  const resolve = (id: string): string => {
    let current = id;
    const guard = new Set<string>([id]);
    while (remap.has(current)) {
      const next = remap.get(current)!;
      if (guard.has(next)) break;
      guard.add(next);
      current = next;
    }
    return current;
  };

  await db.transaction('rw', [db.tracks, db.playlists], async () => {
    await db.tracks.bulkPut(merged);
    await db.tracks.bulkDelete([...remap.keys()]);

    for (const playlist of await db.playlists.toArray()) {
      if (!playlist.trackIds?.some((id) => remap.has(id))) continue;
      // Si la playlist tenía las dos copias, ahora sería la misma dos veces.
      const trackIds = [...new Set(playlist.trackIds.map(resolve))];
      // No se toca `updatedAt`: esto es una corrección local, no una edición
      // del usuario, y no debe ganarle a un cambio real del otro dispositivo.
      await db.playlists.put({ ...playlist, trackIds });
    }
  });

  return remap.size;
}
