import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDriveProvider } from './drive'

/**
 * Transporte de Drive contra un `fetch` simulado.
 *
 * Se prueba aquí lo que no se ve hasta que falla en producción: si se crea un
 * archivo nuevo en vez de reemplazar el existente, si el listado se queda en la
 * primera página, o si un token caducado aborta la sincronización en vez de
 * renovarse.
 */

interface Recorded {
  url: string
  method: string
  body?: unknown
  headers?: Record<string, string>
}

let calls: Recorded[] = []
let handler: (req: Recorded) => { status?: number; json?: unknown; text?: string }

function ok(json: unknown) {
  return { status: 200, json }
}

/** Respuesta mínima con lo que usa `authFetch`. */
function makeResponse(result: { status?: number; json?: unknown; text?: string }) {
  const status = result.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(result.json ?? {}),
    blob: () => Promise.resolve(new Blob([result.text ?? ''])),
  } as unknown as Response
}

beforeEach(() => {
  calls = []
  handler = () => ok({})

  // GIS mínimo: entrega un token en cuanto se pide, sin popup ni script.
  let issued = 0
  ;(globalThis as unknown as { window: unknown }).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: { callback: (r: { access_token?: string }) => void }) {
            return {
              requestAccessToken() {
                issued += 1
                config.callback({ access_token: `token-${issued}` })
              },
            }
          },
          revoke() {},
        },
      },
    },
  }

  globalThis.fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const req: Recorded = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body,
      headers: init?.headers as Record<string, string>,
    }
    calls.push(req)
    return Promise.resolve(makeResponse(handler(req)))
  }) as typeof fetch
})

type Config = Parameters<typeof createDriveProvider>[0]

function provider(overrides: Partial<Config> = {}) {
  return createDriveProvider({ clientId: 'test-client', ...overrides })
}

describe('localizar el archivo', () => {
  it('usa el id cacheado y se ahorra la búsqueda', async () => {
    handler = () => ok({ hola: 'mundo' })

    await provider({ getFileId: () => 'cacheado' }).pull('backup.json')

    // Sin caché haría primero un files?q=name=... para localizarlo.
    expect(calls.filter((c) => c.url.includes('files?'))).toHaveLength(0)
    expect(calls[0].url).toContain('files/cacheado?alt=media')
  })

  it('devuelve null cuando el archivo no existe', async () => {
    handler = (req) => (req.url.includes('files?') ? ok({ files: [] }) : ok({}))

    expect(await provider().pull('backup.json')).toBeNull()
  })

  it('memoriza el id encontrado para la próxima vez', async () => {
    const setFileId = vi.fn()
    handler = (req) =>
      req.url.includes('files?') ? ok({ files: [{ id: 'encontrado' }] }) : ok({ dato: 1 })

    await provider({ setFileId }).pull('backup.json')

    expect(setFileId).toHaveBeenCalledWith('encontrado')
  })
})

describe('escribir', () => {
  it('crea el archivo la primera vez y guarda su id', async () => {
    const setFileId = vi.fn()
    handler = () => ok({ id: 'nuevo-id' })

    await provider({ setFileId }).push('backup.json', {
      app: 'aura-music',
      appVersion: '1',
      schemaVersion: 1,
      exportedAt: '2026-08-01T00:00:00.000Z',
      data: {},
    })

    const upload = calls.find((c) => c.url.includes('/upload/'))!
    expect(upload.method).toBe('POST')
    expect(setFileId).toHaveBeenCalledWith('nuevo-id')
  })

  it('REEMPLAZA el archivo existente en vez de crear otro', async () => {
    handler = () => ok({ id: 'mismo' })

    await provider({ getFileId: () => 'mismo' }).push('backup.json', {
      app: 'aura-music',
      appVersion: '1',
      schemaVersion: 1,
      exportedAt: '2026-08-01T00:00:00.000Z',
      data: {},
    })

    // Con POST se acumularía un respaldo nuevo en cada sincronización.
    const upload = calls.find((c) => c.url.includes('/upload/'))!
    expect(upload.method).toBe('PATCH')
    expect(upload.url).toContain('files/mismo')
  })

  it('un binario con `ref` se reescribe en su sitio', async () => {
    handler = () => ok({ id: 'ref-existente' })

    await provider().blobs!.put(new Blob(['audio']), {
      ref: 'ref-existente',
      name: 'track-1',
    })

    // Sin esto, cifrar/descifrar la biblioteca duplicaría cada canción.
    const upload = calls.find((c) => c.url.includes('/upload/'))!
    expect(upload.method).toBe('PATCH')
  })
})

