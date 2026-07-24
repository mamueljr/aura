import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { vehicleRecordsRepo, vehiclesRepo } from '@/repositories'
import type { NewEntity, Vehicle, VehicleRecord } from '@/types/entities'

/** Mutaciones del módulo de vehículos con invalidación automática. */
export function useVehicleMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles }),
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleRecords }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createVehicle = useMutation({
    mutationFn: (data: NewEntity<Vehicle>) => vehiclesRepo.create(data),
    onSuccess: invalidate,
  })

  const updateVehicle = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<Vehicle>>
    }) => vehiclesRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeVehicle = useMutation({
    mutationFn: async (id: string) => {
      await vehicleRecordsRepo.removeWhere('vehicleId', id)
      await vehiclesRepo.remove(id)
    },
    onSuccess: invalidate,
  })

  const createRecord = useMutation({
    mutationFn: (data: NewEntity<VehicleRecord>) => vehicleRecordsRepo.create(data),
    onSuccess: invalidate,
  })

  const removeRecord = useMutation({
    mutationFn: (id: string) => vehicleRecordsRepo.remove(id),
    onSuccess: invalidate,
  })

  return { createVehicle, updateVehicle, removeVehicle, createRecord, removeRecord }
}
