import { describe, expect, it } from 'vitest'
import { dataUrlByteSize, dataUrlToBlob } from '@/utils/images'

describe('dataUrlToBlob', () => {
  it('decodifica un data-URL a un Blob con el mismo contenido y MIME type', async () => {
    const text = 'contenido de prueba'
    const base64 = btoa(text)
    const dataUrl = `data:text/plain;base64,${base64}`

    const blob = dataUrlToBlob(dataUrl)

    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(text.length)
    expect(await blob.text()).toBe(text)
  })

  it('usa application/octet-stream si no hay MIME en el header', () => {
    const blob = dataUrlToBlob(`data:;base64,${btoa('x')}`)
    expect(blob.type).toBe('application/octet-stream')
  })
})

describe('dataUrlByteSize', () => {
  it('aproxima el tamaño real en bytes del contenido base64', () => {
    const text = 'a'.repeat(100)
    const dataUrl = `data:text/plain;base64,${btoa(text)}`
    expect(dataUrlByteSize(dataUrl)).toBeCloseTo(text.length, -1)
  })
})
