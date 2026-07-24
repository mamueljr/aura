/**
 * Aura Sync — ESQUELETO del contrato (interfaces, sin implementación aún).
 *
 * Las apps Aura son local-first y offline: los datos viven en el dispositivo
 * (IndexedDB). "Aura Sync" es la capa opcional que replica esos datos entre los
 * dispositivos del mismo usuario, sin que ningún servidor pueda leerlos.
 *
 * Principios del contrato:
 * - **Agnóstico de proveedor**: el destino remoto (Google Drive, WebDAV, un
 *   servidor propio…) se abstrae detrás de `SyncProvider`. Hoy Aura Home ya
 *   sincroniza con Drive; en el futuro implementará esta interfaz.
 * - **Cifrado extremo a extremo**: lo que viaja al proveedor es un
 *   `EncryptedEnvelope` opaco. La clave la deriva el usuario; el proveedor solo
 *   ve bytes. El cifrado/descifrado es responsabilidad de la app, no del contrato.
 * - **Por app y versionado**: cada app sincroniza su propio `AuraSyncEnvelope`
 *   bajo una clave namespaced; los cambios de esquema suben `schemaVersion`.
 *
 * NADA de esto está implementado todavía. Es el punto de acuerdo para que las
 * apps del ecosistema converjan hacia una misma capa de sincronización.
 */

/** Snapshot portable de los datos de una app (texto claro, antes de cifrar). */
export interface AuraSyncEnvelope<TData = unknown> {
  /** Slug de la app de origen, ej. "aura-home". */
  app: string
  appVersion: string
  /** Versión del esquema de `data`; se sube ante cambios incompatibles. */
  schemaVersion: number
  /** ISO-8601 del momento de exportación. */
  exportedAt: string
  data: TData
}

/** Sobre cifrado que realmente viaja al proveedor. El contenido es opaco. */
export interface EncryptedEnvelope {
  /** Identificador del algoritmo, ej. "AES-GCM-256". */
  algorithm: string
  /** Vector de inicialización / nonce, en base64. */
  iv: string
  /** `AuraSyncEnvelope` serializado y cifrado, en base64. */
  ciphertext: string
  /** Pista no sensible para localizar la clave del usuario (nunca la clave). */
  keyHint?: string
}

/**
 * Destino remoto agnóstico. Solo mueve sobres opacos identificados por `key`
 * (namespaced por app/usuario). No conoce el contenido ni las llaves.
 */
export interface SyncProvider {
  readonly id: string
  /** Descarga el sobre más reciente para `key`, o null si no existe. */
  pull(key: string): Promise<EncryptedEnvelope | null>
  /** Sube (crea o reemplaza) el sobre para `key`. */
  push(key: string, envelope: EncryptedEnvelope): Promise<void>
  /** Elimina el sobre remoto (p. ej. al desconectar). */
  remove(key: string): Promise<void>
}

/** Resultado de una operación de sincronización. */
export type SyncResult =
  | { action: 'pushed' | 'up-to-date'; syncedAt: string }
  | { action: 'pulled' | 'merged'; syncedAt: string; imported: number }
  | { action: 'conflict'; syncedAt: string; detail: string }
  | { action: 'error'; error: string }

/** Estado observable de la sincronización de una app. */
export interface SyncState {
  enabled: boolean
  providerId: string | null
  /** Identidad de la cuenta en el proveedor (email, id…), si aplica. */
  account: string | null
  lastSyncAt: string | null
}
