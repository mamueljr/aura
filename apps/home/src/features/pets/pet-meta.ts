import {
  Bird,
  Cat,
  Dog,
  PawPrint,
  Pill,
  Stethoscope,
  Syringe,
  Weight,
  type LucideIcon,
} from 'lucide-react'
import type { PetRecordKind, PetSpecies } from '@/types/entities'

export const PET_SPECIES_META: Record<
  PetSpecies,
  { label: string; icon: LucideIcon }
> = {
  perro: { label: 'Perro', icon: Dog },
  gato: { label: 'Gato', icon: Cat },
  ave: { label: 'Ave', icon: Bird },
  otro: { label: 'Otro', icon: PawPrint },
}

export const PET_RECORD_KIND_META: Record<
  PetRecordKind,
  { label: string; icon: LucideIcon }
> = {
  vacuna: { label: 'Vacuna', icon: Syringe },
  veterinario: { label: 'Veterinario', icon: Stethoscope },
  medicamento: { label: 'Medicamento', icon: Pill },
  peso: { label: 'Peso', icon: Weight },
}
