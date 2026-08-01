/**
 * Aura Sync — contrato de sincronización del ecosistema.
 *
 * Las apps Aura son local-first y offline: los datos viven en el dispositivo
 * (IndexedDB). "Aura Sync" es la capa opcional que replica esos datos entre los
 * dispositivos del mismo usuario.
 *
 * Principios del contrato:
 * - **Agnóstico de proveedor**: el destino remoto (Google Drive, WebDAV, un
 *   servidor propio…) se abstrae detrás de `SyncProvider`. El provider solo
 *   mueve payloads y binarios opacos: no conoce el dominio ni las llaves.
 * - **Cifrado opcional (opt-in)**: lo que se guarda es un `SyncPayload`, que es
 *   o un `AuraSyncEnvelope` en claro o un `EncryptedEnvelope`. Aura Home hoy
 *   sincroniza en claro contra la carpeta privada de la app en el Drive del
 *   usuario; activar E2E es una decisión del usuario, no un requisito del
 *   contrato. El cifrado/descifrado es responsabilidad de la app.
 * - **Por app y versionado**: cada app sincroniza su propio `AuraSyncEnvelope`
 *   bajo una clave namespaced; los cambios de esquema suben `schemaVersion`.
 * - **Solo-tipos**: este paquete no aporta runtime. La orquestación (qué lado
 *   gana, cómo se fusiona) vive en cada app.
 *
 * Estado: implementado por `drive-sync.service` de Aura Home.
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

/**
 * Parámetros de derivación de clave a partir de una frase de contraseña.
 *
 * Viajan junto al sobre a propósito: sin ellos, otro dispositivo con la MISMA
 * frase no podría re-derivar la clave. Ninguno es secreto — la sal existe para
 * que dos usuarios con la misma frase no compartan clave, y las iteraciones
 * para encarecer la fuerza bruta.
 */
export interface KdfParams {
  /** Función de derivación, ej. "PBKDF2". */
  name: string
  /** Hash subyacente, ej. "SHA-256". */
  hash: string
  iterations: number
  /** Sal aleatoria, en base64. */
  salt: string
}

/** Sobre cifrado, cuando el usuario activa E2E. El contenido es opaco. */
export interface EncryptedEnvelope {
  /** Identificador del algoritmo, ej. "AES-GCM-256". */
  algorithm: string
  /** Vector de inicialización / nonce, en base64. */
  iv: string
  /** `AuraSyncEnvelope` serializado y cifrado, en base64. */
  ciphertext: string
  /** Derivación usada. Obligatorio si la clave viene de una frase del usuario. */
  kdf?: KdfParams
  /** Pista no sensible para localizar la clave del usuario (nunca la clave). */
  keyHint?: string
}

/**
 * Lo que realmente se guarda en el proveedor: en claro o cifrado.
 *
 * Se distinguen por la presencia de `ciphertext` (`'ciphertext' in payload`).
 * Como `AuraSyncEnvelope` no lleva marca alguna, los archivos escritos antes de
 * existir este contrato siguen leyéndose sin migración.
 */
export type SyncPayload<TData = unknown> = AuraSyncEnvelope<TData> | EncryptedEnvelope

/**
 * Canal opcional para binarios grandes (adjuntos, documentos) que NO deben
 * viajar dentro del snapshot: meterlos en el JSON obligaría a cargarlos enteros
 * en memoria y los inflaría ~33 % al pasarlos a base64.
 *
 * `TBlob` lo fija la app (en el navegador, `Blob`): este paquete no depende de
 * DOM. `put` devuelve la referencia opaca con la que el provider lo localiza
 * después; `ref` reemplaza el binario existente en vez de crear otro, y `name`
 * es una etiqueta legible opcional (los proveedores que no la usen la ignoran).
 */
export interface SyncBlobChannel<TBlob> {
  put(blob: TBlob, opts?: { ref?: string | null; name?: string }): Promise<string>
  get(ref: string): Promise<TBlob>
  remove(ref: string): Promise<void>
  /**
   * Enumera los binarios del proveedor, para detectar los que ya no referencia
   * nadie. Opcional: no todo proveedor puede listar.
   *
   * ⚠️ El espacio puede estar compartido por varias apps del ecosistema, así que
   * quien lo use debe identificar lo suyo por nombre y **no** dar por huérfano
   * todo lo que no reconozca.
   */
  list?(): Promise<Array<{ ref: string; name: string; size: number }>>
}

/**
 * Destino remoto agnóstico. Solo mueve payloads opacos identificados por `key`
 * (namespaced por app/usuario). No conoce el contenido, las llaves ni el dominio.
 *
 * Los miembros opcionales son capacidades: un provider sin autenticación (una
 * carpeta local) omite `connect`/`disconnect`, y uno sin adjuntos omite `blobs`.
 */
export interface SyncProvider<TBlob = never> {
  readonly id: string
  /** Descarga el payload más reciente para `key`, o null si no existe. */
  pull(key: string): Promise<SyncPayload | null>
  /** Sube (crea o reemplaza) el payload para `key`. */
  push(key: string, payload: SyncPayload): Promise<void>
  /** Elimina el payload remoto (p. ej. al desconectar). */
  remove(key: string): Promise<void>
  /** Autentica y devuelve la identidad de la cuenta (email, id…). */
  connect?(opts?: { interactive?: boolean }): Promise<string>
  /** Revoca credenciales y limpia el estado de sesión. */
  disconnect?(): void
  /** Canal de binarios, si el proveedor los soporta. */
  readonly blobs?: SyncBlobChannel<TBlob>
  /**
   * Espacio del proveedor, para avisar antes de subir algo que no cabe.
   * `limit` es null cuando la cuenta no tiene tope conocido.
   */
  quota?(): Promise<{ used: number; limit: number | null }>
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
