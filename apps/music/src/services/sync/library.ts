import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { getTrackFile, setCloudResolver } from '@/infrastructure/fs/fileSystem';
import { saveTrackToOpfs } from '@/infrastructure/fs/opfs';

import { decryptBlobIfNeeded, encryptBlob, loadKey } from './crypto';
import { provider } from './provider';
import { pushSnapshot } from './push';

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

/** Espacio libre en Drive, o null si el proveedor no lo sabe o falla la consulta. */
export async function cloudFreeBytes(): Promise<number | null> {
  if (!provider.quota) return null;
  try {
    const { used, limit } = await provider.quota();
    return limit == null ? null : Math.max(0, limit - used);
  } catch (error) {
    // Que no se pueda leer la cuota no debe impedir subir.
    console.warn('No se pudo consultar el espacio de Drive:', error);
    return null;
  }
}

export interface UploadProgress {
  done: number;
  total: number;
  /** Título de la pista en curso, para la UI. */
  current: string;
  /**
   * Velocidad media de subida hasta ahora, o `null` mientras no haya terminado
   * ningún archivo. Sin esto, una subida atascada y una subida lenta se ven
   * exactamente igual: "1 de 16" durante diez minutos.
   */
  bytesPerSecond: number | null;
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

  // En paralelo (moderado): con muchos archivos pequeños manda la latencia de
  // cada petición, no el ancho de banda, así que subir de una en una tarda
  // muchísimo más. Se mantiene bajo para no saturar la red del móvil ni topar
  // con los límites de Drive.
  const CONCURRENCY = 3;
  const queue = [...pending];
  let done = 0;

  // Para saber si el cuello de botella es la red o esta concurrencia hace
  // falta un número, no una impresión.
  const startedAt = Date.now();
  let uploadedBytes = 0;
  const rate = (): number | null => {
    const seconds = (Date.now() - startedAt) / 1000;
    return uploadedBytes > 0 && seconds > 0 ? uploadedBytes / seconds : null;
  };

  // El canal se pasa como parámetro: dentro del closure TypeScript ya no
  // conserva que la comprobación de arriba lo dejó definido.
  async function worker(channel: NonNullable<typeof provider.blobs>): Promise<void> {
    for (;;) {
      if (shouldStop?.()) return;
      const track = queue.shift();
      if (!track) return;

      onProgress?.({
        done,
        total: pending.length,
        current: track.title,
        bytesPerSecond: rate(),
      });

      let file: File;
      try {
        file = await getTrackFile(track);
      } catch {
        report.unavailable += 1;
        done += 1;
        continue;
      }

      try {
        const payload = secret ? await encryptBlob(file, secret.key) : file;
        const ref = await channel.put(payload, { name: `track-${track.id}` });
        await db.tracks.update(track.id, { driveFileId: ref });
        report.uploaded += 1;
        uploadedBytes += payload.size;
      } catch (error) {
        console.warn(`No se pudo subir "${track.title}":`, error);
        report.failed += 1;
      }
      done += 1;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker(blobs)),
  );

  // Las carátulas van después: pesan poco y no deben retrasar el audio.
  await uploadCovers(secret?.key ?? null);

  onProgress?.({
    done: pending.length,
    total: pending.length,
    current: '',
    bytesPerSecond: rate(),
  });

  // Imprescindible, y siempre: los `driveFileId` solo existen en local hasta
  // que se publica el índice. Sin esto el otro dispositivo descarga un snapshot
  // sin pistas y no ve nada, aunque el audio ya esté en la nube. Se publica
  // aunque no se haya subido nada nuevo (el índice puede venir de una sesión
  // anterior) y aunque se haya parado a medias: así el otro dispositivo ve al
  // menos lo que sí está.
  await pushSnapshot();

  return report;
}

/** Elimina de la nube el audio de una pista (p. ej. al quitarla de la biblioteca). */
export async function removeUploadedTrack(track: Track): Promise<void> {
  if (!track.driveFileId || !provider.blobs) return;
  await provider.blobs.remove(track.driveFileId);
  await db.tracks.update(track.id, { driveFileId: undefined });
}

/**
 * Reescribe en su sitio el audio ya subido, cifrado (`key`) o en claro (`null`).
 *
 * Hace falta al cambiar el estado del cifrado: si no, activar dejaría la música
 * subida en claro (contradiciendo lo que promete la UI) y desactivar la dejaría
 * ilegible para siempre.
 *
 * Se apoya en `getTrackFile`, que mientras la clave siga presente puede bajar y
 * descifrar lo que no esté en este dispositivo. Lo que no se consiga obtener se
 * cuenta como `unavailable`; al desactivar, quien llama debe abortar en ese caso.
 */
export async function reuploadTracks(key: CryptoKey | null): Promise<{
  converted: number;
  unavailable: number;
}> {
  const blobs = provider.blobs;
  if (!blobs) return { converted: 0, unavailable: 0 };

  const uploaded = (await db.tracks.toArray()).filter((track) => track.driveFileId);
  let converted = 0;
  let unavailable = 0;

  for (const track of uploaded) {
    try {
      const file = await getTrackFile(track);
      const payload = key ? await encryptBlob(file, key) : file;
      await blobs.put(payload, { ref: track.driveFileId, name: `track-${track.id}` });
      converted += 1;
    } catch (error) {
      console.warn(`No se pudo reescribir el audio de "${track.title}":`, error);
      unavailable += 1;
    }
  }
  return { converted, unavailable };
}

// ---------- Portadas ----------

/**
 * Sube las carátulas de las pistas que están en la nube.
 *
 * Van aparte del audio y deduplicadas por su hash (una por álbum, no por
 * pista), así que pesan poco. Sin esto, un dispositivo que nunca escanea la
 * biblioteca mostraría el degradado generado en todas las canciones.
 */
async function uploadCovers(key: CryptoKey | null): Promise<number> {
  const blobs = provider.blobs;
  if (!blobs) return 0;

  const needed = new Set(
    (await db.tracks.toArray())
      .filter((track) => track.driveFileId && track.coverId)
      .map((track) => track.coverId!),
  );
  if (needed.size === 0) return 0;

  let uploaded = 0;
  for (const coverId of needed) {
    const cover = await db.covers.get(coverId);
    if (!cover?.blob || cover.driveFileId) continue;
    try {
      const payload = key ? await encryptBlob(cover.blob, key) : cover.blob;
      const ref = await blobs.put(payload, { name: `cover-${coverId}` });
      await db.covers.update(coverId, { driveFileId: ref });
      uploaded += 1;
    } catch (error) {
      console.warn(`No se pudo subir una carátula:`, error);
    }
  }
  return uploaded;
}

/**
 * Baja una carátula que llegó por sync y la guarda, para no repetir la descarga.
 * Devuelve `null` si falla: la app cae al degradado generado, que es aceptable.
 */
export async function downloadCoverFromCloud(cover: {
  id: string;
  driveFileId?: string;
}): Promise<Blob | null> {
  if (!cover.driveFileId || !provider.blobs) return null;
  try {
    const raw = await provider.blobs.get(cover.driveFileId);
    const secret = await loadKey();
    const blob = await decryptBlobIfNeeded(raw, secret?.key ?? null);
    await db.covers.update(cover.id, { blob });
    return blob;
  } catch (error) {
    console.warn('No se pudo descargar una carátula:', error);
    return null;
  }
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