describe('listar binarios', () => {
  it('recorre TODAS las páginas', async () => {
    handler = (req) => {
      if (!req.url.includes('files?')) return ok({})
      return req.url.includes('pageToken=p2')
        ? ok({ files: [{ id: 'c', name: 'track-3', size: '30' }] })
        : ok({
            nextPageToken: 'p2',
            files: [
              { id: 'a', name: 'track-1', size: '10' },
              { id: 'b', name: 'track-2', size: '20' },
            ],
          })
    }

    const files = await provider().blobs!.list!()

    // Quedarse en la primera página dejaría huérfanos sin detectar —
    // y una biblioteca grande pasa de 1000 archivos con facilidad.
    expect(files.map((f) => f.ref)).toEqual(['a', 'b', 'c'])
    expect(files[0].size).toBe(10)
  })

  it('trata como 0 el tamaño que Drive no informa', async () => {
    handler = () => ok({ files: [{ id: 'a', name: 'track-1' }] })

    expect((await provider().blobs!.list!())[0].size).toBe(0)
  })
})

describe('sesión y errores', () => {
  it('renueva el token y reintenta una vez ante un 401', async () => {
    let first = true
    handler = (req) => {
      if (req.url.includes('files/x?alt=media') && first) {
        first = false
        return { status: 401 }
      }
      return ok({ recuperado: true })
    }

    const result = await provider({ getFileId: () => 'x' }).pull('b.json')

    expect(result).toEqual({ recuperado: true })
    const authHeaders = calls.map((c) => c.headers?.Authorization)
    // El reintento debe ir con un token nuevo, no repetir el caducado.
    expect(authHeaders[0]).not.toBe(authHeaders[1])
  })

  it('no reintenta en bucle: un 401 persistente falla', async () => {
    handler = () => ({ status: 401 })

    await expect(
      provider({ getFileId: () => 'x' }).pull('b.json'),
    ).rejects.toThrow('401')
  })

  it('informa del código cuando Drive responde con error', async () => {
    handler = () => ({ status: 500 })

    await expect(
      provider({ getFileId: () => 'x' }).pull('b.json'),
    ).rejects.toThrow('500')
  })

  it('connect devuelve la cuenta conectada', async () => {
    handler = (req) =>
      req.url.includes('userinfo') ? ok({ email: 'persona@example.com' }) : ok({})

    expect(await provider().connect!()).toBe('persona@example.com')
  })

  it('falla claro si falta el Client ID', async () => {
    await expect(createDriveProvider({ clientId: '' }).pull('b.json')).rejects.toThrow(
      /Client ID/,
    )
  })
})

describe('cuota', () => {
  it('calcula lo usado y el tope', async () => {
    handler = () => ok({ storageQuota: { usage: '5000', limit: '15000' } })

    expect(await provider().quota!()).toEqual({ used: 5000, limit: 15000 })
  })

  it('sin tope informado, limit es null', async () => {
    handler = () => ok({ storageQuota: { usage: '5000' } })

    // Las cuentas sin límite no traen `limit`; tratarlo como 0 haría creer
    // que no cabe nada.
    expect(await provider().quota!()).toEqual({ used: 5000, limit: null })
  })
})
