import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Badge } from '@aura/ui/components/badge'
import { Button } from '@aura/ui/components/button'
import { Card, CardContent } from '@aura/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@aura/ui/components/tabs'
import { EmptyState } from '@/components/EmptyState'
import {
  useDocuments,
  useEvents,
  useFamilyMembers,
  useMaintenance,
  usePetRecords,
  usePlants,
  useServices,
  useTasks,
  useVehicleRecords,
} from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { parseLocalDate, toDateOnly } from '@/utils/dates'
import type { CalendarEvent } from '@/types/entities'
import {
  AGENDA_KIND_META,
  buildAgenda,
  monthGrid,
  startOfWeek,
  type AgendaItem,
} from './calendar-utils'
import { EventFormDialog } from './EventFormDialog'
import { useEventMutations } from './useEventMutations'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const EDITABLE_KINDS = new Set(['evento', 'cumpleanos', 'recordatorio'])

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dayLabel(dateOnly: string): string {
  const label = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseLocalDate(dateOnly))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function AgendaList({
  items,
  onSelect,
}: {
  items: AgendaItem[]
  onSelect: (item: AgendaItem) => void
}) {
  if (items.length === 0) {
    return <EmptyState icon={CalendarDays} message="Nada para este día." />
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const meta = AGENDA_KIND_META[item.kind]
        const editable = item.editable ?? EDITABLE_KINDS.has(item.kind)
        return (
          <li key={item.key}>
            <button
              type="button"
              disabled={!editable}
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left',
                editable && 'transition-colors hover:bg-accent/50',
              )}
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', meta.dotClass)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {item.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.subtitle ?? meta.label}
                </span>
              </span>
              {item.time && <Badge variant="secondary">{item.time}</Badge>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Calendario del hogar: agrega eventos, cumpleaños, pagos y tareas. */
export function CalendarPage() {
  const { data: events = [] } = useEvents()
  const { data: services = [] } = useServices()
  const { data: tasks = [] } = useTasks()
  const { data: maintenance = [] } = useMaintenance()
  const { data: petRecords = [] } = usePetRecords()
  const { data: vehicleRecords = [] } = useVehicleRecords()
  const { data: plants = [] } = usePlants()
  const { data: documents = [] } = useDocuments()
  const { data: familyMembers = [] } = useFamilyMembers()
  const { createEvent, updateEvent, removeEvent } = useEventMutations()

  const today = toDateOnly(new Date())
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState<'mes' | 'semana'>('mes')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)

  const weeks = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  )

  const weekDays = useMemo(() => {
    const start = startOfWeek(parseLocalDate(selected))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [selected])

  const agenda = useMemo(() => {
    const firstWeek = weeks[0]
    const lastWeek = weeks[weeks.length - 1]
    const gridStart = firstWeek?.[0] ?? new Date()
    const gridEnd = lastWeek?.[6] ?? new Date()
    // El rango cubre la cuadrícula del mes y la semana seleccionada
    const start = weekDays[0] && weekDays[0] < gridStart ? weekDays[0] : gridStart
    const lastWeekDay = weekDays[6]
    const end = lastWeekDay && lastWeekDay > gridEnd ? lastWeekDay : gridEnd
    return buildAgenda(
      events,
      services,
      tasks,
      start,
      end,
      maintenance,
      petRecords,
      vehicleRecords,
      plants,
      documents,
      familyMembers,
    )
  }, [
    events,
    services,
    tasks,
    maintenance,
    petRecords,
    vehicleRecords,
    plants,
    documents,
    familyMembers,
    weeks,
    weekDays,
  ])

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  function goToday() {
    setCursor(new Date())
    setSelected(today)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openItem(item: AgendaItem) {
    const event = events.find((e) => e.id === item.sourceId)
    if (!event) return
    setEditing(event)
    setFormOpen(true)
  }

  const selectedItems = agenda.get(selected) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-36 text-center font-heading font-semibold">
            {monthLabel(cursor)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'mes' | 'semana')}>
            <TabsList>
              <TabsTrigger value="mes">Mes</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={openCreate}>
            <Plus />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        </div>
      </div>

      {view === 'mes' ? (
        <>
          <Card>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((d, i) => (
                  <p
                    key={`${d}-${i}`}
                    className="pb-1 text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </p>
                ))}
                {weeks.flat().map((date) => {
                  const dateOnly = toDateOnly(date)
                  const inMonth = date.getMonth() === cursor.getMonth()
                  const items = agenda.get(dateOnly) ?? []
                  const isToday = dateOnly === today
                  const isSelected = dateOnly === selected
                  const kindsSummary = items.length
                    ? ` — ${[...new Set(items.map((item) => AGENDA_KIND_META[item.kind].label))].join(', ')}`
                    : ''
                  return (
                    <button
                      key={dateOnly}
                      type="button"
                      onClick={() => setSelected(dateOnly)}
                      aria-label={`${dayLabel(dateOnly)}${kindsSummary}`}
                      className={cn(
                        'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors sm:aspect-auto sm:py-2',
                        !inMonth && 'text-muted-foreground/40',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full',
                          isToday && !isSelected && 'bg-accent font-semibold text-accent-foreground',
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                        {items.slice(0, 3).map((item) => (
                          <span
                            key={item.key}
                            className={cn(
                              'size-1.5 rounded-full',
                              isSelected
                                ? 'bg-primary-foreground/80'
                                : AGENDA_KIND_META[item.kind].dotClass,
                            )}
                          />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <motion.section
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              {dayLabel(selected)}
            </h3>
            <AgendaList items={selectedItems} onSelect={openItem} />
          </motion.section>
        </>
      ) : (
        <div className="space-y-4">
          {weekDays.map((date) => {
            const dateOnly = toDateOnly(date)
            const items = agenda.get(dateOnly) ?? []
            if (items.length === 0 && dateOnly !== today) return null
            return (
              <section key={dateOnly} className="space-y-2">
                <h3
                  className={cn(
                    'text-sm font-medium',
                    dateOnly === today ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {dayLabel(dateOnly)}
                </h3>
                <AgendaList items={items} onSelect={openItem} />
              </section>
            )
          })}
        </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editing}
        defaultDate={selected}
        onSubmit={(data) => {
          if (editing) {
            updateEvent.mutate({ id: editing.id, changes: data })
          } else {
            createEvent.mutate(data)
          }
        }}
        onRemove={(id) => removeEvent.mutate(id)}
      />
    </div>
  )
}
