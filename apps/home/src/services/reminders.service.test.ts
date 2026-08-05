import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/repositories'
import {
  documentsRepo,
  eventsRepo,
  familyRepo,
  petRecordsRepo,
  petsRepo,
  plantsRepo,
  servicesRepo,
  tasksRepo,
} from '@/repositories'

import { collectDueReminders } from './reminders.service'

/**
 * Los recordatorios son el motivo por el que se abre Aura Home: "qué me toca
 * hoy". Un fallo aquí no rompe nada visible — simplemente el aviso no sale, y
 * el usuario se entera cuando ya venció el documento o se murió la planta.
 *
 * Se prueba contra Dexie de verdad (fake-indexeddb): lo que puede fallar no es
 * leer la tabla, sino la ventana de días de cada módulo, que es distinta en
 * cada uno.
 */

const HOY = new Date(2026, 6, 21, 9, 0) // martes 21 de julio de 2026

/** Fecha ISO (solo fecha) a N días de hoy. */
function enDias(days: number): string {
  const date = new Date(2026, 6, 21 + days)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

const claves = async (daysBefore = 7): Promise<string[]> =>
  (await collectDueReminders(daysBefore)).map((r) => r.key.split(':')[0]!)

beforeEach(async () => {
  // Solo `Date`: Dexie agenda trabajo con temporizadores, y congelarlos deja
  // cualquier consulta esperando para siempre.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(HOY)
  await Promise.all(db.tables.map((table) => table.clear()))
})
afterEach(() => vi.useRealTimers())

describe('servicios', () => {
  const servicio = (nextDueDate: string, extra: Record<string, unknown> = {}) =>
    servicesRepo.create({
      name: 'Luz',
      category: 'luz',
      amount: 850,
      frequency: 'mensual',
      nextDueDate,
      reminderDaysBefore: 3,
      archived: 0,
      ...extra,
    } as never)

  it('avisa dentro de la ventana propia del servicio', async () => {
    await servicio(enDias(3))
    expect(await claves()).toEqual(['service'])
  })

  it('cada servicio usa SU ventana, no la global', async () => {
    // `daysBefore` (el ajuste general) no manda aquí: el servicio trae la suya.
    await servicio(enDias(5), { reminderDaysBefore: 3 })
    expect(await claves(30)).toEqual([])

    await servicio(enDias(5), { name: 'Agua', reminderDaysBefore: 10 })
    expect(await claves(0)).toEqual(['service'])
  })

  it('un pago vencido sigue avisando', async () => {
    await servicio(enDias(-4))
    expect(await claves()).toEqual(['service'])
  })

  it('los archivados se callan', async () => {
    await servicio(enDias(1), { archived: 1 })
    expect(await claves()).toEqual([])
  })

  it('el aviso lleva el importe y cuándo toca', async () => {
    await servicio(enDias(1))
    const [reminder] = await collectDueReminders(7)
    expect(reminder!.title).toBe('Pago: Luz')
    expect(reminder!.body).toContain('Mañana')
  })
})

describe('tareas', () => {
  const tarea = (extra: Record<string, unknown>) =>
    tasksRepo.create({ title: 'Sacar la basura', priority: 'media', tags: [], ...extra } as never)

  it('solo avisa cuando ya venció o vence hoy', async () => {
    await tarea({ dueDate: enDias(0) })
    expect(await claves()).toEqual(['task'])

    await Promise.all(db.tables.map((t) => t.clear()))
    await tarea({ dueDate: enDias(-2) })
    expect(await claves()).toEqual(['task'])
  })

  it('una tarea futura no molesta, aunque la ventana sea amplia', async () => {
    // A diferencia de documentos o mantenimiento, las tareas NO se anticipan.
    await tarea({ dueDate: enDias(1) })
    expect(await claves(30)).toEqual([])
  })

  it('las completadas y las que no tienen fecha se ignoran', async () => {
    await tarea({ dueDate: enDias(-1), completedAt: new Date().toISOString() })
    await tarea({ title: 'Sin fecha' })
    expect(await claves()).toEqual([])
  })
})

describe('documentos', () => {
  const documento = (expiryDate?: string) =>
    documentsRepo.create({ title: 'Pasaporte', category: 'identificacion', expiryDate } as never)

  it('avisa dentro de la ventana global', async () => {
    await documento(enDias(5))
    expect(await claves(7)).toEqual(['document'])
    expect(await claves(3)).toEqual([])
  })

  it('sin fecha de vencimiento no hay nada que recordar', async () => {
    await documento(undefined)
    expect(await claves(365)).toEqual([])
  })
})

describe('plantas', () => {
  const planta = (extra: Record<string, unknown>) =>
    plantsRepo.create({ name: 'Potos', wateringFrequencyDays: 7, photos: [], ...extra } as never)

  it('avisa el día del riego y mientras siga atrasado', async () => {
    await planta({ lastWateredDate: enDias(-7) })
    const [reminder] = await collectDueReminders(7)
    expect(reminder!.body).toBe('Hoy toca riego')

    await Promise.all(db.tables.map((t) => t.clear()))
    await planta({ lastWateredDate: enDias(-10) })
    expect((await collectDueReminders(7))[0]!.body).toBe('Riego atrasado')
  })

  it('el riego NO se anticipa: se avisa cuando toca, no antes', async () => {
    await planta({ lastWateredDate: enDias(-5) })
    expect(await claves(30)).toEqual([])
  })

  it('una planta que nunca se ha regado no genera aviso', async () => {
    // Sin `lastWateredDate` no hay forma de saber cuándo toca.
    await planta({})
    expect(await claves(30)).toEqual([])
  })
})

describe('cumpleaños', () => {
  const miembro = (birthDate?: string) =>
    familyRepo.create({ name: 'Ana', relation: 'hermana', birthDate } as never)

  it('cuenta hacia el cumpleaños de este año si aún no ha pasado', async () => {
    await miembro('1990-07-24')
    const [reminder] = await collectDueReminders(7)
    expect(reminder!.title).toBe('Cumpleaños: Ana')
    expect(reminder!.body).toBe('En 3 días')
  })

  it('si ya pasó este año, salta al siguiente y deja de avisar', async () => {
    // Cumplió el 1 de julio: el próximo es dentro de casi un año.
    await miembro('1990-07-01')
    expect(await claves(30)).toEqual([])
  })

  it('el del propio día sí aparece', async () => {
    await miembro('1990-07-21')
    expect((await collectDueReminders(7))[0]!.body).toBe('Hoy')
  })

  it('sin fecha de nacimiento no hay cumpleaños', async () => {
    await miembro(undefined)
    expect(await claves(365)).toEqual([])
  })
})

describe('eventos del calendario', () => {
  const evento = (date: string, kind = 'recordatorio') =>
    eventsRepo.create({ title: 'Junta', kind, date, allDay: true } as never)

  it('solo los del día, y solo los de tipo recordatorio', async () => {
    await evento(enDias(0))
    expect(await claves()).toEqual(['event'])

    await Promise.all(db.tables.map((t) => t.clear()))
    await evento(enDias(0), 'cita')
    expect(await claves()).toEqual([])

    await Promise.all(db.tables.map((t) => t.clear()))
    await evento(enDias(1))
    expect(await claves(30)).toEqual([])
  })
})

describe('el conjunto', () => {
  it('cada recordatorio trae una clave única y estable', async () => {
    // La clave es lo que evita notificar dos veces lo mismo: si se repitiera
    // entre módulos, un aviso taparía al otro.
    await servicesRepo.create({
      name: 'Luz',
      category: 'luz',
      amount: 100,
      frequency: 'mensual',
      nextDueDate: enDias(0),
      reminderDaysBefore: 3,
      archived: 0,
    } as never)
    await tasksRepo.create({
      title: 'Tarea',
      priority: 'alta',
      tags: [],
      dueDate: enDias(0),
    } as never)
    const pet = await petsRepo.create({ name: 'Kira', species: 'perro', photos: [] } as never)
    await petRecordsRepo.create({
      petId: pet.id,
      title: 'Vacuna',
      kind: 'vacuna',
      date: enDias(-30),
      nextDate: enDias(2),
    } as never)

    const reminders = await collectDueReminders(7)

    expect(reminders).toHaveLength(3)
    expect(new Set(reminders.map((r) => r.key)).size).toBe(3)
    // El de la mascota se nombra con el nombre del animal, no con su id.
    expect(reminders.find((r) => r.key.startsWith('pet:'))!.title).toBe('Kira: Vacuna')
  })

  it('sin datos no inventa nada', async () => {
    expect(await collectDueReminders(7)).toEqual([])
  })
})
