import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { petRecordsRepo, petsRepo } from '@/repositories'
import type { NewEntity, Pet, PetRecord } from '@/types/entities'

/** Mutaciones del módulo de mascotas con invalidación automática. */
export function usePetMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pets }),
      queryClient.invalidateQueries({ queryKey: queryKeys.petRecords }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createPet = useMutation({
    mutationFn: (data: NewEntity<Pet>) => petsRepo.create(data),
    onSuccess: invalidate,
  })

  const updatePet = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<NewEntity<Pet>> }) =>
      petsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  /** Elimina la mascota y todo su historial. */
  const removePet = useMutation({
    mutationFn: async (id: string) => {
      await petRecordsRepo.removeWhere('petId', id)
      await petsRepo.remove(id)
    },
    onSuccess: invalidate,
  })

  const createRecord = useMutation({
    mutationFn: (data: NewEntity<PetRecord>) => petRecordsRepo.create(data),
    onSuccess: invalidate,
  })

  const removeRecord = useMutation({
    mutationFn: (id: string) => petRecordsRepo.remove(id),
    onSuccess: invalidate,
  })

  return { createPet, updatePet, removePet, createRecord, removeRecord }
}
