import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/repositories'
import { useSyncStore } from '@/stores/sync.store'

/**
 * El transporte real (OAuth + red de Drive) se sustituye por un provider en
 * memoria — justo lo que el contrato `SyncProvider` de `@aura/core` hace
 * posible. Lo que se prueba aquí es la orquestación: qué lado gana en cada
 * combinación de cambios.
 *
 * El provider falso NO expone canal de blobs, así que también cubre la rama
 * "proveedor sin binarios" de la sincronización de documentos.
 */
const fake = vi.hoisted(() => ({ remote: { payload: null as unknown } }))

vi.mock('@/services/drive-provider', () => ({
  getAccessToken: () => Promise.resolve('token-de-prueba'),
  loadGis: () => Promise.resolve(),
  SyncAuthError: class SyncAuthError extends Error {},
  driveProvider: {
    id: 'fake',
    pull: () => Promise.resolve(fake.remote.payload),
    push: (_key: string, payload: unknown) => {
      fake.remote.payload = payload
      return Promise.resolve()
    },
    remove: () => {
      fake.remote.payload = null
      return Promise.resolve()
    },
    connect: () => Promise.resolve('persona@example.com'),
    disconnect: () => {},
  },
}))

const {
  connect,
  disableEncryption,
  disconnect,
  enableEncryption,
  isEncryptionEnabled,
  syncNow,
  unlockEncryption,
} = await import('@/services/drive-sync.service')
const { clearKey, SyncCryptoError } = await import('@/services/sync-crypto.service')

const PASADO = '2026-01-01T00:00:00.000Z'
const MEDIO = '2026-06-01T00:00:00.000Z'
const FUTURO = '2026-12-01T00:00:00.000Z'

async function tareaLocal(id: string, updatedAt: string): Promise<void> {
  await db.tasks.put({
    id,
    title: `Tarea ${id}`,
    createdAt: updatedAt,
    updatedAt,
  } as never)
}

function payloadRemoto(exportedAt: string, tasks: unknown[] = []): unknown {
  return {
    app: 'aura-home',
    appVersion: '1.0.0',
    schemaVersion: db.verno,
    exportedAt,
    data: { tasks },
  }
}

const tareaRemota = {
  id: 'remota-1',
  title: 'Llegó de otro dispositivo',
  createdAt: FUTURO,
  updatedAt: FUTURO,
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  fake.remote.payload = null
  useSyncStore.setState({
    enabled: false,
    accountEmail: null,
    lastSyncAt: null,
    fileId: null,
  })
})

describe('syncNow — qué lado gana', () => {
  it('sube cuando el proveedor aún no tiene nada', async () => {
    await tareaLocal('local-1', MEDIO)

    const result = await syncNow()

    expect(result.action).toBe('pushed')
    expect(fake.remote.payload).not.toBeNull()
  })

  it('baja cuando solo cambió lo remoto', async () => {
    useSyncStore.setState({ lastSyncAt: MEDIO })
    await tareaLocal('local-1', PASADO)
    fake.remote.payload = payloadRemoto(FUTURO, [tareaRemota])

    const result = await syncNow()

    expect(result.action).toBe('pulled')
    expect(await db.tasks.get('remota-1')).toBeDefined()
  })

  it('sube cuando solo cambió lo local', async () => {
    useSyncStore.setState({ lastSyncAt: MEDIO })
    await tareaLocal('local-1', FUTURO)
    fake.remote.payload = payloadRemoto(PASADO)

    const result = await syncNow()

    expect(result.action).toBe('pushed')
  })

  it('no hace nada cuando ningún lado cambió', async () => {
    useSyncStore.setState({ lastSyncAt: FUTURO })
    await tareaLocal('local-1', PASADO)
    fake.remote.payload = payloadRemoto(MEDIO)

    const result = await syncNow()

    expect(result.action).toBe('up-to-date')
  })

  it('fusiona cuando ambos lados cambiaron', async () => {
    useSyncStore.setState({ lastSyncAt: MEDIO })
    await tareaLocal('local-1', FUTURO)
    fake.remote.payload = payloadRemoto(FUTURO, [tareaRemota])

    const result = await syncNow()

    expect(result.action).toBe('merged')
    // La fusión conserva ambos lados y sube el resultado.
    expect(await db.tasks.get('remota-1')).toBeDefined()
    expect(await db.tasks.get('local-1')).toBeDefined()
  })

  it('deja constancia de la última sincronización', async () => {
    await tareaLocal('local-1', MEDIO)

    await syncNow()

    expect(useSyncStore.getState().lastSyncAt).not.toBeNull()
  })
})

