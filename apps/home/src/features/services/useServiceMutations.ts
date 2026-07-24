import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { servicesRepo } from '@/repositories'
import { registerServicePayment } from '@/services/payments.service'
import type { NewEntity, Service } from '@/types/entities'

/** Mutaciones del módulo de servicios con invalidación automática. */
export function useServiceMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.services }),
      queryClient.invalidateQueries({ queryKey: queryKeys.servicePayments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createService = useMutation({
    mutationFn: (data: NewEntity<Service>) => servicesRepo.create(data),
    onSuccess: invalidate,
  })

  const updateService = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<Service>>
    }) => servicesRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeService = useMutation({
    mutationFn: (id: string) => servicesRepo.remove(id),
    onSuccess: invalidate,
  })

  const payService = useMutation({
    mutationFn: (service: Service) => registerServicePayment(service),
    onSuccess: invalidate,
  })

  return { createService, updateService, removeService, payService }
}
