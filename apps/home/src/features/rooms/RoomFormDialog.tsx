import { useEffect, useState } from 'react'
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
import { ROOM_TYPES, type NewEntity, type Room, type RoomType } from '@/types/entities'
import { ROOM_TYPE_META } from './room-meta'

interface RoomFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onSubmit: (data: NewEntity<Room>) => void
}

interface FormState {
  name: string
  type: RoomType
  notes: string
}

function initialState(room: Room | null): FormState {
  return {
    name: room?.name ?? '',
    type: room?.type ?? 'sala',
    notes: room?.notes ?? '',
  }
}

/** Formulario de alta/edición de una habitación. */
export function RoomFormDialog({ open, onOpenChange, room, onSubmit }: RoomFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(room))

  useEffect(() => {
    if (open) setForm(initialState(room))
  }, [open, room])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.name.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<Room> = { name: form.name.trim(), type: form.type }
    const notes = form.notes.trim()
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? 'Editar habitación' : 'Nueva habitación'}</DialogTitle>
          <DialogDescription>Un espacio de tu casa para organizar su inventario.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nombre</Label>
              <Input
                id="room-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej. Recámara principal"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-type">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as RoomType)}>
                <SelectTrigger id="room-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ROOM_TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-notes">Notas (opcional)</Label>
            <Textarea id="room-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {room ? 'Guardar cambios' : 'Agregar habitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
