import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { eventsRepo } from '@/repositories'
import type { CalendarEvent, NewEntity } from '@/types/entities'

/** Mutaciones del calendario con invalidación automática. */
export function useEventMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.events }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createEvent = useMutation({
    mutationFn: (data: NewEntity<CalendarEvent>) => eventsRepo.create(data),
    onSuccess: invalidate,
  })

  const updateEvent = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<CalendarEvent>>
    }) => eventsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeEvent = useMutation({
    mutationFn: (id: string) => eventsRepo.remove(id),
    onSuccess: invalidate,
  })

  return { createEvent, updateEvent, removeEvent }
}
