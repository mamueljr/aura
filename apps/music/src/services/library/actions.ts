import { rebuildAggregates } from '@/infrastructure/db/aggregates';
import { db } from '@/infrastructure/db/db';
import { deleteTrackFromOpfs } from '@/infrastructure/fs/opfs';
import { player } from '@/services/audio/AudioEngine';
import { pruneOrphanCovers } from '@/services/library/scanner';
import { removeUploadedTrack } from '@/services/sync/library';
import { pushSnapshot } from '@/services/sync/push';
import { usePlayerStore } from '@/stores/playerStore';

export async function toggleFavorite(trackId: string): Promise<void> {
  const track = await db.tracks.get(trackId);
  if (!track) return;
  // `favoriteAt` sella el cambio para que quitar un favorito también se
  // propague: sin marca de tiempo, la fusión no sabría cuál lado es el reciente.
  await db.tracks.update(trackId, {
    favorite: track.favorite ? 0 : 1,
    favoriteAt: Date.now(),
  });

  // Keep the player store copy in sync if this track is loaded.
  const { currentTrack } = usePlayerStore.getState();
  if (currentTrack?.id === trackId) {
    const updated = await db.tracks.get(trackId);
    if (updated) usePlayerStore.setState({ currentTrack: updated });
  }
}

/**
 * Quita una canción de la biblioteca: la borra de `tracks`, de todas las
 * playlists y, si había copia, del almacenamiento del dispositivo y de la
 * nube. Los archivos de música en disco **no** se tocan.
 *
 * Es una operación local por dispositivo: el otro dispositivo conserva su
 * propia copia hasta que decida lo mismo.
 */
export async function removeTrackFromLibrary(trackId: string): Promise<void> {
  const track = await db.tracks.get(trackId);
  if (!track) return;

  // La saca de todas las playlists sin tocar `updatedAt`: es una corrección
  // local, no una edición del usuario, igual que en `dedupeLibrary`.
  const playlists = await db.playlists.toArray();
  const affected = playlists.filter((playlist) => playlist.trackIds.includes(trackId));
  if (affected.length > 0) {
    await db.transaction('rw', [db.playlists], async () => {
      for (const playlist of affected) {
        await db.playlists.update(playlist.id, {
          trackIds: playlist.trackIds.filter((id) => id !== trackId),
        });
      }
    });
  }

  // Libera la copia OPFS y el audio de Drive. El snapshot se publica
  // best-effort para que el índice remoto deje de apuntar a un archivo que
  // acaba de desaparecer.
  if (track.opfs) await deleteTrackFromOpfs(track.folderId, track.path);
  if (track.driveFileId) {
    try {
      await removeUploadedTrack(track);
      void pushSnapshot();
    } catch (error) {
      console.warn('No se pudo liberar el audio subido a Drive:', error);
    }
  }

  await db.tracks.delete(trackId);

  // Si estaba sonando o en la cola, sácala del reproductor.
  const { currentTrack, queue, index } = usePlayerStore.getState();
  const queueIndex = queue.indexOf(trackId);
  if (queueIndex >= 0 || currentTrack?.id === trackId) {
    const nextQueue = queue.filter((id) => id !== trackId);
    if (currentTrack?.id === trackId) {
      player.stop();
      usePlayerStore.setState({ currentTrack: null, queue: nextQueue, index: -1 });
    } else {
      usePlayerStore.setState({
        queue: nextQueue,
        index: queueIndex < index ? index - 1 : index,
      });
    }
  }

  await rebuildAggregates();
  await pruneOrphanCovers();
}