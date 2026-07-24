import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { familyRepo } from '@/repositories'
import type { FamilyMember, NewEntity } from '@/types/entities'

/** Mutaciones del módulo Familia y Datos con invalidación automática. */
export function useFamilyMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.family }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createMember = useMutation({
    mutationFn: (data: NewEntity<FamilyMember>) => familyRepo.create(data),
    onSuccess: invalidate,
  })

  const updateMember = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<FamilyMember>>
    }) => familyRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeMember = useMutation({
    mutationFn: (id: string) => familyRepo.remove(id),
    onSuccess: invalidate,
  })

  return { createMember, updateMember, removeMember }
}
