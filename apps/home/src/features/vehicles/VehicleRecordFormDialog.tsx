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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  VEHICLE_RECORD_KINDS,
  type NewEntity,
  type VehicleRecord,
  type VehicleRecordKind,
} from '@/types/entities'
import { toDateOnly } from '@/utils/dates'
import { VEHICLE_RECORD_KIND_META } from './vehicle-meta'

interface VehicleRecordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicleId: string
  onSubmit: (data: NewEntity<VehicleRecord>) => void
}

interface FormState {
  kind: VehicleRecordKind
  date: string
  cost: string
  nextDate: string
  notes: string
}

function initialState(): FormState {
  return {
    kind: 'servicio',
    date: toDateOnly(new Date()),
    cost: '',
    nextDate: '',
    notes: '',
  }
}

/** Formulario para registrar servicios, gasolina, seguro, tenencia o verificación. */
export function VehicleRecordFormDialog({
  open,
  onOpenChange,
  vehicleId,
  onSubmit,
}: VehicleRecordFormDialogProps) {
  const [form, setForm] = useState<FormState>(initialState)

  useEffect(() => {
    if (open) setForm(initialState())
  }, [open])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.date.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<VehicleRecord> = {
      vehicleId,
      kind: form.kind,
      date: form.date,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo registro</DialogTitle>
          <DialogDescription>Servicio, gasolina, seguro, tenencia o verificación.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vr-kind">Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => set('kind', v as VehicleRecordKind)}>
                <SelectTrigger id="vr-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_RECORD_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {VEHICLE_RECORD_KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vr-date">Fecha</Label>
              <Input id="vr-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vr-cost">Costo (opcional)</Label>
              <Input
                id="vr-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vr-next">Próximo (opcional)</Label>
              <Input
                id="vr-next"
                type="date"
                value={form.nextDate}
                onChange={(e) => set('nextDate', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vr-notes">Notas (opcional)</Label>
            <Textarea id="vr-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
