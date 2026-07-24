import { useEffect, useRef, useState } from 'react'
import { Camera, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aura/ui/components/dialog'
import { Button } from '@aura/ui/components/button'
import { Input } from '@aura/ui/components/input'
import { Label } from '@aura/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aura/ui/components/select'
import { Textarea } from '@aura/ui/components/textarea'
import {
  DOCUMENT_CATEGORIES,
  type AuraDocument,
  type DocumentCategory,
  type NewEntity,
} from '@/types/entities'
import { compressDocumentImageBlob, MAX_DOCUMENT_BYTES } from '@/utils/images'
import { DOCUMENT_CATEGORY_META, formatFileSize } from './document-meta'

interface DocumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: NewEntity<AuraDocument>, blob: Blob) => void
}

interface FormState {
  title: string
  category: DocumentCategory
  expiryDate: string
  notes: string
  file: File | null
}

function initialState(): FormState {
  return { title: '', category: 'otro', expiryDate: '', notes: '', file: null }
}

/** Formulario de alta de un documento: archivo, categoría y vencimiento. */
export function DocumentFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: DocumentFormDialogProps) {
  const [form, setForm] = useState<FormState>(initialState)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm(initialState())
      setError(null)
    }
  }, [open])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.title.trim().length > 0 && form.file !== null

  function handleFile(file: File) {
    setError(null)
    set('file', file)
    if (!form.title.trim()) {
      set('title', file.name.replace(/\.[^.]+$/, ''))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || !form.file) return
    setSubmitting(true)
    try {
      // Las imágenes (galería o cámara) se comprimen para caber siempre;
      // el resto de archivos conserva el límite de 5 MB sin comprimir.
      const isImage = form.file.type.startsWith('image/')
      if (!isImage && form.file.size > MAX_DOCUMENT_BYTES) {
        throw new Error('El archivo pesa más de 5 MB. Elige uno más ligero.')
      }
      const blob: Blob = isImage ? await compressDocumentImageBlob(form.file) : form.file
      const data: NewEntity<AuraDocument> = {
        title: form.title.trim(),
        category: form.category,
        fileName: form.file.name,
        fileType: isImage ? 'image/jpeg' : form.file.type || 'application/octet-stream',
        fileSize: blob.size,
      }
      if (form.expiryDate) data.expiryDate = form.expiryDate
      const notes = form.notes.trim()
      if (notes) data.notes = notes
      onSubmit(data, blob)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el archivo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo documento</DialogTitle>
          <DialogDescription>
            PDF, fotos, garantías, contratos, seguros, recibos y manuales — hasta 5 MB
            (las fotos se comprimen automáticamente).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Archivo</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-left transition-colors hover:bg-accent"
            >
              <Upload className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {form.file
                  ? `${form.file.name} · ${formatFileSize(form.file.size)}`
                  : 'Toca para elegir un archivo'}
              </span>
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera /> Tomar foto
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">Título</Label>
            <Input
              id="doc-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ej. Garantía del refrigerador"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="doc-category">Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set('category', v as DocumentCategory)}
              >
                <SelectTrigger id="doc-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {DOCUMENT_CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-expiry">Vencimiento (opcional)</Label>
              <Input
                id="doc-expiry"
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-notes">Notas (opcional)</Label>
            <Textarea
              id="doc-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || submitting}>
              {submitting ? 'Guardando…' : 'Guardar documento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
