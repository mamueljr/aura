import {
  documentsRepo,
  eventsRepo,
  familyRepo,
  maintenanceRepo,
  petRecordsRepo,
  petsRepo,
  plantsRepo,
  servicesRepo,
  tasksRepo,
  vehicleRecordsRepo,
  vehiclesRepo,
} from '@/repositories'
import { daysUntil, parseLocalDate, relativeDayLabel, toDateOnly } from '@/utils/dates'
import { formatCurrency } from '@/utils/format'
import { daysUntilWatering } from '@/features/plants/plant-utils'

export interface Reminder {
  /** Identifica el recordatorio para no notificarlo dos veces. */
  key: string
  title: string
  body: string
}

/** Próxima fecha (ISO, solo fecha) en que cae el cumpleaños. */
function nextBirthdayDate(birthDate: string): string {
  const birth = parseLocalDate(birthDate)
  const today = new Date()
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate())
  }
  return toDateOnly(next)
}

/**
 * Recolecta los recordatorios vigentes de todos los módulos del hogar:
 * pagos de servicios, tareas, documentos por vencer, mantenimiento,
 * mascotas, vehículos, riego de plantas y recordatorios del calendario.
 */
export async function collectDueReminders(daysBefore: number): Promise<Reminder[]> {
  const today = toDateOnly(new Date())
  const reminders: Reminder[] = []

  const [
    services,
    tasks,
    documents,
    maintenance,
    pets,
    petRecords,
    vehicles,
    vehicleRecords,
    plants,
    events,
    familyMembers,
  ] = await Promise.all([
    servicesRepo.getAll(),
    tasksRepo.getAll(),
    documentsRepo.getAll(),
    maintenanceRepo.getAll(),
    petsRepo.getAll(),
    petRecordsRepo.getAll(),
    vehiclesRepo.getAll(),
    vehicleRecordsRepo.getAll(),
    plantsRepo.getAll(),
    eventsRepo.getAll(),
    familyRepo.getAll(),
  ])

  for (const service of services) {
    if (service.archived === 1) continue
    if (daysUntil(service.nextDueDate) > service.reminderDaysBefore) continue
    reminders.push({
      key: `service:${service.id}:${service.nextDueDate}`,
      title: `Pago: ${service.name}`,
      body: `${formatCurrency(service.amount)} · ${relativeDayLabel(service.nextDueDate)}`,
    })
  }

  for (const task of tasks) {
    if (task.completedAt || !task.dueDate) continue
    if (daysUntil(task.dueDate) > 0) continue
    reminders.push({
      key: `task:${task.id}:${task.dueDate}`,
      title: `Tarea: ${task.title}`,
      body: relativeDayLabel(task.dueDate),
    })
  }

  for (const doc of documents) {
    if (!doc.expiryDate || daysUntil(doc.expiryDate) > daysBefore) continue
    reminders.push({
      key: `document:${doc.id}:${doc.expiryDate}`,
      title: `Documento: ${doc.title}`,
      body: `Vence ${relativeDayLabel(doc.expiryDate)}`,
    })
  }

  for (const record of maintenance) {
    if (!record.nextDate || daysUntil(record.nextDate) > daysBefore) continue
    reminders.push({
      key: `maintenance:${record.id}:${record.nextDate}`,
      title: `Mantenimiento: ${record.title}`,
      body: relativeDayLabel(record.nextDate),
    })
  }

  const petById = new Map(pets.map((p) => [p.id, p]))
  for (const record of petRecords) {
    if (!record.nextDate || daysUntil(record.nextDate) > daysBefore) continue
    const petName = petById.get(record.petId)?.name ?? 'Mascota'
    reminders.push({
      key: `pet:${record.id}:${record.nextDate}`,
      title: `${petName}: ${record.title}`,
      body: relativeDayLabel(record.nextDate),
    })
  }

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
  for (const record of vehicleRecords) {
    if (!record.nextDate || daysUntil(record.nextDate) > daysBefore) continue
    const vehicleName = vehicleById.get(record.vehicleId)?.name ?? 'Vehículo'
    reminders.push({
      key: `vehicle:${record.id}:${record.nextDate}`,
      title: `${vehicleName}: ${record.kind}`,
      body: relativeDayLabel(record.nextDate),
    })
  }

  for (const plant of plants) {
    const days = daysUntilWatering(plant)
    if (days === null || days > 0) continue
    reminders.push({
      key: `plant:${plant.id}:${today}`,
      title: `Regar: ${plant.name}`,
      body: days === 0 ? 'Hoy toca riego' : 'Riego atrasado',
    })
  }

  for (const event of events) {
    if (event.kind !== 'recordatorio') continue
    if (toDateOnly(parseLocalDate(event.date)) !== today) continue
    reminders.push({
      key: `event:${event.id}:${today}`,
      title: `Recordatorio: ${event.title}`,
      body: 'Hoy',
    })
  }

  const thisYear = new Date().getFullYear()
  for (const member of familyMembers) {
    if (!member.birthDate) continue
    const nextDate = nextBirthdayDate(member.birthDate)
    if (daysUntil(nextDate) > daysBefore) continue
    reminders.push({
      key: `family:${member.id}:${thisYear}`,
      title: `Cumpleaños: ${member.name}`,
      body: relativeDayLabel(nextDate),
    })
  }

  return reminders
}
