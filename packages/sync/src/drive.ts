import type { SyncPayload, SyncProvider } from '@aura/core/sync'

/**
 * Aura Sync — provider de Google Drive.
 *
 * Implementa `SyncProvider` moviendo payloads y binarios opacos contra la
 * carpeta oculta de la app (`appDataFolder`) en el Drive DEL USUARIO, vía OAuth2
 * en el navegador (Google Identity Services) y la API REST v3. Sin backend.
 *
 * Es una fábrica, no un singleton: cada app trae su propio `clientId` y decide
 * dónde guardar el caché del id de archivo (normalmente su store persistido).
 * El token vive en memoria de cada provider, nunca se persiste.
 *
 * `key` se usa tal cual como nombre del archivo remoto.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const TOKEN_TIMEOUT_MS = 15_000

// Tipos mínimos de GIS. Se declaran aquí (y no como `interface Window` global)
// para no imponerle nada al scope global de las apps que consuman el paquete.
interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface GoogleTokenClient {
  requestAccessToken(config?: { prompt?: '' | 'consent' }): void
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type: string; message?: string }) => void
    use_fedcm_for_prompt?: boolean
    hint?: string
  }): GoogleTokenClient
  revoke(token: string, callback?: () => void): void
}

function gis(): GoogleOAuth2 | undefined {
  return (window as unknown as { google?: { accounts: { oauth2: GoogleOAuth2 } } }).google
    ?.accounts.oauth2
}

/** Fallo de autenticación silenciosa: requiere interacción del usuario. */
export class SyncAuthError extends Error {
  constructor(message = 'Se requiere iniciar sesión con Google de nuevo.') {
    super(message)
    this.name = 'SyncAuthError'
  }
}

let gisPromise: Promise<void> | null = null

/** Carga el script de Google Identity Services (compartido con otras integraciones de Google). */
export function loadGis(): Promise<void> {
  if (gis()) return Promise.resolve()
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

export interface DriveProviderConfig {
  /** Client ID de OAuth de la app. */
  clientId: string
  /** Correo ya conocido, para saltar el selector de cuenta. */
  getAccountHint?: () => string | null
  /** Caché del id del archivo remoto: evita re-buscarlo en cada arranque. */
  getFileId?: () => string | null
  setFileId?: (id: string | null) => void
}

/** `SyncProvider` de Drive más el acceso al token, que la orquestación usa como pre-vuelo. */
export interface DriveProvider extends SyncProvider<Blob> {
  getAccessToken(opts?: { interactive?: boolean }): Promise<string>
}

export function createDriveProvider(config: DriveProviderConfig): DriveProvider {
  let cachedToken: { value: string; expiresAt: number } | null = null

  function requestToken(prompt: '' | 'consent'): Promise<string> {
    return new Promise((resolve, reject) => {
      const oauth2 = gis()
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

      const knownEmail = config.getAccountHint?.() ?? null
      const client = oauth2.initTokenClient({
        client_id: config.clientId,
        scope: SCOPE,
        // FedCM: el re-canje silencioso de tokens deja de depender de cookies
        // de terceros (Chrome las bloquea cada vez más), que era la causa de
        // que pidiera reconectar en cada recarga.
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

  async function getAccessToken(opts?: { interactive?: boolean }): Promise<string> {
    if (!config.clientId) {
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

  async function findFileId(name: string): Promise<string | null> {
    const cached = config.getFileId?.() ?? null
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
    if (id) config.setFileId?.(id)
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

  async function downloadBlob(fileId: string): Promise<Blob> {
    const response = await authFetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { method: 'GET' },
    )
    return response.blob()
  }

  /**
   * Lista todo lo que hay en `appDataFolder`, paginando hasta el final.
   *
   * Ojo: la carpeta es de la *aplicación OAuth*, no de una app concreta del
   * ecosistema, así que aquí aparecen también los archivos de las demás.
   */
  async function listAppDataFiles(): Promise<
    Array<{ ref: string; name: string; size: number }>
  > {
    const files: Array<{ ref: string; name: string; size: number }> = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        spaces: 'appDataFolder',
        fields: 'nextPageToken, files(id, name, size)',
        pageSize: '1000',
      })
      if (pageToken) params.set('pageToken', pageToken)

      const response = await authFetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        { method: 'GET' },
      )
      const data = (await response.json()) as {
        nextPageToken?: string
        files?: { id: string; name: string; size?: string }[]
      }
      for (const file of data.files ?? []) {
        files.push({ ref: file.id, name: file.name, size: Number(file.size ?? 0) })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    return files
  }

  /** Elimina un archivo; no rompe el flujo si ya no existe o falla la red. */
  async function deleteDriveFile(fileId: string): Promise<void> {
    try {
      await authFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('No se pudo eliminar un archivo de Drive:', error)
    }
  }

  return {
    id: 'google-drive',
    getAccessToken,

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
      const id = await uploadDriveFile(
        key,
        new Blob([JSON.stringify(payload)], { type: 'application/json' }),
        config.getFileId?.() ?? null,
      )
      config.setFileId?.(id)
    },

    async remove(key) {
      const fileId = await findFileId(key)
      if (fileId) await deleteDriveFile(fileId)
    },

    async connect(opts) {
      await getAccessToken({ interactive: true, ...opts })
      const response = await authFetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        method: 'GET',
      })
      const data = (await response.json()) as { email?: string }
      return data.email ?? 'cuenta de Google'
    },

    disconnect() {
      const token = cachedToken?.value
      if (token) gis()?.revoke(token)
      cachedToken = null
    },

    blobs: {
      put: (blob, opts) =>
        uploadDriveFile(
          opts?.name ?? `aura-${crypto.randomUUID()}`,
          blob,
          opts?.ref ?? null,
        ),
      get: (ref) => downloadBlob(ref),
      remove: (ref) => deleteDriveFile(ref),
      list: listAppDataFiles,
    },
  }
}
