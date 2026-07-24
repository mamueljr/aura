export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

/**
 * Lee un archivo (PDF, imagen, cualquier tipo) como data-URL, sin
 * comprimir. Rechaza archivos mayores a MAX_DOCUMENT_BYTES.
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_DOCUMENT_BYTES) {
      reject(new Error('El archivo pesa más de 5 MB. Elige uno más ligero.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

function compressToJpeg(
  file: File,
  maxDimension: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('El archivo no es una imagen válida.'))
    }
    img.src = url
  })
}

/**
 * Comprime una imagen a JPEG (máx. 1280px por lado) y la devuelve
 * como data-URL, lista para guardarse en IndexedDB.
 */
export function compressImage(file: File): Promise<string> {
  return compressToJpeg(file, 1280, 0.8)
}

/**
 * Compresión para documentos fotografiados: mayor resolución (2048px)
 * y calidad para que el texto siga siendo legible.
 */
export function compressDocumentImage(file: File): Promise<string> {
  return compressToJpeg(file, 2048, 0.85)
}

/** Bytes aproximados que ocupa el contenido de un data-URL base64. */
export function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.round(base64.length * 0.75)
}

/** Convierte un data-URL base64 a Blob (usado al migrar datos antiguos). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header = '', base64 = ''] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(header)?.[1] || 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function compressToJpegBlob(
  file: File,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('El archivo no es una imagen válida.'))
    }
    img.src = url
  })
}

/**
 * Compresión para documentos fotografiados (Blob nativo, sin base64):
 * mayor resolución (2048px) y calidad para que el texto siga siendo legible.
 */
export function compressDocumentImageBlob(file: File): Promise<Blob> {
  return compressToJpegBlob(file, 2048, 0.85)
}
