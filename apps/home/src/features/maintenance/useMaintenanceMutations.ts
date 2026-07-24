import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { maintenanceRepo } from '@/repositories'
import type { MaintenanceRecord, NewEntity } from '@/types/entities'

/** Mutaciones del módulo de mantenimiento con invalidación automática. */
export function useMaintenanceMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createRecord = useMutation({
    mutationFn: (data: NewEntity<MaintenanceRecord>) =>
      maintenanceRepo.create(data),
    onSuccess: invalidate,
  })

  const updateRecord = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<MaintenanceRecord>>
    }) => maintenanceRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeRecord = useMutation({
    mutationFn: (id: string) => maintenanceRepo.remove(id),
    onSuccess: invalidate,
  })

  return { createRecord, updateRecord, removeRecord }
}
