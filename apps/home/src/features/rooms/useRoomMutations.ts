import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { homeItemsRepo, roomsRepo } from '@/repositories'
import type { HomeItem, NewEntity, Room } from '@/types/entities'

/** Mutaciones del módulo Mi Hogar con invalidación automática. */
export function useRoomMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms }),
      queryClient.invalidateQueries({ queryKey: queryKeys.homeItems }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createRoom = useMutation({
    mutationFn: (data: NewEntity<Room>) => roomsRepo.create(data),
    onSuccess: invalidate,
  })

  const updateRoom = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<NewEntity<Room>> }) =>
      roomsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  /** Elimina la habitación y todo su inventario. */
  const removeRoom = useMutation({
    mutationFn: async (id: string) => {
      await homeItemsRepo.removeWhere('roomId', id)
      await roomsRepo.remove(id)
    },
    onSuccess: invalidate,
  })

  const createItem = useMutation({
    mutationFn: (data: NewEntity<HomeItem>) => homeItemsRepo.create(data),
    onSuccess: invalidate,
  })

  const updateItem = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<HomeItem>>
    }) => homeItemsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeItem = useMutation({
    mutationFn: (id: string) => homeItemsRepo.remove(id),
    onSuccess: invalidate,
  })

  return {
    createRoom,
    updateRoom,
    removeRoom,
    createItem,
    updateItem,
    removeItem,
  }
}
