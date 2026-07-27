import type { Playlist, Track } from '@/core/types';

/**
 * Lo que Aura Music replica entre dispositivos: sus datos irrecuperables.
 *
 * Viaja como `data` dentro de un `AuraSyncEnvelope` de `@aura/core` — el mismo
 * contrato que usa Aura Home. Ver `snapshot.ts` para qué queda fuera y por qué.
 *
 * (Sustituye al contrato de proveedor que había aquí como placeholder: el
 * transporte lo define ahora `SyncProvider` de `@aura/core`.)
 */
export interface SyncSnapshot {
  playlists: Playlist[];
  /** Ids de las pistas marcadas como favoritas. */
  favorites: string[];
  settings: Record<string, unknown>;
  history: Array<Pick<Track, 'id' | 'playCount' | 'lastPlayedAt'>>;
  /**
   * Pistas cuyo audio ya está en la nube (v2). Solo la ficha, nunca los bytes:
   * el otro dispositivo las ve en su biblioteca y descarga el audio al
   * reproducirlas. Se omiten las que no se han subido: sin `driveFileId` no
   * habría forma de escucharlas.
   */
  tracks?: CloudTrack[];
}

/** Ficha de una pista disponible en la nube. */
export type CloudTrack = Omit<Track, 'folderId' | 'opfs'> & { driveFileId: string };

/**
 * Versión del esquema del snapshot.
 * v2 añade `tracks` (biblioteca en la nube). Los respaldos v1 se siguen
 * leyendo: `tracks` es opcional.
 */
export const SNAPSHOT_SCHEMA_VERSION = 2;
