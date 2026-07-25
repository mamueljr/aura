import type { KdfParams } from '@aura/core/sync'
import { describe, expect, it } from 'vitest'
import {
  decryptBlobIfNeeded,
  decryptEnvelope,
  deriveKey,
  encryptBlob,
  encryptEnvelope,
  newKdfParams,
  SyncCryptoError,
} from '@/services/sync-crypto.service'

/**
 * Se usan pocas iteraciones a propósito: PBKDF2 real (600 000) tarda ~0.5 s por
 * derivación y aquí se derivan claves decenas de veces. Lo que se prueba es el
 * protocolo, no el coste de la derivación.
 */
const kdfRapido: KdfParams = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 1000,
  salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
}

const SECRETO = { app: 'aura-home', data: { tasks: [{ id: 't1', title: 'Pagar la luz' }] } }

describe('cifrado de sobres', () => {
  it('ida y vuelta devuelve exactamente lo mismo', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)

    const envelope = await encryptEnvelope(SECRETO, key, kdfRapido)
    const abierto = await decryptEnvelope(envelope, key)

    expect(abierto).toEqual(SECRETO)
  })

  it('el contenido queda realmente ilegible', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)

    const envelope = await encryptEnvelope(SECRETO, key, kdfRapido)

    // Ni el texto sensible ni los nombres de campo deben verse en el sobre.
    expect(JSON.stringify(envelope)).not.toContain('Pagar la luz')
    expect(JSON.stringify(envelope)).not.toContain('aura-home')
  })

  it('lleva los parámetros de derivación para que otro dispositivo pueda abrirlo', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)

    const envelope = await encryptEnvelope(SECRETO, key, kdfRapido)

    expect(envelope.kdf).toEqual(kdfRapido)
    // Otro dispositivo: misma frase + la sal del sobre => misma clave.
    const otroDispositivo = await deriveKey('mi frase secreta', envelope.kdf!)
    expect(await decryptEnvelope(envelope, otroDispositivo)).toEqual(SECRETO)
  })

  it('rechaza una frase incorrecta', async () => {
    const key = await deriveKey('la frase buena', kdfRapido)
    const envelope = await encryptEnvelope(SECRETO, key, kdfRapido)

    const claveMala = await deriveKey('la frase equivocada', kdfRapido)

    await expect(decryptEnvelope(envelope, claveMala)).rejects.toThrow(SyncCryptoError)
  })

  it('detecta un sobre manipulado en vez de devolver basura', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)
    const envelope = await encryptEnvelope(SECRETO, key, kdfRapido)

    // Alterar un byte del criptograma debe hacer fallar la autenticación GCM.
    const bytes = atob(envelope.ciphertext).split('')
    bytes[0] = bytes[0] === 'A' ? 'B' : 'A'
    const manipulado = { ...envelope, ciphertext: btoa(bytes.join('')) }

    await expect(decryptEnvelope(manipulado, key)).rejects.toThrow(SyncCryptoError)
  })

  it('cada activación usa una sal distinta', () => {
    expect(newKdfParams().salt).not.toBe(newKdfParams().salt)
  })
})

describe('cifrado de adjuntos', () => {
  it('ida y vuelta conserva el contenido y restaura el MIME', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)
    const original = new Blob(['contenido del contrato'], { type: 'application/pdf' })

    const cifrado = await encryptBlob(original, key)
    const abierto = await decryptBlobIfNeeded(cifrado, key, 'application/pdf')

    expect(await abierto.text()).toBe('contenido del contrato')
    expect(abierto.type).toBe('application/pdf')
  })

  it('el adjunto cifrado no expone su contenido', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)

    const cifrado = await encryptBlob(new Blob(['datos del pasaporte']), key)

    expect(await cifrado.text()).not.toContain('datos del pasaporte')
  })

  it('deja pasar los archivos subidos antes de activar el cifrado', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)
    const enClaro = new Blob(['subido antes del cifrado'])

    const resultado = await decryptBlobIfNeeded(enClaro, key)

    expect(await resultado.text()).toBe('subido antes del cifrado')
  })

  it('falla claro si llega un adjunto cifrado y no hay clave', async () => {
    const key = await deriveKey('mi frase secreta', kdfRapido)
    const cifrado = await encryptBlob(new Blob(['algo']), key)

    await expect(decryptBlobIfNeeded(cifrado, null)).rejects.toThrow(SyncCryptoError)
  })
})
