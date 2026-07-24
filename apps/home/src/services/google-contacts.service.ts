import { APP_CONFIG } from '@/config/app'
import { loadGis } from '@/services/drive-sync.service'
import { useSyncStore } from '@/stores/sync.store'

/**
 * Importación de contactos desde Google (People API).
 *
 * Usa un token OAuth propio con scope `contacts.readonly`, separado del de
 * Drive: es de solo lectura y se pide bajo demanda (botón "Importar de
 * Google" en Contactos), no en cada sincronización automática.
 */

const SCOPE = 'https://www.googleapis.com/auth/contacts.readonly'
const TOKEN_TIMEOUT_MS = 15_000
const PAGE_SIZE = 1000
const MAX_PAGES = 10

export class ContactsImportError extends Error {
  constructor(message = 'Se requiere iniciar sesión con Google para importar contactos.') {
    super(message)
    this.name = 'ContactsImportError'
  }
}

export interface GoogleContact {
  resourceName: string
  name: string
  phone?: string
  email?: string
}

interface PersonApiShape {
  resourceName: string
  names?: { displayName?: string }[]
  phoneNumbers?: { value?: string }[]
  emailAddresses?: { value?: string }[]
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
        reject(new ContactsImportError())
      }
    }, TOKEN_TIMEOUT_MS)

    const knownEmail = useSyncStore.getState().accountEmail
    const client = oauth2.initTokenClient({
      client_id: APP_CONFIG.googleClientId,
      scope: SCOPE,
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
          reject(new ContactsImportError(response.error))
        }
      },
      error_callback: (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(new ContactsImportError(error.message ?? error.type))
      },
    })
    client.requestAccessToken({ prompt })
  })
}

async function getAccessToken(): Promise<string> {
  if (!APP_CONFIG.googleClientId) {
    throw new Error('Falta configurar el Client ID de Google.')
  }
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.value
  }
  await loadGis()
  try {
    return await requestToken('')
  } catch {
    return requestToken('consent')
  }
}

function normalize(person: PersonApiShape): GoogleContact | null {
  const name = person.names?.[0]?.displayName?.trim()
  if (!name) return null
  const phone = person.phoneNumbers?.[0]?.value?.trim()
  const email = person.emailAddresses?.[0]?.value?.trim()
  return {
    resourceName: person.resourceName,
    name,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
  }
}

/** Trae los contactos guardados en la cuenta de Google del usuario. */
export async function fetchGoogleContacts(): Promise<GoogleContact[]> {
  const token = await getAccessToken()
  const results: GoogleContact[] = []
  let pageToken: string | undefined
  let page = 0

  do {
    const params = new URLSearchParams({
      personFields: 'names,phoneNumbers,emailAddresses',
      pageSize: String(PAGE_SIZE),
      ...(pageToken ? { pageToken } : {}),
    })
    const response = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (response.status === 401) {
      cachedToken = null
      throw new ContactsImportError()
    }
    if (!response.ok) {
      throw new Error(`Error de Google Contactos (${response.status}).`)
    }
    const data = (await response.json()) as {
      connections?: PersonApiShape[]
      nextPageToken?: string
    }
    for (const person of data.connections ?? []) {
      const contact = normalize(person)
      if (contact) results.push(contact)
    }
    pageToken = data.nextPageToken
    page++
  } while (pageToken && page < MAX_PAGES)

  return results.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
