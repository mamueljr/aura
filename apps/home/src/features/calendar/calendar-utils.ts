import { nextOccurrence, parseLocalDate, toDateOnly } from '@/utils/dates'
import { nextWateringDate } from '@/features/plants/plant-utils'
import type {
  AuraDocument,
  CalendarEvent,
  FamilyMember,
  MaintenanceRecord,
  PetRecord,
  Plant,
  Service,
  TaskItem,
  VehicleRecord,
} from '@/types/entities'

/** Tipo unificado de todo lo que aparece en el calendario. */
export type AgendaKind =
  | 'evento'
  | 'cumpleanos'
  | 'recordatorio'
  | 'servicio'
  | 'tarea'
  | 'mantenimiento'
  | 'mascota'
  | 'vehiculo'
  | 'planta'
  | 'documento'

export interface AgendaItem {
  key: string
  sourceId: string
  kind: AgendaKind
  title: string
  subtitle?: string
  /** Día de la ocurrencia (YYYY-MM-DD). */
  dateOnly: string
  /** Hora (HH:mm) si el elemento no es de día completo. */
  time?: string
  /** Si es false, el ítem no abre el editor (se genera automáticamente). */
  editable?: boolean
}

export const AGENDA_KIND_META: Record<
  AgendaKind,
  { label: string; dotClass: string }
> = {
  evento: { label: 'Evento', dotClass: 'bg-aura-500' },
  cumpleanos: { label: 'Cumpleaños', dotClass: 'bg-rose-500' },
  recordatorio: { label: 'Recordatorio', dotClass: 'bg-amber-500' },
  servicio: { label: 'Pago de servicio', dotClass: 'bg-sky-500' },
  tarea: { label: 'Tarea', dotClass: 'bg-emerald-500' },
  mantenimiento: { label: 'Mantenimiento', dotClass: 'bg-orange-500' },
  mascota: { label: 'Mascota', dotClass: 'bg-pink-500' },
  vehiculo: { label: 'Vehículo', dotClass: 'bg-cyan-500' },
  planta: { label: 'Planta', dotClass: 'bg-lime-500' },
  documento: { label: 'Documento', dotClass: 'bg-violet-500' },
}

function extractTime(iso: string): string | undefined {
  const timePart = iso.split('T')[1]
  return timePart ? timePart.slice(0, 5) : undefined
}

function push(map: Map<string, AgendaItem[]>, item: AgendaItem) {
  const list = map.get(item.dateOnly) ?? []
  list.push(item)
  map.set(item.dateOnly, list)
}

/**
 * Agrega todas las fuentes del hogar en un mapa fecha → elementos,
 * dentro del rango [start, end] (fechas locales, inclusivo).
 * Los cumpleaños se repiten cada año; los servicios proyectan sus
 * ocurrencias futuras según su frecuencia.
 */
