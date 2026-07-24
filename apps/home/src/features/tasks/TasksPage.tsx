import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  CircleCheckBig,
  ListTodo,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '@aura/ui/components/badge'
import { Button } from '@aura/ui/components/button'
import { Card, CardContent } from '@aura/ui/components/card'
import { Checkbox } from '@aura/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aura/ui/components/dropdown-menu'
import { Input } from '@aura/ui/components/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aura/ui/components/tabs'
import { EmptyState } from '@/components/EmptyState'
import { useTasks } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { daysUntil, relativeDayLabel } from '@/utils/dates'
import type { Priority, TaskItem } from '@/types/entities'
import { TaskFormDialog } from './TaskFormDialog'
import { PRIORITY_LABELS } from './task-meta'
import { useTaskMutations } from './useTaskMutations'

const PRIORITY_WEIGHT: Record<Priority, number> = { alta: 0, media: 1, baja: 2 }

function priorityBadgeVariant(p: Priority): 'default' | 'secondary' | 'outline' {
  if (p === 'alta') return 'default'
  if (p === 'media') return 'secondary'
  return 'outline'
}

function pendingOrder(a: TaskItem, b: TaskItem): number {
  const dueA = a.dueDate ?? '9999'
  const dueB = b.dueDate ?? '9999'
  if (dueA !== dueB) return dueA.localeCompare(dueB)
  return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
}

interface TaskCardProps {
  task: TaskItem
  subtasks: TaskItem[]
  onToggle: (task: TaskItem, done: boolean) => void
  onEdit: (task: TaskItem) => void
  onRemove: (task: TaskItem) => void
  onAddSubtask: (parent: TaskItem, title: string) => void
}

function TaskCard({
  task,
  subtasks,
  onToggle,
  onEdit,
  onRemove,
  onAddSubtask,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const done = Boolean(task.completedAt)
  const doneCount = subtasks.filter((s) => s.completedAt).length
  const overdue = !done && task.dueDate !== undefined && daysUntil(task.dueDate) < 0

  function submitSubtask(e: React.FormEvent) {
    e.preventDefault()
    const title = subtaskTitle.trim()
    if (!title) return
    onAddSubtask(task, title)
    setSubtaskTitle('')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              className="mt-0.5"
              checked={done}
              onCheckedChange={(v) => onToggle(task, v === true)}
              aria-label={`Completar ${task.title}`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'font-medium',
                  done && 'text-muted-foreground line-through',
                )}
              >
                {task.title}
              </p>
              {task.notes && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {task.notes}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={priorityBadgeVariant(task.priority)}>
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
                {task.dueDate && (
                  <Badge variant={overdue ? 'destructive' : 'secondary'}>
                    {relativeDayLabel(task.dueDate)}
                  </Badge>
                )}
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
                {subtasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {doneCount}/{subtasks.length} subtareas
                    <ChevronDown
                      className={cn(
                        'size-3.5 transition-transform',
                        expanded && 'rotate-180',
                      )}
                    />
                  </button>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Opciones de ${task.title}`}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExpanded(true)}>
                  <Plus /> Agregar subtarea
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onRemove(task)}
                >
                  <Trash2 /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 border-l-2 border-border pl-4 ml-1.5">
                  {subtasks.map((sub) => (
                    <div key={sub.id} className="group flex items-center gap-2.5">
                      <Checkbox
                        checked={Boolean(sub.completedAt)}
                        onCheckedChange={(v) => onToggle(sub, v === true)}
                        aria-label={`Completar ${sub.title}`}
                      />
                      <p
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          sub.completedAt && 'text-muted-foreground line-through',
                        )}
                      >
                        {sub.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemove(sub)}
                        aria-label={`Eliminar ${sub.title}`}
                        className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <form onSubmit={submitSubtask} className="flex items-center gap-2">
                    <Input
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      placeholder="Nueva subtarea…"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={!subtaskTitle.trim()}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Módulo de Tareas: pendientes, subtareas, etiquetas y prioridades. */
export function TasksPage() {
  const { data: tasks = [] } = useTasks()
  const { createTask, updateTask, toggleTask, removeTask } = useTaskMutations()

  const [quickTitle, setQuickTitle] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TaskItem | null>(null)

  const { pending, completed, subtasksByParent } = useMemo(() => {
    const roots = tasks.filter((t) => !t.parentId)
    const byParent = new Map<string, TaskItem[]>()
    for (const t of tasks) {
      if (!t.parentId) continue
      const list = byParent.get(t.parentId) ?? []
      list.push(t)
      byParent.set(t.parentId, list)
    }
    return {
      pending: roots.filter((t) => !t.completedAt).sort(pendingOrder),
      completed: roots
        .filter((t) => t.completedAt)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
      subtasksByParent: byParent,
    }
  }, [tasks])

  function quickAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    createTask.mutate({ title, priority: 'media', tags: [] })
    setQuickTitle('')
  }

  const cardProps = {
    onToggle: (task: TaskItem, done: boolean) =>
      toggleTask.mutate({ id: task.id, done }),
    onEdit: (task: TaskItem) => {
      setEditing(task)
      setFormOpen(true)
    },
    onRemove: (task: TaskItem) => removeTask.mutate(task.id),
    onAddSubtask: (parent: TaskItem, title: string) =>
      createTask.mutate({
        title,
        priority: parent.priority,
        tags: [],
        parentId: parent.id,
      }),
  }

  return (
    <div className="space-y-4">
      <form onSubmit={quickAdd} className="flex gap-2">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Agregar tarea rápida…"
        />
        <Button type="submit" disabled={!quickTitle.trim()}>
          <Plus />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Detallada
        </Button>
      </form>

      <Tabs defaultValue="pendientes">
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes{pending.length > 0 && ` (${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="completadas">Completadas</TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="space-y-3 pt-3">
          {pending.length === 0 ? (
            <EmptyState
              icon={CircleCheckBig}
              message="Nada pendiente. Agrega una tarea arriba."
            />
          ) : (
            <AnimatePresence initial={false}>
              {pending.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  subtasks={subtasksByParent.get(t.id) ?? []}
                  {...cardProps}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="completadas" className="space-y-3 pt-3">
          {completed.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              message="Las tareas completadas aparecerán aquí."
            />
          ) : (
            <AnimatePresence initial={false}>
              {completed.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  subtasks={subtasksByParent.get(t.id) ?? []}
                  {...cardProps}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onSubmit={(data) => {
          if (editing) {
            updateTask.mutate({ id: editing.id, changes: data })
          } else {
            createTask.mutate(data)
          }
        }}
      />
    </div>
  )
}
