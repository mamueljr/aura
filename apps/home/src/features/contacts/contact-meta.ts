import {
  Heart,
  HeartPulse,
  Siren,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ContactCategory } from '@/types/entities'

export const CONTACT_CATEGORY_META: Record<
  ContactCategory,
  { label: string; icon: LucideIcon }
> = {
  familia: { label: 'Familia', icon: Heart },
  emergencia: { label: 'Emergencia', icon: Siren },
  salud: { label: 'Salud', icon: HeartPulse },
  servicios_hogar: { label: 'Servicios del hogar', icon: Wrench },
  otro: { label: 'Otro', icon: User },
}
