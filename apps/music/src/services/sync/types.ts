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
}

/** Versión del esquema del snapshot; se sube ante cambios incompatibles. */
export const SNAPSHOT_SCHEMA_VERSION = 1;
