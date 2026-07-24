import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { shoppingRepo } from '@/repositories'
import type { NewEntity, ShoppingItem } from '@/types/entities'

/** Mutaciones de la lista de compras con invalidación automática. */
export function useShoppingMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shopping }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createItem = useMutation({
    mutationFn: (data: NewEntity<ShoppingItem>) => shoppingRepo.create(data),
    onSuccess: invalidate,
  })

  const updateItem = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<ShoppingItem>>
    }) => shoppingRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const toggleItem = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      shoppingRepo.update(id, {
        completedAt: done ? new Date().toISOString() : undefined,
      } as Partial<NewEntity<ShoppingItem>>),
    onSuccess: invalidate,
  })

  const removeItem = useMutation({
    mutationFn: (id: string) => shoppingRepo.remove(id),
    onSuccess: invalidate,
  })

  return { createItem, updateItem, toggleItem, removeItem }
}