export function buildAgenda(
  events: CalendarEvent[],
  services: Service[],
  tasks: TaskItem[],
  start: Date,
  end: Date,
  maintenance: MaintenanceRecord[] = [],
  petRecords: PetRecord[] = [],
  vehicleRecords: VehicleRecord[] = [],
  plants: Plant[] = [],
  documents: AuraDocument[] = [],
  familyMembers: FamilyMember[] = [],
): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>()
  const startKey = toDateOnly(start)
  const endKey = toDateOnly(end)
  const inRange = (dateOnly: string) =>
    dateOnly >= startKey && dateOnly <= endKey

  for (const event of events) {
    const eventDate = parseLocalDate(event.date)

    if (event.kind === 'cumpleanos') {
      // Recurrencia anual: una ocurrencia por cada año del rango
      for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        const occurrence = new Date(
          year,
          eventDate.getMonth(),
          eventDate.getDate(),
        )
        const dateOnly = toDateOnly(occurrence)
        if (!inRange(dateOnly)) continue
        const age = year - eventDate.getFullYear()
        const item: AgendaItem = {
          key: `${event.id}:${year}`,
          sourceId: event.id,
          kind: 'cumpleanos',
          title: event.title,
          dateOnly,
        }
        if (age > 0 && age < 130) item.subtitle = `Cumple ${age} años`
        push(map, item)
      }
      continue
    }

    const dateOnly = toDateOnly(eventDate)
    if (!inRange(dateOnly)) continue
    const item: AgendaItem = {
      key: event.id,
      sourceId: event.id,
      kind: event.kind === 'recordatorio' ? 'recordatorio' : 'evento',
      title: event.title,
      dateOnly,
    }
    const time = event.allDay ? undefined : extractTime(event.date)
    if (time) item.time = time
    push(map, item)
  }

  for (const service of services) {
    if (service.archived === 1) continue
    // Proyecta ocurrencias desde el próximo vencimiento hasta el fin del rango
    let occurrence: string | null = service.nextDueDate
    for (let i = 0; occurrence !== null && i < 40; i++) {
      if (occurrence > endKey) break
      if (inRange(occurrence)) {
        push(map, {
          key: `${service.id}:${occurrence}`,
          sourceId: service.id,
          kind: 'servicio',
          title: service.name,
          subtitle: 'Pago de servicio',
          dateOnly: occurrence,
        })
      }
      occurrence = nextOccurrence(occurrence, service.frequency)
    }
  }

  for (const task of tasks) {
    if (task.completedAt || !task.dueDate || task.parentId) continue
    const dateOnly = task.dueDate
    if (!inRange(dateOnly)) continue
    push(map, {
      key: task.id,
      sourceId: task.id,
      kind: 'tarea',
      title: task.title,
      subtitle: 'Tarea',
      dateOnly,
    })
  }

  for (const record of maintenance) {
    if (!record.nextDate || !inRange(record.nextDate)) continue
    push(map, {
      key: `${record.id}:next`,
      sourceId: record.id,
      kind: 'mantenimiento',
      title: record.title,
      subtitle: 'Mantenimiento programado',
      dateOnly: record.nextDate,
    })
  }

  for (const record of petRecords) {
    if (!record.nextDate || !inRange(record.nextDate)) continue
    push(map, {
      key: `${record.id}:next`,
      sourceId: record.id,
      kind: 'mascota',
      title: record.title,
      subtitle: 'Recordatorio de mascota',
      dateOnly: record.nextDate,
    })
  }

  for (const record of vehicleRecords) {
    if (!record.nextDate || !inRange(record.nextDate)) continue
    push(map, {
      key: `${record.id}:next`,
      sourceId: record.id,
      kind: 'vehiculo',
      title: record.kind,
      subtitle: 'Recordatorio de vehículo',
      dateOnly: record.nextDate,
    })
  }

  for (const plant of plants) {
    const next = nextWateringDate(plant)
    if (!next || !inRange(next)) continue
    push(map, {
      key: `${plant.id}:${next}`,
      sourceId: plant.id,
      kind: 'planta',
      title: plant.name,
      subtitle: 'Regar planta',
      dateOnly: next,
    })
  }

  for (const doc of documents) {
    if (!doc.expiryDate || !inRange(doc.expiryDate)) continue
    push(map, {
      key: `${doc.id}:expiry`,
      sourceId: doc.id,
      kind: 'documento',
      title: doc.title,
      subtitle: 'Vencimiento de documento',
      dateOnly: doc.expiryDate,
    })
  }

  for (const member of familyMembers) {
    if (!member.birthDate) continue
    const birthDate = parseLocalDate(member.birthDate)
    // Recurrencia anual: una ocurrencia por cada año del rango
    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
      const occurrence = new Date(year, birthDate.getMonth(), birthDate.getDate())
      const dateOnly = toDateOnly(occurrence)
      if (!inRange(dateOnly)) continue
      const age = year - birthDate.getFullYear()
      const item: AgendaItem = {
        key: `${member.id}:${year}`,
        sourceId: member.id,
        kind: 'cumpleanos',
        title: `Cumpleaños de ${member.name}`,
        dateOnly,
        editable: false,
      }
      if (age > 0 && age < 130) item.subtitle = `Cumple ${age} años`
      push(map, item)
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => (a.time ?? '') .localeCompare(b.time ?? ''))
  }
  return map
}

/**
 * Matriz del mes: semanas (filas) de 7 fechas iniciando en lunes.
 * Incluye días de los meses vecinos para completar la cuadrícula.
 */
export function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  // getDay(): 0=domingo … 6=sábado → offset desde lunes
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const weeks: Date[][] = []
  const cursor = new Date(start)
  do {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month)
  return weeks
}

/** Lunes de la semana que contiene la fecha dada. */
export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}
