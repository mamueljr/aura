import { db } from '@/infrastructure/db/db';
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
