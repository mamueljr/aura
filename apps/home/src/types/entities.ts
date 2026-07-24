/**
 * Tipos del dominio de Aura Home.
 * Las fechas se guardan como ISO 8601 (string) para ser serializables
 * en IndexedDB y en los respaldos JSON.
 */

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  /**
   * Tombstone de sincronización: al eliminar, el registro se marca con esta
   * fecha en vez de borrarse, para que la eliminación se propague a otros
   * dispositivos al fusionar respaldos. Se purga tras TOMBSTONE_RETENTION_DAYS.
   */
  deletedAt?: string
}

/** Datos necesarios para crear una entidad (el resto lo pone el repositorio). */
export type NewEntity<T extends BaseEntity> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

// ---------- Servicios y pagos ----------

export const SERVICE_CATEGORIES = [
  'luz',
  'agua',
  'gas',
  'internet',
  'telefono',
  'streaming',
  'seguro',
  'predial',
  'hipoteca',
  'renta',
  'otro',
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const FREQUENCIES = [
  'unico',
  'semanal',
  'quincenal',
  'mensual',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
] as const
export type Frequency = (typeof FREQUENCIES)[number]

export interface Service extends BaseEntity {
  name: string
  category: ServiceCategory
  amount: number
  frequency: Frequency
  /** Próxima fecha de vencimiento (ISO, solo fecha). */
  nextDueDate: string
  /** Días de anticipación para recordar el pago. */
  reminderDaysBefore: number
  notes?: string
  /** 0 = activo, 1 = archivado (numérico para poder indexarse). */
  archived: 0 | 1
}

export interface ServicePayment extends BaseEntity {
  serviceId: string
  amount: number
  paidAt: string
  notes?: string
}

// ---------- Tareas ----------

export const PRIORITIES = ['baja', 'media', 'alta'] as const
export type Priority = (typeof PRIORITIES)[number]

export interface TaskItem extends BaseEntity {
  title: string
  notes?: string
  priority: Priority
  dueDate?: string
  completedAt?: string
  tags: string[]
  /** Para subtareas: id de la tarea padre. */
  parentId?: string
}

// ---------- Compras ----------

export interface ShoppingItem extends BaseEntity {
  name: string
  category?: string
  quantity: number
  priority: Priority
  completedAt?: string
}

// ---------- Contactos ----------

export const CONTACT_CATEGORIES = [
  'familia',
  'emergencia',
  'salud',
  'servicios_hogar',
  'otro',
] as const
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number]

export interface Contact extends BaseEntity {
  name: string
  category: ContactCategory
  /** Rol u oficio: "Plomero", "Doctora", "Hermana"… */
  role?: string
  phone?: string
  email?: string
  notes?: string
  /** Aparece siempre arriba, en la sección de emergencias. */
  isEmergency: boolean
}

// ---------- Mascotas ----------

export const PET_SPECIES = ['perro', 'gato', 'ave', 'otro'] as const
export type PetSpecies = (typeof PET_SPECIES)[number]

export interface Pet extends BaseEntity {
  name: string
  species: PetSpecies
  breed?: string
  birthDate?: string
  notes?: string
}

export const PET_RECORD_KINDS = ['vacuna', 'veterinario', 'medicamento', 'peso'] as const
export type PetRecordKind = (typeof PET_RECORD_KINDS)[number]

export interface PetRecord extends BaseEntity {
  petId: string
  kind: PetRecordKind
  title: string
  date: string
  /** Solo aplica a kind: 'peso'. */
  weightKg?: number
  /** Próxima dosis/cita, aparece en el calendario. */
  nextDate?: string
  notes?: string
}

// ---------- Vehículos ----------

export const VEHICLE_RECORD_KINDS = [
  'servicio',
  'gasolina',
  'seguro',
  'tenencia',
  'verificacion',
] as const
export type VehicleRecordKind = (typeof VEHICLE_RECORD_KINDS)[number]

export interface Vehicle extends BaseEntity {
  name: string
  plate?: string
  notes?: string
}

export interface VehicleRecord extends BaseEntity {
  vehicleId: string
  kind: VehicleRecordKind
  date: string
  cost?: number
  nextDate?: string
  notes?: string
}

