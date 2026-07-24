import { Baby, Heart, User, UserRound, Users, type LucideIcon } from 'lucide-react'
import type { FamilyRelation } from '@/types/entities'

export const FAMILY_RELATION_META: Record<
  FamilyRelation,
  { label: string; icon: LucideIcon }
> = {
  yo: { label: 'Yo', icon: User },
  esposo_esposa: { label: 'Esposo/a', icon: Heart },
  hijo_hija: { label: 'Hijo/a', icon: Baby },
  padre_madre: { label: 'Padre/Madre', icon: UserRound },
  hermano_hermana: { label: 'Hermano/a', icon: Users },
  otro: { label: 'Otro', icon: User },
}
