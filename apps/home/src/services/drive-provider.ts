import type { SyncPayload, SyncProvider } from '@aura/core/sync'
import { APP_CONFIG } from '@/config/app'
import { useSyncStore } from '@/stores/sync.store'

/**
 * Aura Sync — provider de Google Drive (transporte).
 *
 * Implementa `SyncProvider` de `@aura/core`: mueve payloads y binarios opacos
 * contra la carpeta oculta de la app (`appDataFolder`) en el Drive DEL USUARIO,
 * vía OAuth2 en el navegador (Google Identity Services) y la API REST v3.
 * Sin backend propio.
 *
 * Aquí vive solo el transporte y la autenticación. La orquestación (qué lado
 * gana, cómo se fusiona) está en `drive-sync.service`, que es agnóstico del
 * proveedor y podría correr sobre cualquier otro `SyncProvider`.
 *
 * `key` se usa tal cual como nombre del archivo remoto.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const TOKEN_TIMEOUT_MS = 15_000

/** Fallo de autenticación silenciosa: requiere interacción del usuario. */
export class SyncAuthError extends Error {
  constructor(message = 'Se requiere iniciar sesión con Google de nuevo.') {
    super(message)
    this.name = 'SyncAuthError'
  }
}

// ---------- Carga de GIS y tokens ----------

let gisPromise: Promise<void> | null = null

/** Carga el script de Google Identity Services (compartido con otras integraciones de Google). */
export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisPromise = null
      reject(new Error('No se pudo cargar Google Identity Services.'))
    }
    document.head.appendChild(script)
  })
  return gisPromise
}

let cachedToken: { value: string; expiresAt: number } | null = null

function requestToken(prompt: '' | 'consent'): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) {
      reject(new Error('Google Identity Services no está disponible.'))
      return
    }
    let settled = false
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new SyncAuthError())
      }
    }, TOKEN_TIMEOUT_MS)

    const knownEmail = useSyncStore.getState().accountEmail
    const client = oauth2.initTokenClient({
      client_id: APP_CONFIG.googleClientId,
      scope: SCOPE,
      // FedCM: el re-canje silencioso de tokens deja de depender de
      // cookies de terceros (Chrome las bloquea cada vez más), que era
      // la causa de que pidiera reconectar en cada recarga.
      use_fedcm_for_prompt: true,
      ...(knownEmail ? { hint: knownEmail } : {}),
      callback: (response) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (response.access_token) {
          cachedToken = {
            value: response.access_token,
            expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
          }
          resolve(response.access_token)
        } else {
          reject(new SyncAuthError(response.error))
        }
      },
      error_callback: (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(new SyncAuthError(error.message ?? error.type))
      },
    })
    client.requestAccessToken({ prompt })
  })
}

/** Obtiene un token válido; con `interactive` reintenta pidiendo consentimiento. */
export async function getAccessToken(opts?: { interactive?: boolean }): Promise<string> {
  if (!APP_CONFIG.googleClientId) {
    throw new Error('Falta configurar el Client ID de Google.')
  }
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.value
  }
  await loadGis()
  try {
    return await requestToken('')
  } catch (error) {
    if (opts?.interactive) return requestToken('consent')
    throw error instanceof SyncAuthError ? error : new SyncAuthError()
  }
}

// ---------- Llamadas REST a Drive ----------

async function authFetch(
  input: string,
  init: RequestInit,
  retried = false,
): Promise<Response> {
  const token = await getAccessToken()
  const response = await fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  })
  if (response.status === 401 && !retried) {
    cachedToken = null
    return authFetch(input, init, true)
  }
  if (!response.ok) {
    throw new Error(`Error de Google Drive (${response.status}).`)
  }
  return response
}

/**
 * Localiza el archivo del payload por nombre. El id se cachea en el store
 * persistido: Home sincroniza un único payload, así que ese caché evita una
 * búsqueda en cada arranque.
 */
async function findFileId(name: string): Promise<string | null> {
  const cached = useSyncStore.getState().fileId
  if (cached) return cached
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id)',
    q: `name='${name}'`,
  })
  const response = await authFetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { method: 'GET' },
  )
  const data = (await response.json()) as { files?: { id: string }[] }
  const id = data.files?.[0]?.id ?? null
  if (id) useSyncStore.getState().setFileId(id)
  return id
}

/** Sube (o reemplaza, si fileId) un archivo a la carpeta oculta de la app en Drive. */
async function uploadDriveFile(
  name: string,
  content: Blob,
  fileId: string | null,
): Promise<string> {
  const boundary = `aura_${crypto.randomUUID()}`
  const metadata = fileId ? { name } : { name, parents: ['appDataFolder'] }
  const body = new Blob([
    `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${content.type || 'application/octet-stream'}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ])
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  const response = await authFetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  const data = (await response.json()) as { id: string }
  return data.id
}

async function downloadDriveFileBlob(fileId: string): Promise<Blob> {
  const response = await authFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { method: 'GET' },
  )
  return response.blob()
}

/** Elimina un archivo de Drive; no falla el flujo si ya no existe o hay error de red. */
async function deleteDriveFile(fileId: string): Promise<void> {
  try {
    await authFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.warn('No se pudo eliminar un archivo de Drive:', error)
  }
}

async function fetchUserEmail(): Promise<string> {
  const response = await authFetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    method: 'GET',
  })
  const data = (await response.json()) as { email?: string }
  return data.email ?? 'cuenta de Google'
}

// ---------- El provider ----------

export const driveProvider: SyncProvider<Blob> = {
  id: 'google-drive',

  async pull(key) {
    const fileId = await findFileId(key)
    if (!fileId) return null
    const response = await authFetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { method: 'GET' },
    )
    return (await response.json()) as SyncPayload
  },

  async push(key, payload) {
    const fileId = useSyncStore.getState().fileId
    const id = await uploadDriveFile(
      key,
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      fileId,
    )
    useSyncStore.getState().setFileId(id)
  },

  async remove(key) {
    const fileId = await findFileId(key)
    if (fileId) await deleteDriveFile(fileId)
  },

  async connect(opts) {
    await getAccessToken({ interactive: true, ...opts })
    return fetchUserEmail()
  },

  disconnect() {
    const token = cachedToken?.value
    if (token) window.google?.accounts?.oauth2?.revoke(token)
    cachedToken = null
  },

  blobs: {
    put: (blob, opts) => uploadDriveFile(opts?.name ?? `aura-${crypto.randomUUID()}`, blob, opts?.ref ?? null),
    get: (ref) => downloadDriveFileBlob(ref),
    remove: (ref) => deleteDriveFile(ref),
  },
}
