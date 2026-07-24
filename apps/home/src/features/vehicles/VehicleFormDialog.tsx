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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NewEntity, Vehicle } from '@/types/entities'

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle | null
  onSubmit: (data: NewEntity<Vehicle>) => void
}

interface FormState {
  name: string
  plate: string
  notes: string
}

function initialState(vehicle: Vehicle | null): FormState {
  return {
    name: vehicle?.name ?? '',
    plate: vehicle?.plate ?? '',
    notes: vehicle?.notes ?? '',
  }
}

/** Formulario de alta/edición de un vehículo. */
export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
}: VehicleFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(vehicle))

  useEffect(() => {
    if (open) setForm(initialState(vehicle))
  }, [open, vehicle])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.name.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<Vehicle> = { name: form.name.trim() }
    const plate = form.plate.trim()
    const notes = form.notes.trim()
    if (plate) data.plate = plate
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar vehículo' : 'Nuevo vehículo'}</DialogTitle>
          <DialogDescription>Auto, moto o cualquier vehículo del hogar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="veh-name">Nombre</Label>
            <Input
              id="veh-name"
              placeholder="Ej. Sedán 2019"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="veh-plate">Placas (opcional)</Label>
            <Input id="veh-plate" value={form.plate} onChange={(e) => set('plate', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="veh-notes">Notas (opcional)</Label>
            <Textarea id="veh-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {vehicle ? 'Guardar cambios' : 'Agregar vehículo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
