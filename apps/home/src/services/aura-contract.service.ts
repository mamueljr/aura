import { homeItemsRepo, roomsRepo } from '@/repositories'
import {
  AURA_ROOMS_CONTRACT,
  AURA_ROOMS_CONTRACT_VERSION,
  type AuraRoomsExport,
} from '@/types/aura-contracts'
import {
  ITEM_CATEGORIES,
  ROOM_TYPES,
  type ItemCategory,
  type NewEntity,
  type Room,
  type RoomType,
} from '@/types/entities'

/** Exporta las habitaciones e inventario de Mi Hogar en el contrato Aura. */
export async function exportRoomsContract(): Promise<AuraRoomsExport> {
  const [rooms, items] = await Promise.all([roomsRepo.getAll(), homeItemsRepo.getAll()])
  const roomNameById = new Map(rooms.map((r) => [r.id, r.name]))

  return {
    contract: AURA_ROOMS_CONTRACT,
    version: AURA_ROOMS_CONTRACT_VERSION,
    source: 'aura-home',
    exportedAt: new Date().toISOString(),
    rooms: rooms.map((r) => ({
      name: r.name,
      type: r.type,
      ...(r.notes ? { notes: r.notes } : {}),
    })),
    items: items.map((i) => ({
      roomName: roomNameById.get(i.roomId) ?? '',
      name: i.name,
      category: i.category,
      ...(i.brand ? { brand: i.brand } : {}),
      ...(i.purchaseDate ? { purchaseDate: i.purchaseDate } : {}),
      ...(i.notes ? { notes: i.notes } : {}),
    })),
  }
}

/** Descarga el export de habitaciones como archivo JSON. */
export async function downloadRoomsContract(): Promise<void> {
  const data = await exportRoomsContract()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `aura-habitaciones-${data.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isRoomsContract(value: unknown): value is AuraRoomsExport {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<AuraRoomsExport>
  return data.contract === AURA_ROOMS_CONTRACT && Array.isArray(data.rooms) && Array.isArray(data.items)
}

function resolveRoomType(type: string): RoomType {
  return (ROOM_TYPES as readonly string[]).includes(type) ? (type as RoomType) : 'otro'
}

function resolveItemCategory(category: string | undefined): ItemCategory {
  return category && (ITEM_CATEGORIES as readonly string[]).includes(category)
    ? (category as ItemCategory)
    : 'otro'
}

/**
 * Importa un archivo del contrato de habitaciones Aura (de esta u otra app
 * del ecosistema), creando habitaciones y objetos nuevos. No fusiona con
 * habitaciones existentes del mismo nombre — cada import agrega registros.
 */
export async function importRoomsContract(
  json: string,
): Promise<{ rooms: number; items: number }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!isRoomsContract(parsed)) {
    throw new Error('El archivo no es un export de habitaciones del ecosistema Aura.')
  }

  const roomIdByName = new Map<string, string>()
  for (const room of parsed.rooms) {
    const data: NewEntity<Room> = { name: room.name, type: resolveRoomType(room.type) }
    if (room.notes) data.notes = room.notes
    const created = await roomsRepo.create(data)
    roomIdByName.set(room.name, created.id)
  }

  let itemCount = 0
  for (const item of parsed.items) {
    const roomId = roomIdByName.get(item.roomName)
    if (!roomId) continue
    await homeItemsRepo.create({
      roomId,
      name: item.name,
      category: resolveItemCategory(item.category),
      ...(item.brand ? { brand: item.brand } : {}),
      ...(item.purchaseDate ? { purchaseDate: item.purchaseDate } : {}),
      ...(item.notes ? { notes: item.notes } : {}),
    })
    itemCount++
  }

  return { rooms: parsed.rooms.length, items: itemCount }
}
