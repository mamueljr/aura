import { db } from '@/repositories/db'

/**
 * Acceso al contenido binario de los documentos (tabla local `documentBlobs`,
 * fuera del respaldo JSON de sincronización — ver types/entities.ts).
 */

export function getLocalDocumentBlob(id: string): Promise<Blob | undefined> {
  return db.documentBlobs.get(id).then((row) => row?.blob)
}

export async function putLocalDocumentBlob(id: string, blob: Blob): Promise<void> {
  await db.documentBlobs.put({ id, blob })
}

export async function deleteLocalDocumentBlob(id: string): Promise<void> {
  await db.documentBlobs.delete(id)
}
