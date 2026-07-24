import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
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
import { Textarea } from '@aura/ui/components/textarea'
import type { NewEntity, Plant } from '@/types/entities'
import { compressImage } from '@/utils/images'

interface PlantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plant: Plant | null
  onSubmit: (data: NewEntity<Plant>) => void
}

interface FormState {
  name: string
  location: string
  wateringFrequencyDays: string
  notes: string
  photos: string[]
}

function initialState(plant: Plant | null): FormState {
  return {
    name: plant?.name ?? '',
    location: plant?.location ?? '',
    wateringFrequencyDays: String(plant?.wateringFrequencyDays ?? 7),
    notes: plant?.notes ?? '',
    photos: plant?.photos ?? [],
  }
}

/** Formulario de alta/edición de una planta. */
export function PlantFormDialog({
  open,
  onOpenChange,
  plant,
  onSubmit,
}: PlantFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(plant))
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setForm(initialState(plant))
  }, [open, plant])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const frequency = Number(form.wateringFrequencyDays)
  const valid = form.name.trim().length > 0 && frequency > 0

  async function addPhotos(files: FileList) {
    setProcessing(true)
    try {
      const compressed = await Promise.all([...files].slice(0, 4).map((f) => compressImage(f)))
      setForm((f) => ({ ...f, photos: [...f.photos, ...compressed].slice(0, 4) }))
    } finally {
      setProcessing(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<Plant> = {
      name: form.name.trim(),
      wateringFrequencyDays: frequency,
      photos: form.photos,
      ...(plant?.lastWateredDate ? { lastWateredDate: plant.lastWateredDate } : {}),
    }
    const location = form.location.trim()
    const notes = form.notes.trim()
    if (location) data.location = location
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plant ? 'Editar planta' : 'Nueva planta'}</DialogTitle>
          <DialogDescription>Define cada cuántos días necesita riego.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pl-name">Nombre</Label>
              <Input id="pl-name" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-location">Ubicación (opcional)</Label>
              <Input
                id="pl-location"
                placeholder="Ej. Patio"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-freq">Regar cada (días)</Label>
            <Input
              id="pl-freq"
              type="number"
              inputMode="numeric"
              min="1"
              max="90"
              value={form.wateringFrequencyDays}
              onChange={(e) => set('wateringFrequencyDays', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fotografías (máx. 4)</Label>
            <div className="flex flex-wrap gap-2">
              {form.photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img src={photo} alt={`Foto ${i + 1}`} className="size-16 rounded-lg border object-cover" />
                  <button
                    type="button"
                    aria-label={`Quitar foto ${i + 1}`}
                    onClick={() => set('photos', form.photos.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {form.photos.length < 4 && (
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
            <Label htmlFor="pl-notes">Notas (opcional)</Label>
            <Textarea id="pl-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || processing}>
              {plant ? 'Guardar cambios' : 'Agregar planta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
