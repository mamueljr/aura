import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { getTrackFile, setCloudResolver } from '@/infrastructure/fs/fileSystem';
import { saveTrackToOpfs } from '@/infrastructure/fs/opfs';

import { decryptBlobIfNeeded, encryptBlob, loadKey } from './crypto';
import { provider } from './provider';

/**
 * Aura Sync — biblioteca de música en la nube (Fase B, subida).
 *
 * Sube el audio de cada pista como archivo individual al `appDataFolder` del
 * usuario y guarda su referencia en el registro del track. Los bytes NUNCA
 * viajan dentro del snapshot JSON: ahí solo va el `driveFileId`.
 *
 * **Reanudable por diseño**: se salta las pistas que ya tienen `driveFileId`,
 * así que una biblioteca entera no depende de una sola sesión. Un fallo en una
 * pista no detiene a las demás.
 */

/** Qué hay subido y qué falta, para que el usuario sepa en qué se mete. */
export interface LibraryUploadStats {
  total: number;
  uploaded: number;
  pending: number;
  /** Bytes de lo que falta por subir. */
  pendingBytes: number;
  /** Bytes de toda la biblioteca. */
  totalBytes: number;
}

export async function libraryUploadStats(): Promise<LibraryUploadStats> {
  const tracks = await db.tracks.toArray();
  const pending = tracks.filter((track) => !track.driveFileId);
  return {
    total: tracks.length,
    uploaded: tracks.length - pending.length,
    pending: pending.length,
    pendingBytes: pending.reduce((sum, track) => sum + (track.size ?? 0), 0),
    totalBytes: tracks.reduce((sum, track) => sum + (track.size ?? 0), 0),
  };
}

export interface UploadProgress {
  done: number;
  total: number;
  /** Título de la pista en curso, para la UI. */
  current: string;
}

export interface UploadReport {
  uploaded: number;
  /** Pistas cuyo archivo no está disponible en ESTE dispositivo. */
  unavailable: number;
  failed: number;
}

/**
 * Sube las pistas que aún no están en la nube.
 *
 * Las que no tienen copia accesible aquí (sin OPFS y sin permiso de carpeta) se
 * cuentan como `unavailable` y se dejan para el dispositivo que sí las tenga:
 * no son un error.
 */
export async function uploadLibrary(
  onProgress?: (progress: UploadProgress) => void,
  shouldStop?: () => boolean,
): Promise<UploadReport> {
  const blobs = provider.blobs;
  if (!blobs) return { uploaded: 0, unavailable: 0, failed: 0 };

  await provider.getAccessToken({ interactive: true });

  const pending = (await db.tracks.toArray()).filter((track) => !track.driveFileId);
  const secret = await loadKey();
  const report: UploadReport = { uploaded: 0, unavailable: 0, failed: 0 };

  for (const [index, track] of pending.entries()) {
    if (shouldStop?.()) break;
    onProgress?.({ done: index, total: pending.length, current: track.title });

    let file: File;
    try {
      file = await getTrackFile(track);
    } catch {
      report.unavailable += 1;
      continue;
    }

    try {
      const payload = secret ? await encryptBlob(file, secret.key) : file;
      const ref = await blobs.put(payload, { name: `track-${track.id}` });
      await db.tracks.update(track.id, { driveFileId: ref });
      report.uploaded += 1;
    } catch (error) {
      console.warn(`No se pudo subir "${track.title}":`, error);
      report.failed += 1;
    }
  }

  onProgress?.({ done: pending.length, total: pending.length, current: '' });
  return report;
}

/** Elimina de la nube el audio de una pista (p. ej. al quitarla de la biblioteca). */
export async function removeUploadedTrack(track: Track): Promise<void> {
  if (!track.driveFileId || !provider.blobs) return;
  await provider.blobs.remove(track.driveFileId);
  await db.tracks.update(track.id, { driveFileId: undefined });
}

// ---------- Descarga (el otro dispositivo) ----------

/**
 * Baja el audio de una pista que solo existe en la nube y **lo guarda en OPFS**,
 * así la siguiente reproducción ya es local y funciona sin conexión.
 *
 * Devuelve `null` en vez de lanzar: es el último recurso de `getTrackFile`, y
 * si falla debe prevalecer el error original (sin conexión, sin permiso…).
 */
export async function downloadTrackFromCloud(track: Track): Promise<File | null> {
  if (!track.driveFileId || !provider.blobs) return null;

  try {
    const raw = await provider.blobs.get(track.driveFileId);
    const secret = await loadKey();
    // Los archivos subidos antes de activar el cifrado no llevan cabecera y
    // pasan tal cual.
    const blob = await decryptBlobIfNeeded(raw, secret?.key ?? null);
    const file = new File([blob], track.fileName, { type: blob.type || 'audio/mpeg' });

    if (await saveTrackToOpfs(track.folderId, track.path, file)) {
      await db.tracks.update(track.id, { opfs: 1 });
    }
    return file;
  } catch (error) {
    console.warn(`No se pudo descargar "${track.title}" de la nube:`, error);
    return null;
  }
}

/** Conecta la descarga bajo demanda con el resolutor de archivos. */
export function registerCloudResolver(): void {
  setCloudResolver(downloadTrackFromCloud);
}
