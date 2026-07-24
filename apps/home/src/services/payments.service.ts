import { servicePaymentsRepo, servicesRepo } from '@/repositories'
import { nextOccurrence } from '@/utils/dates'
import type { Service, ServicePayment } from '@/types/entities'

/**
 * Registra el pago de un servicio: crea el registro en el historial y
 * avanza la próxima fecha de vencimiento según la frecuencia.
 * Si el servicio era de pago único, se archiva.
 */
export async function registerServicePayment(
  service: Service,
  amount: number = service.amount,
): Promise<ServicePayment> {
  const payment = await servicePaymentsRepo.create({
    serviceId: service.id,
    amount,
    paidAt: new Date().toISOString(),
  })

  const next = nextOccurrence(service.nextDueDate, service.frequency)
  if (next === null) {
    await servicesRepo.update(service.id, { archived: 1 })
  } else {
    await servicesRepo.update(service.id, { nextDueDate: next })
  }
  return payment
}
