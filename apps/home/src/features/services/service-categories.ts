import {
  Banknote,
  Droplets,
  Flame,
  Home,
  Landmark,
  MonitorPlay,
  Phone,
  Receipt,
  ShieldCheck,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ServiceCategory } from '@/types/entities'

interface CategoryMeta {
  label: string
  icon: LucideIcon
}

export const SERVICE_CATEGORY_META: Record<ServiceCategory, CategoryMeta> = {
  luz: { label: 'Luz', icon: Zap },
  agua: { label: 'Agua', icon: Droplets },
  gas: { label: 'Gas', icon: Flame },
  internet: { label: 'Internet', icon: Wifi },
  telefono: { label: 'Teléfono', icon: Phone },
  streaming: { label: 'Streaming', icon: MonitorPlay },
  seguro: { label: 'Seguro', icon: ShieldCheck },
  predial: { label: 'Predial', icon: Landmark },
  hipoteca: { label: 'Hipoteca', icon: Home },
  renta: { label: 'Renta', icon: Banknote },
  otro: { label: 'Otro', icon: Receipt },
}

export const FREQUENCY_LABELS = {
  unico: 'Pago único',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
} as const