describe('syncNow — payload cifrado', () => {
  it('falla claro en vez de corromper datos si el sobre viene cifrado', async () => {
    fake.remote.payload = {
      algorithm: 'AES-GCM-256',
      iv: 'AAAA',
      ciphertext: 'opaco',
    }

    await expect(syncNow()).rejects.toThrow('cifrado')
  })
})

/**
 * Estos casos usan el PBKDF2 real (600 000 iteraciones), así que cada uno tarda
 * cerca de un segundo. Se deja a propósito: lo que se valida es justo el flujo
 * completo de activar/desbloquear/desactivar, donde un error significa que el
 * usuario pierde acceso a su respaldo.
 */
describe('cifrado opt-in', () => {
  it('activarlo deja el respaldo remoto ilegible', async () => {
    await tareaLocal('local-1', MEDIO)
    await syncNow()
    expect(JSON.stringify(fake.remote.payload)).toContain('Tarea local-1')

    await enableEncryption('mi frase secreta')

    expect(fake.remote.payload).toHaveProperty('ciphertext')
    expect(JSON.stringify(fake.remote.payload)).not.toContain('Tarea local-1')
  })

  it('sigue sincronizando con el cifrado activo', async () => {
    await tareaLocal('local-1', MEDIO)
    await enableEncryption('mi frase secreta')

    await tareaLocal('local-2', FUTURO)
    const result = await syncNow()

    // Pudo leer el sobre cifrado y decidir sin error.
    expect(['pushed', 'merged', 'up-to-date']).toContain(result.action)
  })

  it('otro dispositivo lo abre con la misma frase', async () => {
    await tareaLocal('local-1', MEDIO)
    await enableEncryption('mi frase secreta')

    // Dispositivo nuevo: mismo respaldo remoto, sin clave local.
    await clearKey()
    await expect(syncNow()).rejects.toThrow(/cifrad/i)

    await unlockEncryption('mi frase secreta')

    expect(await isEncryptionEnabled()).toBe(true)
    expect((await syncNow()).action).toBeDefined()
  })

  it('una frase incorrecta no queda registrada', async () => {
    await tareaLocal('local-1', MEDIO)
    await enableEncryption('la frase buena')
    await clearKey()

    await expect(unlockEncryption('la frase equivocada')).rejects.toThrow(SyncCryptoError)

    expect(await isEncryptionEnabled()).toBe(false)
  })

  it('desactivarlo devuelve el respaldo a texto legible', async () => {
    await tareaLocal('local-1', MEDIO)
    await enableEncryption('mi frase secreta')

    await disableEncryption()

    expect(fake.remote.payload).not.toHaveProperty('ciphertext')
    expect(JSON.stringify(fake.remote.payload)).toContain('Tarea local-1')
    expect(await isEncryptionEnabled()).toBe(false)
  })
})

describe('sesión', () => {
  it('connect guarda la cuenta conectada', async () => {
    const account = await connect()

    expect(account).toBe('persona@example.com')
    expect(useSyncStore.getState().enabled).toBe(true)
    expect(useSyncStore.getState().accountEmail).toBe('persona@example.com')
  })

  it('disconnect limpia el estado persistido', async () => {
    await connect()

    disconnect()

    expect(useSyncStore.getState().enabled).toBe(false)
    expect(useSyncStore.getState().accountEmail).toBeNull()
  })
})
