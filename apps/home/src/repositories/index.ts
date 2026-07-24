import { BaseRepository } from '@/repositories/base.repository'
import { db } from '@/repositories/db'
import type {
  AuraDocument,
  CalendarEvent,
  Contact,
  FamilyMember,
  HomeItem,
  MaintenanceRecord,
  Pet,
  PetRecord,
  Plant,
  Room,
  Service,
  ServicePayment,
  ShoppingItem,
  TaskItem,
  Vehicle,
  VehicleRecord,
} from '@/types/entities'

/** Repositorios concretos — punto de acceso a datos de toda la app. */
export const servicesRepo = new BaseRepository<Service>(db.services)
export const servicePaymentsRepo = new BaseRepository<ServicePayment>(
  db.servicePayments,
)
export const tasksRepo = new BaseRepository<TaskItem>(db.tasks)
export const shoppingRepo = new BaseRepository<ShoppingItem>(db.shoppingItems)
export const eventsRepo = new BaseRepository<CalendarEvent>(db.events)
export const maintenanceRepo = new BaseRepository<MaintenanceRecord>(
  db.maintenance,
)
export const contactsRepo = new BaseRepository<Contact>(db.contacts)
export const petsRepo = new BaseRepository<Pet>(db.pets)
export const petRecordsRepo = new BaseRepository<PetRecord>(db.petRecords)
export const vehiclesRepo = new BaseRepository<Vehicle>(db.vehicles)
export const vehicleRecordsRepo = new BaseRepository<VehicleRecord>(
  db.vehicleRecords,
)
export const plantsRepo = new BaseRepository<Plant>(db.plants)
export const documentsRepo = new BaseRepository<AuraDocument>(db.documents)
export const roomsRepo = new BaseRepository<Room>(db.rooms)
export const homeItemsRepo = new BaseRepository<HomeItem>(db.homeItems)
export const familyRepo = new BaseRepository<FamilyMember>(db.familyMembers)

export { db } from '@/repositories/db'
export { BaseRepository } from '@/repositories/base.repository'
