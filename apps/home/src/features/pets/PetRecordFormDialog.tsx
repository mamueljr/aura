import { useEffect, useState } from 'react'
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
  PET_RECORD_KINDS,
  type NewEntity,
  type PetRecord,
  type PetRecordKind,
} from '@/types/entities'
import { toDateOnly } from '@/utils/dates'
import { PET_RECORD_KIND_META } from './pet-meta'

interface PetRecordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  petId: string
  onSubmit: (data: NewEntity<PetRecord>) => void
}

interface FormState {
  kind: PetRecordKind
  title: string
  date: string
  weightKg: string
  nextDate: string
  notes: string
}

function initialState(): FormState {
  return {
    kind: 'vacuna',
    title: '',
    date: toDateOnly(new Date()),
    weightKg: '',
    nextDate: '',
    notes: '',
  }
}

/** Formulario para registrar vacunas, visitas al vet, medicamentos o peso. */
export function PetRecordFormDialog({
  open,
  onOpenChange,
  petId,
  onSubmit,
}: PetRecordFormDialogProps) {
  const [form, setForm] = useState<FormState>(initialState)

  useEffect(() => {
    if (open) setForm(initialState())
  }, [open])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const isWeight = form.kind === 'peso'
  const valid = isWeight
    ? Number(form.weightKg) > 0
    : form.title.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<PetRecord> = {
      petId,
      kind: form.kind,
      title: isWeight ? `${form.weightKg} kg` : form.title.trim(),
      date: form.date,
    }
    if (isWeight) data.weightKg = Number(form.weightKg)
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
          <DialogDescription>Vacunas, visitas al veterinario, medicamentos o peso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pr-kind">Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => set('kind', v as PetRecordKind)}>
                <SelectTrigger id="pr-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PET_RECORD_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {PET_RECORD_KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-date">Fecha</Label>
              <Input id="pr-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>

          {isWeight ? (
            <div className="space-y-2">
              <Label htmlFor="pr-weight">Peso (kg)</Label>
              <Input
                id="pr-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={form.weightKg}
                onChange={(e) => set('weightKg', e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="pr-title">
                {form.kind === 'vacuna' ? 'Vacuna' : form.kind === 'medicamento' ? 'Medicamento' : 'Motivo de la visita'}
              </Label>
              <Input
                id="pr-title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                autoFocus
              />
            </div>
          )}

          {!isWeight && (
            <div className="space-y-2">
              <Label htmlFor="pr-next">Próxima dosis/cita (opcional)</Label>
              <Input
                id="pr-next"
                type="date"
                value={form.nextDate}
                onChange={(e) => set('nextDate', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pr-notes">Notas (opcional)</Label>
            <Textarea id="pr-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
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
