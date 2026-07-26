import { db } from '@/infrastructure/db/db';

import type { SyncSnapshot } from './types';

/**
 * Snapshot portable de Aura Music: lo que vale la pena replicar entre
 * dispositivos y, sobre todo, lo que no se puede rehacer si se borra el
 * navegador.
 *
 * **Qué NO va aquí y por qué:**
 * - `tracks` (índice de la biblioteca), `albums`/`artists`/`genres` y `covers`:
 *   se regeneran escaneando la carpeta. Pesados y redundantes.
 * - `folders`: guardan `FileSystemDirectoryHandle`, que es propio del
 *   dispositivo y no viaja.
 * - `playbackState`: "qué suena ahora" es de este dispositivo.
 * - Los archivos de audio: son la Fase B (biblioteca en la nube).
 */
export async function exportSnapshot(): Promise<SyncSnapshot> {
  const [playlists, tracks, settings] = await Promise.all([
    db.playlists.toArray(),
    db.tracks.toArray(),
    db.settings.toArray(),
  ]);

  return {
    playlists,
    favorites: tracks.filter((track) => track.favorite === 1).map((track) => track.id),
    history: tracks
      .filter((track) => track.playCount > 0 || track.lastPlayedAt != null)
      .map(({ id, playCount, lastPlayedAt }) => ({ id, playCount, lastPlayedAt })),
    settings: Object.fromEntries(settings.map((entry) => [entry.key, entry.value])),
  };
}

/** Cuántos registros cambiaron al fusionar (para informar al usuario). */
export interface MergeReport {
  playlists: number;
  favorites: number;
  history: number;
  settings: number;
}

/**
 * Fusiona un snapshot remoto sobre lo local. Cada colección usa la regla que
 * le corresponde:
 *
 * - **playlists**: última-escritura-gana por `updatedAt`, registro a registro.
 *   Las que solo existen en el remoto se insertan.
 * - **history**: monotónico — `playCount` y `lastPlayedAt` se quedan con el
 *   máximo de ambos lados. Es lo correcto para contadores: así no se pierden
 *   reproducciones hechas en el otro dispositivo.
 * - **favorites**: unión. Sin marca de tiempo por pista no se puede distinguir
 *   "lo quité" de "el otro no lo tenía", y perder un favorito molesta más que
 *   conservar uno de más.
 * - **settings**: solo se rellenan las claves ausentes; las locales mandan,
 *   porque son preferencias de ESTE dispositivo.
 *
 * ⚠️ Limitación conocida: sin tombstones, borrar una playlist o quitar un
 * favorito no se propaga — puede reaparecer desde el otro dispositivo.
 */
export async function mergeSnapshot(remote: SyncSnapshot): Promise<MergeReport> {
  const report: MergeReport = { playlists: 0, favorites: 0, history: 0, settings: 0 };

  await db.transaction('rw', [db.playlists, db.tracks, db.settings], async () => {
    for (const incoming of remote.playlists ?? []) {
      if (!incoming?.id) continue;
      const local = await db.playlists.get(incoming.id);
      if (!local || (incoming.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
        await db.playlists.put(incoming);
        report.playlists += 1;
      }
    }

    for (const entry of remote.history ?? []) {
      if (!entry?.id) continue;
      const local = await db.tracks.get(entry.id);
      if (!local) continue; // la pista no existe en este dispositivo
      const playCount = Math.max(local.playCount ?? 0, entry.playCount ?? 0);
      const lastPlayedAt = Math.max(local.lastPlayedAt ?? 0, entry.lastPlayedAt ?? 0);
      if (playCount !== local.playCount || lastPlayedAt !== (local.lastPlayedAt ?? 0)) {
        await db.tracks.update(entry.id, {
          playCount,
          ...(lastPlayedAt > 0 ? { lastPlayedAt } : {}),
        });
        report.history += 1;
      }
    }

    for (const id of remote.favorites ?? []) {
      const local = await db.tracks.get(id);
      if (!local || local.favorite === 1) continue;
      await db.tracks.update(id, { favorite: 1 });
      report.favorites += 1;
    }

    for (const [key, value] of Object.entries(remote.settings ?? {})) {
      if ((await db.settings.get(key)) != null) continue;
      await db.settings.put({ key, value });
      report.settings += 1;
    }
  });

  return report;
}

/** Total de registros tocados, para el mensaje de la UI. */
export function totalMerged(report: MergeReport): number {
  return report.playlists + report.favorites + report.history + report.settings;
}
