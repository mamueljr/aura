import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import { documentsRepo } from '@/repositories'
import {
  deleteLocalDocumentBlob,
  putLocalDocumentBlob,
} from '@/services/document-blobs.service'
import type { AuraDocument, NewEntity } from '@/types/entities'

/** Mutaciones del módulo de documentos con invalidación automática. */
export function useDocumentMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataStats }),
    ])

  const createDocument = useMutation({
    mutationFn: async ({
      data,
      blob,
    }: {
      data: NewEntity<AuraDocument>
      blob: Blob
    }) => {
      const doc = await documentsRepo.create(data)
      await putLocalDocumentBlob(doc.id, blob)
      return doc
    },
    onSuccess: invalidate,
  })

  const updateDocument = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<NewEntity<AuraDocument>>
    }) => documentsRepo.update(id, changes),
    onSuccess: invalidate,
  })

  /** Elimina el documento (tombstone) y su contenido local. */
  const removeDocument = useMutation({
    mutationFn: async (id: string) => {
      await deleteLocalDocumentBlob(id)
      await documentsRepo.remove(id)
    },
    onSuccess: invalidate,
  })

  return { createDocument, updateDocument, removeDocument }
}
