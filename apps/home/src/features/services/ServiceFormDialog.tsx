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
  FREQUENCIES,
  SERVICE_CATEGORIES,
  type Frequency,
  type NewEntity,
  type Service,
  type ServiceCategory,
} from '@/types/entities'
import { toDateOnly } from '@/utils/dates'
import { FREQUENCY_LABELS, SERVICE_CATEGORY_META } from './service-categories'

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Servicio a editar; si es null, el formulario crea uno nuevo. */
  service: Service | null
  onSubmit: (data: NewEntity<Service>) => void
}

interface FormState {
  name: string
  category: ServiceCategory
  amount: string
  frequency: Frequency
  nextDueDate: string
  reminderDaysBefore: string
  notes: string
}

function initialState(service: Service | null): FormState {
  return {
    name: service?.name ?? '',
    category: service?.category ?? 'otro',
    amount: service ? String(service.amount) : '',
    frequency: service?.frequency ?? 'mensual',
    nextDueDate: service?.nextDueDate ?? toDateOnly(new Date()),
    reminderDaysBefore: String(service?.reminderDaysBefore ?? 3),
    notes: service?.notes ?? '',
  }
}

/** Formulario de alta/edición de un servicio del hogar. */
export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
}: ServiceFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(service))

  useEffect(() => {
    if (open) setForm(initialState(service))
  }, [open, service])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const amount = Number(form.amount)
  const valid =
    form.name.trim().length > 0 &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    form.nextDueDate.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<Service> = {
      name: form.name.trim(),
      category: form.category,
      amount,
      frequency: form.frequency,
      nextDueDate: form.nextDueDate,
      reminderDaysBefore: Math.max(0, Number(form.reminderDaysBefore) || 0),
      archived: service?.archived ?? 0,
    }
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
            {service ? 'Editar servicio' : 'Nuevo servicio'}
          </DialogTitle>
          <DialogDescription>
            Registra el servicio con su costo y fecha de pago.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Nombre</Label>
            <Input
              id="svc-name"
              placeholder="Ej. Internet Telmex"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="svc-category">Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set('category', v as ServiceCategory)}
              >
                <SelectTrigger id="svc-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {SERVICE_CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-amount">Costo (MXN)</Label>
              <Input
                id="svc-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="svc-frequency">Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => set('frequency', v as Frequency)}
              >
                <SelectTrigger id="svc-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-due">Próximo pago</Label>
              <Input
                id="svc-due"
                type="date"
                value={form.nextDueDate}
                onChange={(e) => set('nextDueDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-reminder">Recordar con días de anticipación</Label>
            <Input
              id="svc-reminder"
              type="number"
              inputMode="numeric"
              min="0"
              max="30"
              value={form.reminderDaysBefore}
              onChange={(e) => set('reminderDaysBefore', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-notes">Notas (opcional)</Label>
            <Textarea
              id="svc-notes"
              placeholder="Número de contrato, referencia de pago…"
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
            <Button type="submit" disabled={!valid}>
              {service ? 'Guardar cambios' : 'Agregar servicio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
