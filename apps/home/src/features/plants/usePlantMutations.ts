import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { plantsRepo } from '@/repositories'
import { toDateOnly } from '@/utils/dates'
import type { NewEntity, Plant } from '@/types/entities'

/** Mutaciones del módulo de plantas con invalidación automática. */
export function usePlantMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.plants }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createPlant = useMutation({
    mutationFn: (data: NewEntity<Plant>) => plantsRepo.create(data),
    onSuccess: invalidate,
  })

  const updatePlant = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<Plant>>
    }) => plantsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removePlant = useMutation({
    mutationFn: (id: string) => plantsRepo.remove(id),
    onSuccess: invalidate,
  })

  const waterPlant = useMutation({
    mutationFn: (id: string) =>
      plantsRepo.update(id, { lastWateredDate: toDateOnly(new Date()) }),
    onSuccess: invalidate,
  })

  return { createPlant, updatePlant, removePlant, waterPlant }
}
