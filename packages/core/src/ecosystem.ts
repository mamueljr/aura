/**
 * Contratos de datos del ecosistema Aura.
 *
 * Aura Home, Aura Inventory y las demás apps del ecosistema son sitios
 * independientes: sin backend ni almacenamiento compartido. La única forma
 * de intercambiar datos entre ellas es un archivo JSON exportado por una app
 * e importado manualmente en otra. Estos tipos documentan ese formato para
 * que cualquier app del ecosistema pueda leerlo y escribirlo, aunque use su
 * propio esquema interno.
 *
 * Reglas del contrato:
 * - Los campos son deliberadamente mínimos y neutrales (sin ids locales,
 *   sin enums propios de una sola app) para que sobrevivan el viaje entre
 *   apps con modelos de datos distintos.
 * - Los cambios que agregan campos opcionales no rompen el contrato; los
 *   que cambian el significado de uno existente requieren subir `version`.
 */

export const AURA_ROOMS_CONTRACT = 'aura-rooms'
export const AURA_ROOMS_CONTRACT_VERSION = 1

export interface AuraRoomContract {
  name: string
  /** Tipo de espacio en texto libre; cada app mapea a su propio enum. */
  type: string
  notes?: string
}

export interface AuraItemContract {
  /** Nombre de la habitación a la que pertenece (no un id local). */
  roomName: string
  name: string
  category?: string
  brand?: string
  purchaseDate?: string
  notes?: string
}

/** Export/import de habitaciones e inventario del hogar entre apps Aura. */
export interface AuraRoomsExport {
  contract: typeof AURA_ROOMS_CONTRACT
  version: number
  /** App de origen, ej. "aura-home" o "aura-inventory". */
  source: string
  exportedAt: string
  rooms: AuraRoomContract[]
  items: AuraItemContract[]
}
