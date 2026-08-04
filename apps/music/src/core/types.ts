/**
 * Domain types for Aura Music.
 * These are storage- and framework-agnostic: the Dexie schema, the audio
 * engine and the UI all consume these shapes.
 */

export interface Track {
  /** Stable id: hash of `${folderId}:${path}` */
  id: string;
  folderId: number;
  /** Path relative to the library folder root */
  path: string;
  fileName: string;
  title: string;
  artist: string;
  albumArtist: string;
  album: string;
  genre: string;
  year?: number;
  trackNo?: number;
  discNo?: number;
  /** Seconds */
  duration: number;
  size: number;
  lastModified: number;
  coverId?: string;
  /** Lower-cased "title artist album genre" used for instant search */
  searchText: string;
  /** 0 | 1 so Dexie can index it */
  favorite: 0 | 1;
  /**
   * Cuándo se cambió `favorite` por última vez. Sin esta marca la fusión no
   * puede distinguir "lo quité aquí" de "el otro dispositivo aún no lo tenía",
   * y quitar un favorito nunca se propagaría.
   */
  favoriteAt?: number;
  playCount: number;
  lastPlayedAt?: number;
  addedAt: number;
  /** 1 when a copy lives in the app's private storage (OPFS) */
  opfs?: 0 | 1;
  /**
   * Id of the audio file in Google Drive (appDataFolder), once uploaded.
   * Lets another device fetch the audio without having the original folder.
   * The bytes never travel inside the sync snapshot — only this reference.
   */
  driveFileId?: string;
}

export interface AlbumEntry {
  /** hash of `${albumArtist}::${album}` */
  id: string;
  name: string;
  artist: string;
  year?: number;
  coverId?: string;
  trackCount: number;
  totalDuration: number;
}

export interface ArtistEntry {
  /** hash of artist name */
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  coverId?: string;
}

export interface GenreEntry {
  /** hash of genre name */
  id: string;
  name: string;
  trackCount: number;
  coverId?: string;
}

export interface CoverArt {
  /** hash of the image bytes (deduplicated across an album) */
  id: string;
  /**
   * Ausente cuando la portada llegó por Aura Sync y aún no se ha descargado:
   * la ficha existe (sabemos que hay carátula y dónde), la imagen se baja al
   * pintarla por primera vez.
   */
  blob?: Blob;
  /** Id de la imagen en Drive, si está subida. */
  driveFileId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  /**
   * Tombstone: cuándo se borró. La fila se conserva para que el borrado viaje
   * a los demás dispositivos; sin esto la playlist reaparecería en la siguiente
   * sincronización. Se purga pasado `TOMBSTONE_RETENTION_DAYS`.
   */
  deletedAt?: number;
}

/**
 * `cloud`: carpeta sintética de las pistas que llegaron por Aura Sync desde
 * otro dispositivo. No tiene handle ni ruta local; su audio se descarga de
 * Drive bajo demanda.
 */
export type FolderMode = 'fs-access' | 'fallback' | 'cloud';

export interface LibraryFolder {
  id?: number;
  name: string;
  /** Only present in `fs-access` mode (Chromium). Structured-cloneable. */
  handle?: FileSystemDirectoryHandle;
  mode: FolderMode;
  addedAt: number;
  lastScanAt?: number;
  trackCount?: number;
  /** True when every track of this folder has an OPFS copy */
  imported?: boolean;
}

export interface KeyValueEntry {
  key: string;
  value: unknown;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PersistedPlaybackState {
  id: 'current';
  queue: string[];
  /** Original (unshuffled) queue order */
  originalQueue: string[];
  index: number;
  positionSeconds: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

export interface ScanProgress {
  phase: 'idle' | 'discovering' | 'reading' | 'saving' | 'done' | 'error';
  discovered: number;
  processed: number;
  added: number;
  updated: number;
  removed: number;
  /**
   * Filas repetidas que se fundieron con su copia. Se informa aparte de
   * `removed`: aquí no ha desaparecido ninguna canción, solo su duplicado.
   */
  merged: number;
  currentFile?: string;
  error?: string;
}

export interface LyricsLine {
  timeMs?: number;
  text: string;
}

export interface LyricsResult {
  synced: boolean;
  lines: LyricsLine[];
  source: string;
}

/**
 * Aura Sync encryption key (opt-in E2E), stored in its own table.
 *
 * `key` is a **non-extractable** CryptoKey: the browser persists it without
 * ever exposing its bytes, not even to this app. It is kept derived so the
 * automatic sync does not ask for the passphrase on every start.
 *
 * Must NEVER be part of the synced snapshot.
 */
export interface SyncSecret {
  /** Always 'default': one key per device. */
  id: string;
  key: CryptoKey;
  /** Params it was derived with, so another device can rebuild it. */
  kdf: { name: string; hash: string; iterations: number; salt: string };
}
