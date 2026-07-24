import { useEffect, useState } from 'react'
import { getLocalDocumentBlob } from '@/services/document-blobs.service'

/**
 * Object URL del contenido de un documento, leído de la tabla local de
 * blobs. Se revoca automáticamente al cambiar de id o desmontar.
 * Devuelve null mientras carga o si el blob aún no está disponible en
 * este dispositivo (p. ej. recién llegado por sync, blob por descargar).
 */
export function useDocumentBlobUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setUrl(null)
      return
    }
    let active = true
    let objectUrl: string | null = null
    void getLocalDocumentBlob(id).then((blob) => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  return url
}
