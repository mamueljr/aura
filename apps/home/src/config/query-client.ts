import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente de TanStack Query. Los datos viven en IndexedDB (local),
 * así que se consideran frescos hasta que una mutación los invalide.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Claves de query centralizadas para invalidación consistente. */
export const queryKeys = {
  services: ['services'] as const,
  servicePayments: ['servicePayments'] as const,
  tasks: ['tasks'] as const,
  shopping: ['shopping'] as const,
  events: ['events'] as const,
  maintenance: ['maintenance'] as const,
  contacts: ['contacts'] as const,
  pets: ['pets'] as const,
  petRecords: ['petRecords'] as const,
  vehicles: ['vehicles'] as const,
  vehicleRecords: ['vehicleRecords'] as const,
  plants: ['plants'] as const,
  documents: ['documents'] as const,
  rooms: ['rooms'] as const,
  homeItems: ['homeItems'] as const,
  family: ['family'] as const,
  dataStats: ['dataStats'] as const,
}
