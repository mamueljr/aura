import Dexie, { type Table } from 'dexie'
import { dataUrlToBlob } from '@/utils/images'
import type {
  AuraDocument,
  CalendarEvent,
  Contact,
  DocumentBlob,
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
  SyncSecret,
  TaskItem,
  Vehicle,
  VehicleRecord,
} from '@/types/entities'

/**
 * Base de datos local de Aura Home (IndexedDB vía Dexie).
 *
 * Migraciones: cada cambio de esquema incrementa `.version(n)`.
 * Nunca se modifica una versión ya publicada; se agrega una nueva
 * con su `upgrade()` si hace falta transformar datos.
 */
export class AuraDatabase extends Dexie {
  services!: Table<Service, string>
  servicePayments!: Table<ServicePayment, string>
  tasks!: Table<TaskItem, string>
  shoppingItems!: Table<ShoppingItem, string>
  events!: Table<CalendarEvent, string>
  maintenance!: Table<MaintenanceRecord, string>
  contacts!: Table<Contact, string>
  pets!: Table<Pet, string>
  petRecords!: Table<PetRecord, string>
  vehicles!: Table<Vehicle, string>
  vehicleRecords!: Table<VehicleRecord, string>
  plants!: Table<Plant, string>
  documents!: Table<AuraDocument, string>
  rooms!: Table<Room, string>
  homeItems!: Table<HomeItem, string>
  familyMembers!: Table<FamilyMember, string>
  documentBlobs!: Table<DocumentBlob, string>
  syncSecrets!: Table<SyncSecret, string>

  constructor() {
    super('aura-home')
    this.version(1).stores({
      services: 'id, category, nextDueDate, archived',
      servicePayments: 'id, serviceId, paidAt',
      tasks: 'id, dueDate, completedAt, parentId, priority',
      shoppingItems: 'id, completedAt, category',
      events: 'id, date, kind',
    })
    // v2 (app v0.10): módulo de mantenimiento
    this.version(2).stores({
      maintenance: 'id, area, date, nextDate',
    })
    // v3 (app v0.11): módulo de contactos
    this.version(3).stores({
      contacts: 'id, category, isEmergency',
    })
    // v4 (app v0.12): mascotas, vehículos y plantas
    this.version(4).stores({
      pets: 'id, species',
      petRecords: 'id, petId, kind, date, nextDate',
      vehicles: 'id',
      vehicleRecords: 'id, vehicleId, kind, date, nextDate',
      plants: 'id',
    })
    // v5 (app v0.13): módulo de documentos
    this.version(5).stores({
      documents: 'id, category, expiryDate',
    })
    // v6 (app v0.14): Mi Hogar (habitaciones e inventario)
    this.version(6).stores({
      rooms: 'id, type',
      homeItems: 'id, roomId, category',
    })
    // v7: Familia y Datos
    this.version(7).stores({
      familyMembers: 'id, relation, birthDate',
    })
    // v8 (post-v1.0): documentos como Blob nativo, fuera del respaldo JSON.
    // Migra los fileData (data-URL base64) existentes a documentBlobs.
    this.version(8)
      .stores({
        documentBlobs: 'id',
      })
      .upgrade(async (tx) => {
        const docs = (await tx.table('documents').toArray()) as (AuraDocument & {
          fileData?: string
        })[]
        for (const doc of docs) {
          if (typeof doc.fileData !== 'string') continue
          await tx.table('documentBlobs').put({ id: doc.id, blob: dataUrlToBlob(doc.fileData) })
          delete doc.fileData
          await tx.table('documents').put(doc)
        }
      })
    // v9: clave de cifrado de Aura Sync. Deliberadamente FUERA de BACKUP_TABLES:
    // la clave nunca debe viajar dentro del respaldo que ella misma cifra.
    this.version(9).stores({
      syncSecrets: 'id',
    })
  }
}

export const db = new AuraDatabase()

/** Nombres de tablas incluidas en respaldos (export/import). */
export const BACKUP_TABLES = [
  'services',
  'servicePayments',
  'tasks',
  'shoppingItems',
  'events',
  'maintenance',
  'contacts',
  'pets',
  'petRecords',
  'vehicles',
  'vehicleRecords',
  'plants',
  'documents',
  'rooms',
  'homeItems',
  'familyMembers',
] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]
