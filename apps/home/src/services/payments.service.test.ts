import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db, servicePaymentsRepo, servicesRepo } from '@/repositories'
import type { Service } from '@/types/entities'

import { registerServicePayment } from './payments.service'

/**
 * Registrar un pago hace dos cosas a la vez: deja el historial y **mueve la
 * fecha de vencimiento**. Si lo segundo falla, el servicio se queda anclado en
 * una fecha pasada y avisa para siempre, o salta un periodo y no avisa nunca.
 */

const HOY = new Date(2026, 6, 21)

const crearServicio = (extra: Partial<Service> = {}): Promise<Service> =>
  servicesRepo.create({
    name: 'Internet',
    category: 'internet',
    amount: 599,
    frequency: 'mensual',
    nextDueDate: '2026-07-21',
    reminderDaysBefore: 3,
    archived: 0,
    ...extra,
  } as never) as Promise<Service>

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(HOY)
  await Promise.all(db.tables.map((table) => table.clear()))
})
afterEach(() => vi.useRealTimers())

describe('registerServicePayment', () => {
  it('deja el pago en el historial con la fecha de hoy', async () => {
    const service = await crearServicio()

    const payment = await registerServicePayment(service)

    expect(await servicePaymentsRepo.getAll()).toHaveLength(1)
    expect(payment.serviceId).toBe(service.id)
    expect(payment.amount).toBe(599)
    expect(payment.paidAt.slice(0, 10)).toBe('2026-07-21')
  })

  it('acepta un importe distinto al habitual', async () => {
    // El recibo de la luz no viene igual todos los meses.
    const service = await crearServicio()

    const payment = await registerServicePayment(service, 720)

    expect(payment.amount).toBe(720)
    // Y no cambia el importe base del servicio.
    expect((await servicesRepo.getById(service.id))!.amount).toBe(599)
  })

  it('adelanta el vencimiento al siguiente periodo', async () => {
    const service = await crearServicio({ nextDueDate: '2026-07-21' })

    await registerServicePayment(service)

    const actualizado = await servicesRepo.getById(service.id)
    expect(actualizado!.nextDueDate).toBe('2026-08-21')
    expect(actualizado!.archived).toBe(0)
  })

  it('un pago del 31 no se salta el mes corto', async () => {
    // El caso que rompía: 31 de enero + 1 mes daba 3 de marzo, y febrero se
    // quedaba sin aviso.
    const service = await crearServicio({ nextDueDate: '2026-01-31' })

    await registerServicePayment(service)

    expect((await servicesRepo.getById(service.id))!.nextDueDate).toBe('2026-02-28')
  })

  it('el pago único se archiva en vez de reprogramarse', async () => {
    const service = await crearServicio({ frequency: 'unico' })

    await registerServicePayment(service)

    const actualizado = await servicesRepo.getById(service.id)
    expect(actualizado!.archived).toBe(1)
    // La fecha se queda como estaba: ya no significa nada.
    expect(actualizado!.nextDueDate).toBe('2026-07-21')
  })
})