// ---------- Plantas ----------

export interface Plant extends BaseEntity {
  name: string
  location?: string
  wateringFrequencyDays: number
  lastWateredDate?: string
  notes?: string
  photos: string[]
}

// ---------- Mantenimiento ----------

export const MAINTENANCE_AREAS = [
  'casa',
  'vehiculo',
  'electrodomestico',
  'clima',
  'boiler',
  'jardin',
  'filtros',
  'otro',
] as const
export type MaintenanceArea = (typeof MAINTENANCE_AREAS)[number]

export interface MaintenanceRecord extends BaseEntity {
  title: string
  area: MaintenanceArea
  /** Fecha en que se realizó (ISO, solo fecha). */
  date: string
  cost?: number
  notes?: string
  /** Próximo mantenimiento sugerido (aparece en el calendario). */
  nextDate?: string
  /** Fotografías como data-URL JPEG comprimidas. */
  photos: string[]
}

// ---------- Documentos ----------

export const DOCUMENT_CATEGORIES = [
  'garantia',
  'contrato',
  'seguro',
  'recibo',
  'manual',
  'otro',
] as const
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]

export interface AuraDocument extends BaseEntity {
  title: string
  category: DocumentCategory
  fileName: string
  /** MIME type del archivo original. */
  fileType: string
  /** Tamaño en bytes del archivo. */
  fileSize: number
  /** Vencimiento de garantía/contrato/seguro; aparece en el calendario. */
  expiryDate?: string
  notes?: string
  /**
   * Id del archivo en Google Drive (appDataFolder), una vez subido.
   * Permite a otros dispositivos descargar el contenido sin buscarlo por
   * nombre. El contenido en sí NO viaja en el respaldo JSON — solo esto.
   */
  driveFileId?: string
}

/**
 * Contenido binario de un AuraDocument (mismo id). Vive en su propia tabla,
 * fuera del respaldo JSON de sincronización: los archivos son demasiado
 * pesados para viajar en cada sync como base64. Se sincronizan aparte,
 * como archivos individuales en Drive (ver drive-sync.service).
 */
export interface DocumentBlob {
  id: string
  blob: Blob
}

// ---------- Mi Hogar (habitaciones e inventario) ----------

export const ROOM_TYPES = [
  'sala',
  'cocina',
  'recamara',
  'bano',
  'comedor',
  'garage',
  'jardin',
  'oficina',
  'lavanderia',
  'otro',
] as const
export type RoomType = (typeof ROOM_TYPES)[number]

export interface Room extends BaseEntity {
  name: string
  type: RoomType
  notes?: string
}

export const ITEM_CATEGORIES = [
  'mueble',
  'electrodomestico',
  'electronica',
  'decoracion',
  'otro',
] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export interface HomeItem extends BaseEntity {
  roomId: string
  name: string
  category: ItemCategory
  brand?: string
  purchaseDate?: string
  /** Fotografía como data-URL JPEG comprimida. */
  photo?: string
  notes?: string
}

// ---------- Familia y Datos ----------

export const FAMILY_RELATIONS = [
  'yo',
  'esposo_esposa',
  'hijo_hija',
  'padre_madre',
  'hermano_hermana',
  'otro',
] as const
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number]

export const BLOOD_TYPES = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export interface FamilyMember extends BaseEntity {
  name: string
  relation: FamilyRelation
  /** Aparece como cumpleaños recurrente en el calendario. */
  birthDate?: string
  /** Fotografía como data-URL JPEG comprimida. */
  photo?: string
  curp?: string
  rfc?: string
  /** Número de Seguro Social (IMSS/ISSSTE). */
  nss?: string
  bloodType?: BloodType
  allergies?: string
  phone?: string
  email?: string
  /** Aseguradora y número de póliza. */
  insurancePolicy?: string
  notes?: string
}

// ---------- Calendario ----------

export const EVENT_KINDS = ['evento', 'cumpleanos', 'recordatorio'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export interface CalendarEvent extends BaseEntity {
  title: string
  kind: EventKind
  /** Fecha de inicio (ISO). */
  date: string
  endDate?: string
  allDay: boolean
  notes?: string
}
