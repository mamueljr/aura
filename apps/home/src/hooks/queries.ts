import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-client'
import {
  contactsRepo,
  documentsRepo,
  eventsRepo,
  familyRepo,
  homeItemsRepo,
  maintenanceRepo,
  petRecordsRepo,
  petsRepo,
  plantsRepo,
  roomsRepo,
  servicePaymentsRepo,
  servicesRepo,
  shoppingRepo,
  tasksRepo,
  vehicleRecordsRepo,
  vehiclesRepo,
} from '@/repositories'

/** Hooks de lectura por entidad. Cada mutación futura invalida su queryKey. */

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => servicesRepo.getAll(),
  })
}

export function useServicePayments() {
  return useQuery({
    queryKey: queryKeys.servicePayments,
    queryFn: () => servicePaymentsRepo.getAll(),
  })
}

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: () => tasksRepo.getAll(),
  })
}

export function useShoppingItems() {
  return useQuery({
    queryKey: queryKeys.shopping,
    queryFn: () => shoppingRepo.getAll(),
  })
}

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: () => eventsRepo.getAll(),
  })
}

export function useMaintenance() {
  return useQuery({
    queryKey: queryKeys.maintenance,
    queryFn: () => maintenanceRepo.getAll(),
  })
}

export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: () => contactsRepo.getAll(),
  })
}

export function usePets() {
  return useQuery({ queryKey: queryKeys.pets, queryFn: () => petsRepo.getAll() })
}

export function usePetRecords() {
  return useQuery({
    queryKey: queryKeys.petRecords,
    queryFn: () => petRecordsRepo.getAll(),
  })
}

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: () => vehiclesRepo.getAll(),
  })
}

export function useVehicleRecords() {
  return useQuery({
    queryKey: queryKeys.vehicleRecords,
    queryFn: () => vehicleRecordsRepo.getAll(),
  })
}

export function usePlants() {
  return useQuery({
    queryKey: queryKeys.plants,
    queryFn: () => plantsRepo.getAll(),
  })
}

export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => documentsRepo.getAll(),
  })
}

export function useRooms() {
  return useQuery({ queryKey: queryKeys.rooms, queryFn: () => roomsRepo.getAll() })
}

export function useHomeItems() {
  return useQuery({
    queryKey: queryKeys.homeItems,
    queryFn: () => homeItemsRepo.getAll(),
  })
}

export function useFamilyMembers() {
  return useQuery({ queryKey: queryKeys.family, queryFn: () => familyRepo.getAll() })
}
