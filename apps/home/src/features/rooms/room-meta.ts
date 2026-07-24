import {
  Armchair,
  Bath,
  Bed,
  Briefcase,
  Car,
  ChefHat,
  Home,
  Package,
  Palette,
  Sofa,
  Trees,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'
import type { ItemCategory, RoomType } from '@/types/entities'

export const ROOM_TYPE_META: Record<RoomType, { label: string; icon: LucideIcon }> = {
  sala: { label: 'Sala', icon: Sofa },
  cocina: { label: 'Cocina', icon: ChefHat },
  recamara: { label: 'Recámara', icon: Bed },
  bano: { label: 'Baño', icon: Bath },
  comedor: { label: 'Comedor', icon: UtensilsCrossed },
  garage: { label: 'Garage', icon: Car },
  jardin: { label: 'Jardín', icon: Trees },
  oficina: { label: 'Oficina', icon: Briefcase },
  lavanderia: { label: 'Lavandería', icon: WashingMachine },
  otro: { label: 'Otro', icon: Home },
}

export const ITEM_CATEGORY_META: Record<
  ItemCategory,
  { label: string; icon: LucideIcon }
> = {
  mueble: { label: 'Mueble', icon: Armchair },
  electrodomestico: { label: 'Electrodoméstico', icon: WashingMachine },
  electronica: { label: 'Electrónica', icon: Tv },
  decoracion: { label: 'Decoración', icon: Palette },
  otro: { label: 'Otro', icon: Package },
}
