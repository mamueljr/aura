import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  MAINTENANCE_AREAS,
  type MaintenanceArea,
  type MaintenanceRecord,
  type NewEntity,
} from '@/types/entities'
import { toDateOnly } from '@/utils/dates'
import { compressImage } from '@/utils/images'
import { MAINTENANCE_AREA_META } from './maintenance-meta'

interface MaintenanceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: MaintenanceRecord | null
  onSubmit: (data: NewEntity<MaintenanceRecord>) => void
}

interface FormState {
  title: string
  area: MaintenanceArea
  date: string
  cost: string
  nextDate: string
  notes: string
  photos: string[]
}

function initialState(record: MaintenanceRecord | null): FormState {
  return {
    title: record?.title ?? '',
    area: record?.area ?? 'casa',
    date: record?.date ?? toDateOnly(new Date()),
    cost: record?.cost !== undefined ? String(record.cost) : '',
    nextDate: record?.nextDate ?? '',
    notes: record?.notes ?? '',
    photos: record?.photos ?? [],
  }
}

/** Formulario de alta/edición de un mantenimiento, con fotografías. */
export function MaintenanceFormDialog({
  open,
  onOpenChange,
  record,
  onSubmit,
}: MaintenanceFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(record))
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setForm(initialState(record))
  }, [open, record])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.title.trim().length > 0 && form.date.length > 0

  async function addPhotos(files: FileList) {
    setProcessing(true)
    try {
      const compressed = await Promise.all(
        [...files].slice(0, 6).map((f) => compressImage(f)),
      )
      setForm((f) => ({ ...f, photos: [...f.photos, ...compressed].slice(0, 6) }))
    } finally {
      setProcessing(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<MaintenanceRecord> = {
      title: form.title.trim(),
      area: form.area,
      date: form.date,
      photos: form.photos,
    }
    const cost = Number(form.cost)
    if (form.cost.trim() && Number.isFinite(cost) && cost >= 0) data.cost = cost
    if (form.nextDate) data.nextDate = form.nextDate
    const notes = form.notes.trim()
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {record ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}
          </DialogTitle>
          <DialogDescription>
            Guarda qué se hizo, cuánto costó y fotos del trabajo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mnt-title">¿Qué se hizo?</Label>
            <Input
              id="mnt-title"
              placeholder="Ej. Servicio del boiler, cambio de filtro…"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mnt-area">Área</Label>
              <Select
                value={form.area}
                onValueChange={(v) => set('area', v as MaintenanceArea)}
              >
                <SelectTrigger id="mnt-area" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {MAINTENANCE_AREA_META[a].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mnt-date">Fecha</Label>
              <Input
                id="mnt-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mnt-cost">Costo (opcional)</Label>
              <Input
                id="mnt-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mnt-next">Próximo (opcional)</Label>
              <Input
                id="mnt-next"
                type="date"
                value={form.nextDate}
                onChange={(e) => set('nextDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fotografías (máx. 6)</Label>
            <div className="flex flex-wrap gap-2">
              {form.photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="size-16 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Quitar foto ${i + 1}`}
                    onClick={() =>
                      set('photos', form.photos.filter((_, j) => j !== i))
                    }
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {form.photos.length < 6 && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={processing}
                    className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Elegir fotografías"
                  >
                    <ImagePlus className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    disabled={processing}
                    className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Tomar foto"
                  >
                    <Camera className="size-5" />
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void addPhotos(e.target.files)
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
                if (e.target.files?.length) void addPhotos(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mnt-notes">Notas (opcional)</Label>
            <Textarea
              id="mnt-notes"
              placeholder="Quién lo hizo, refacciones, garantía…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || processing}>
              {record ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
