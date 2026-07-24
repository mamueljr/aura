import { daysUntil, parseLocalDate, toDateOnly } from '@/utils/dates'
import type { Plant } from '@/types/entities'

/** Próxima fecha de riego, o null si nunca se ha regado. */
export function nextWateringDate(plant: Plant): string | null {
  if (!plant.lastWateredDate) return null
  const date = parseLocalDate(plant.lastWateredDate)
  date.setDate(date.getDate() + plant.wateringFrequencyDays)
  return toDateOnly(date)
}

/** Días hasta el próximo riego; negativo si ya se retrasó. Null si nunca se ha regado. */
export function daysUntilWatering(plant: Plant): number | null {
  const next = nextWateringDate(plant)
  return next === null ? null : daysUntil(next)
}
