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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aura/ui/components/select'
import { Textarea } from '@aura/ui/components/textarea'
import {
  ITEM_CATEGORIES,
  type HomeItem,
  type ItemCategory,
  type NewEntity,
} from '@/types/entities'
import { compressImage } from '@/utils/images'
import { ITEM_CATEGORY_META } from './room-meta'

interface ItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  item: HomeItem | null
  onSubmit: (data: NewEntity<HomeItem>) => void
}

interface FormState {
  name: string
  category: ItemCategory
  brand: string
  purchaseDate: string
  photo: string | null
  notes: string
}

function initialState(item: HomeItem | null): FormState {
  return {
    name: item?.name ?? '',
    category: item?.category ?? 'mueble',
    brand: item?.brand ?? '',
    purchaseDate: item?.purchaseDate ?? '',
    photo: item?.photo ?? null,
    notes: item?.notes ?? '',
  }
}

/** Formulario de alta/edición de un objeto del inventario del hogar. */
export function ItemFormDialog({
  open,
  onOpenChange,
  roomId,
  item,
  onSubmit,
}: ItemFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(item))
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setForm(initialState(item))
  }, [open, item])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.name.trim().length > 0

  async function handlePhoto(file: File) {
    setProcessing(true)
    try {
      set('photo', await compressImage(file))
    } finally {
      setProcessing(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<HomeItem> = {
      roomId,
      name: form.name.trim(),
      category: form.category,
    }
    const brand = form.brand.trim()
    const notes = form.notes.trim()
    if (brand) data.brand = brand
    if (form.purchaseDate) data.purchaseDate = form.purchaseDate
    if (form.photo) data.photo = form.photo
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar objeto' : 'Nuevo objeto'}</DialogTitle>
          <DialogDescription>Muebles, electrodomésticos y más, con su foto y garantía.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fotografía (opcional)</Label>
            <div className="flex items-center gap-2">
              {form.photo ? (
                <div className="relative">
                  <img src={form.photo} alt="" className="size-16 rounded-lg border object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar fotografía"
                    onClick={() => set('photo', null)}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={processing}
                    className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Elegir fotografía"
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
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handlePhoto(file)
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
                if (file) void handlePhoto(file)
                e.target.value = ''
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nombre</Label>
              <Input
                id="item-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej. Refrigerador"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as ItemCategory)}>
                <SelectTrigger id="item-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ITEM_CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-brand">Marca (opcional)</Label>
              <Input id="item-brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-purchase">Fecha de compra (opcional)</Label>
              <Input
                id="item-purchase"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-notes">Notas (opcional)</Label>
            <Textarea id="item-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || processing}>
              {item ? 'Guardar cambios' : 'Agregar objeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
