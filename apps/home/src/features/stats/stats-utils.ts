import { SERVICE_CATEGORY_META } from '@/features/services/service-categories'
import { parseLocalDate, toDateOnly } from '@/utils/dates'
import type {
  MaintenanceRecord,
  ServiceCategory,
  ServicePayment,
  Service,
  ShoppingItem,
  TaskItem,
  VehicleRecord,
} from '@/types/entities'

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date)
  const clean = label.replace('.', '')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

interface MonthBucket {
  key: string
  label: string
}

/** Últimos `n` meses (incluye el actual), en orden cronológico. */
function lastNMonths(n: number): MonthBucket[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: monthLabel(d) }
  })
}

function sumInMonth<T>(
  items: T[],
  getDate: (item: T) => string,
  getAmount: (item: T) => number,
  monthKey: string,
): number {
  return items
    .filter((item) => getDate(item).slice(0, 7) === monthKey)
    .reduce((sum, item) => sum + getAmount(item), 0)
}

export interface MonthlyExpense {
  month: string
  servicios: number
  mantenimiento: number
  vehiculos: number
}

/** Gasto mensual (últimos 6 meses) por servicios, mantenimiento y vehículos. */
export function monthlyExpenses(
  payments: ServicePayment[],
  maintenance: MaintenanceRecord[],
  vehicleRecords: VehicleRecord[],
  months = 6,
): MonthlyExpense[] {
  return lastNMonths(months).map(({ key, label }) => ({
    month: label,
    servicios: sumInMonth(payments, (p) => p.paidAt, (p) => p.amount, key),
    mantenimiento: sumInMonth(maintenance, (m) => m.date, (m) => m.cost ?? 0, key),
    vehiculos: sumInMonth(vehicleRecords, (v) => v.date, (v) => v.cost ?? 0, key),
  }))
}

export interface CategorySpend {
  category: ServiceCategory
  label: string
  amount: number
}

/** Pagos de servicios de los últimos `months` meses, agrupados por categoría. */
export function paymentsByCategory(
  payments: ServicePayment[],
  services: Service[],
  months = 12,
): CategorySpend[] {
  const cutoff = toDateOnly(new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1))
  const serviceById = new Map(services.map((s) => [s.id, s]))
  const totals = new Map<ServiceCategory, number>()
  for (const payment of payments) {
    if (payment.paidAt < cutoff) continue
    const service = serviceById.get(payment.serviceId)
    if (!service) continue
    totals.set(service.category, (totals.get(service.category) ?? 0) + payment.amount)
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, label: SERVICE_CATEGORY_META[category].label, amount }))
    .sort((a, b) => b.amount - a.amount)
}

interface WeekBucket {
  key: string
  label: string
  start: string
  end: string
}

function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

/** Últimas `n` semanas (lunes a domingo, incluye la actual), en orden cronológico. */
function lastNWeeks(n: number): WeekBucket[] {
  const thisWeek = startOfWeek(new Date())
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - (n - 1 - i) * 7)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    const label = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(start)
    return { key: toDateOnly(start), label, start: toDateOnly(start), end: toDateOnly(end) }
  })
}

export interface WeeklyActivity {
  week: string
  tareas: number
  compras: number
}

/** Tareas y compras completadas por semana (últimas 8 semanas). */
export function weeklyActivity(
  tasks: TaskItem[],
  shopping: ShoppingItem[],
  weeks = 8,
): WeeklyActivity[] {
  const buckets = lastNWeeks(weeks)
  const countInWeek = (dates: string[], start: string, end: string) =>
    dates.filter((d) => d >= start && d <= end).length

  const taskDates = tasks.filter((t) => t.completedAt).map((t) => toDateOnly(parseLocalDate(t.completedAt!)))
  const shoppingDates = shopping
    .filter((s) => s.completedAt)
    .map((s) => toDateOnly(parseLocalDate(s.completedAt!)))

  return buckets.map(({ label, start, end }) => ({
    week: label,
    tareas: countInWeek(taskDates, start, end),
    compras: countInWeek(shoppingDates, start, end),
  }))
}
