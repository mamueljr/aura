/** Utilidades de fechas. Trabajan con ISO (solo fecha o fecha-hora). */

import type { Frequency } from '@/types/entities'

const DAY_MS = 86_400_000
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parsea un ISO como fecha LOCAL. Importante: `new Date('2026-07-21')`
 * se interpreta como UTC y desplaza un día en zonas horarias negativas.
 */
export function parseLocalDate(iso: string): Date {
  if (DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  }
  return new Date(iso)
}

/** Serializa una fecha local como ISO de solo fecha (YYYY-MM-DD). */
export function toDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Normaliza a medianoche local para comparar solo fechas. */
function atMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Días (enteros) desde hoy hasta la fecha dada. Negativo si ya pasó. */
export function daysUntil(iso: string): number {
  return Math.round(
    (atMidnight(parseLocalDate(iso)) - atMidnight(new Date())) / DAY_MS,
  )
}

/**
 * Suma meses recortando al último día del mes destino.
 *
 * `setMonth` desborda: al 31 de enero le suma un mes y devuelve el 3 de marzo,
 * porque "31 de febrero" no existe. En un pago mensual eso **se salta febrero
 * entero** y el usuario no recibe el aviso. Recortar al 28 mantiene un aviso
 * por periodo, que es lo que importa.
 *
 * Contrapartida asumida: el día se queda recortado a partir de ahí (31 → 28 →
 * 28…), porque la siguiente ocurrencia se calcula sobre la anterior. Volver al
 * 31 exigiría guardar el día ancla en el servicio; se prefiere no saltarse un
 * periodo antes que conservar el día exacto.
 */
function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

/**
 * Siguiente ocurrencia según la frecuencia, o null si es pago único.
 */
export function nextOccurrence(iso: string, frequency: Frequency): string | null {
  const date = parseLocalDate(iso)
  switch (frequency) {
    case 'unico':
      return null
    case 'semanal':
      date.setDate(date.getDate() + 7)
      break
    case 'quincenal':
      date.setDate(date.getDate() + 14)
      break
    case 'mensual':
      return toDateOnly(addMonths(date, 1))
    case 'bimestral':
      return toDateOnly(addMonths(date, 2))
    case 'trimestral':
      return toDateOnly(addMonths(date, 3))
    case 'semestral':
      return toDateOnly(addMonths(date, 6))
    case 'anual':
      // 12 meses y no `setFullYear`: al 29 de febrero le tocaría un 29 que no
      // existe, y desbordaría al 1 de marzo.
      return toDateOnly(addMonths(date, 12))
  }
  return toDateOnly(date)
}

/** Etiqueta relativa amigable: "Hoy", "Mañana", "En 5 días", "Hace 2 días". */
export function relativeDayLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days === -1) return 'Ayer'
  if (days > 1) return `En ${days} días`
  return `Hace ${-days} días`
}

/** "Viernes, 18 de julio" */
export function formatLongDate(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** ¿La fecha ISO cae en el mes actual? */
export function isCurrentMonth(iso: string): boolean {
  const d = parseLocalDate(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}
