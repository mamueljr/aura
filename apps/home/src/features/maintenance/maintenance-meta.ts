import {
  Car,
  Fan,
  Flame,
  Home,
  Leaf,
  Filter,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { MaintenanceArea } from '@/types/entities'

export const MAINTENANCE_AREA_META: Record<
  MaintenanceArea,
  { label: string; icon: LucideIcon }
> = {
  casa: { label: 'Casa', icon: Home },
  vehiculo: { label: 'Vehículo', icon: Car },
  electrodomestico: { label: 'Electrodoméstico', icon: WashingMachine },
  clima: { label: 'Aire acondicionado', icon: Fan },
  boiler: { label: 'Boiler', icon: Flame },
  jardin: { label: 'Jardín', icon: Leaf },
  filtros: { label: 'Filtros', icon: Filter },
  otro: { label: 'Otro', icon: Wrench },
}
