import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { tasksRepo } from '@/repositories'
import type { NewEntity, TaskItem } from '@/types/entities'

/** Mutaciones del módulo de tareas con invalidación automática. */
export function useTaskMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createTask = useMutation({
    mutationFn: (data: NewEntity<TaskItem>) => tasksRepo.create(data),
    onSuccess: invalidate,
  })

  const updateTask = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<TaskItem>>
    }) => tasksRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      tasksRepo.update(id, {
        completedAt: done ? new Date().toISOString() : undefined,
      } as Partial<NewEntity<TaskItem>>),
    onSuccess: invalidate,
  })

  /** Elimina la tarea y, en cascada, sus subtareas. */
  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      await tasksRepo.removeWhere('parentId', id)
      await tasksRepo.remove(id)
    },
    onSuccess: invalidate,
  })

  return { createTask, updateTask, toggleTask, removeTask }
}
