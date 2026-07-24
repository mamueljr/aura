import {
  BadgeCheck,
  Fuel,
  ShieldCheck,
  Stamp,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { VehicleRecordKind } from '@/types/entities'

export const VEHICLE_RECORD_KIND_META: Record<
  VehicleRecordKind,
  { label: string; icon: LucideIcon }
> = {
  servicio: { label: 'Servicio', icon: Wrench },
  gasolina: { label: 'Gasolina', icon: Fuel },
  seguro: { label: 'Seguro', icon: ShieldCheck },
  tenencia: { label: 'Tenencia', icon: Stamp },
  verificacion: { label: 'Verificación', icon: BadgeCheck },
}
