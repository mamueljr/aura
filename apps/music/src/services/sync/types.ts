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
  /** Incluye las borradas (con `deletedAt`), para que el borrado se propague. */
  playlists: Playlist[];
  /**
   * Ids de las pistas favoritas (v1) — se conserva por compatibilidad al leer
   * respaldos antiguos. Lo que se escribe ahora es `favoriteMarks`.
   */
  favorites: string[];
  /**
   * Estado del favorito con su fecha (v3). Permite propagar también el
   * *quitar* un favorito, que con una simple lista de ids era imposible.
   */
  favoriteMarks?: Array<{ id: string; favorite: 0 | 1; at: number }>;
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
 * - v2 añadió `tracks` (biblioteca en la nube).
 * - v3 añade `favoriteMarks` y las lápidas de playlists (propagar borrados).
 *
 * Los respaldos anteriores se siguen leyendo: los campos nuevos son opcionales
 * y `favorites` se mantiene como respaldo de lectura.
 */
export const SNAPSHOT_SCHEMA_VERSION = 3;

/** Días que se conserva una lápida antes de purgarla. */
export const TOMBSTONE_RETENTION_DAYS = 30;
