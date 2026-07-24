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
  EVENT_KINDS,
  type CalendarEvent,
  type EventKind,
  type NewEntity,
} from '@/types/entities'
import { parseLocalDate, toDateOnly } from '@/utils/dates'

const KIND_LABELS: Record<EventKind, string> = {
  evento: 'Evento',
  cumpleanos: 'Cumpleaños',
  recordatorio: 'Recordatorio',
}

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Evento a editar; null crea uno nuevo. */
  event: CalendarEvent | null
  /** Fecha inicial sugerida al crear (YYYY-MM-DD). */
  defaultDate?: string
  onSubmit: (data: NewEntity<CalendarEvent>) => void
  onRemove?: (id: string) => void
}

interface FormState {
  title: string
  kind: EventKind
  date: string
  time: string
  notes: string
}

function initialState(
  event: CalendarEvent | null,
  defaultDate?: string,
): FormState {
  if (!event) {
    return {
      title: '',
      kind: 'evento',
      date: defaultDate ?? toDateOnly(new Date()),
      time: '',
      notes: '',
    }
  }
  return {
    title: event.title,
    kind: event.kind,
    date: toDateOnly(parseLocalDate(event.date)),
    time: event.allDay ? '' : (event.date.split('T')[1]?.slice(0, 5) ?? ''),
    notes: event.notes ?? '',
  }
}

/** Formulario de alta/edición de eventos, cumpleaños y recordatorios. */
export function EventFormDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSubmit,
  onRemove,
}: EventFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialState(event, defaultDate),
  )

  useEffect(() => {
    if (open) setForm(initialState(event, defaultDate))
  }, [open, event, defaultDate])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const isBirthday = form.kind === 'cumpleanos'
  const valid = form.title.trim().length > 0 && form.date.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const useTime = !isBirthday && form.time.length > 0
    const data: NewEntity<CalendarEvent> = {
      title: form.title.trim(),
      kind: form.kind,
      date: useTime ? `${form.date}T${form.time}` : form.date,
      allDay: !useTime,
    }
    const notes = form.notes.trim()
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? 'Editar' : 'Nuevo'} evento</DialogTitle>
          <DialogDescription>
            Los cumpleaños se repiten automáticamente cada año.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Título</Label>
            <Input
              id="ev-title"
              placeholder={isBirthday ? 'Ej. Mamá' : 'Ej. Cita con el dentista'}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="evt-kind">Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => set('kind', v as EventKind)}
              >
                <SelectTrigger id="evt-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-date">
                {isBirthday ? 'Fecha de nacimiento' : 'Fecha'}
              </Label>
              <Input
                id="ev-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
          </div>

          {!isBirthday && (
            <div className="space-y-2">
              <Label htmlFor="ev-time">Hora (opcional)</Label>
              <Input
                id="ev-time"
                type="time"
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ev-notes">Notas (opcional)</Label>
            <Textarea
              id="ev-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            {event && onRemove && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => {
                  onRemove(event.id)
                  onOpenChange(false)
                }}
              >
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {event ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
