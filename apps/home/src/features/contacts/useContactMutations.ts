import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { contactsRepo } from '@/repositories'
import type { Contact, NewEntity } from '@/types/entities'

/** Mutaciones del módulo de contactos con invalidación automática. */
export function useContactMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createContact = useMutation({
    mutationFn: (data: NewEntity<Contact>) => contactsRepo.create(data),
    onSuccess: invalidate,
  })

  const updateContact = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<Contact>>
    }) => contactsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  const removeContact = useMutation({
    mutationFn: (id: string) => contactsRepo.remove(id),
    onSuccess: invalidate,
  })

  const importContacts = useMutation({
    mutationFn: (items: NewEntity<Contact>[]) =>
      Promise.all(items.map((data) => contactsRepo.create(data))),
    onSuccess: invalidate,
  })

  return { createContact, updateContact, removeContact, importContacts }
}
