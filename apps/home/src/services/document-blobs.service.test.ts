import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/repositories'
import {
  deleteLocalDocumentBlob,
  getLocalDocumentBlob,
  putLocalDocumentBlob,
} from '@/services/document-blobs.service'

describe('document-blobs.service', () => {
  beforeEach(async () => {
    await db.documentBlobs.clear()
  })

  it('guarda y recupera el blob de un documento', async () => {
    const blob = new Blob(['hola'], { type: 'text/plain' })
    await putLocalDocumentBlob('doc1', blob)

    const stored = await getLocalDocumentBlob('doc1')
    expect(stored).toBeDefined()
    expect(await stored?.text()).toBe('hola')
  })

  it('devuelve undefined si el blob no existe localmente (aún no descargado)', async () => {
    expect(await getLocalDocumentBlob('inexistente')).toBeUndefined()
  })

  it('elimina el blob local', async () => {
    await putLocalDocumentBlob('doc2', new Blob(['x']))
    await deleteLocalDocumentBlob('doc2')
    expect(await getLocalDocumentBlob('doc2')).toBeUndefined()
  })
})
