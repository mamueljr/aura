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
  PRIORITIES,
  type NewEntity,
  type Priority,
  type TaskItem,
} from '@/types/entities'

import { PRIORITY_LABELS } from './task-meta'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tarea a editar; si es null, crea una nueva. */
  task: TaskItem | null
  onSubmit: (data: NewEntity<TaskItem>) => void
}

interface FormState {
  title: string
  notes: string
  priority: Priority
  dueDate: string
  tags: string
}

function initialState(task: TaskItem | null): FormState {
  return {
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    priority: task?.priority ?? 'media',
    dueDate: task?.dueDate ?? '',
    tags: task?.tags.join(', ') ?? '',
  }
}

/** Formulario de alta/edición de una tarea. */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
}: TaskFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(task))

  useEffect(() => {
    if (open) setForm(initialState(task))
  }, [open, task])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.title.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<TaskItem> = {
      title: form.title.trim(),
      priority: form.priority,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    const notes = form.notes.trim()
    if (notes) data.notes = notes
    if (form.dueDate) data.dueDate = form.dueDate
    if (task?.parentId) data.parentId = task.parentId
    if (task?.completedAt) data.completedAt = task.completedAt
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
          <DialogDescription>
            Prioridad, fecha límite y etiquetas — todo opcional menos el título.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              placeholder="¿Qué hay que hacer?"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridad</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => set('priority', v as Priority)}
              >
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Fecha límite</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-tags">Etiquetas (separadas por coma)</Label>
            <Input
              id="task-tags"
              placeholder="hogar, urgente, jardín…"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-notes">Notas (opcional)</Label>
            <Textarea
              id="task-notes"
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
              {task ? 'Guardar cambios' : 'Agregar tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
