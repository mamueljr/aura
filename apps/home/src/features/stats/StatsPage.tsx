import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, CircleCheckBig, ListTodo, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@aura/ui/components/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/EmptyState'
import {
  useMaintenance,
  useServicePayments,
  useServices,
  useShoppingItems,
  useTasks,
  useVehicleRecords,
} from '@/hooks/queries'
import { isCurrentMonth } from '@/utils/dates'
import { formatCurrency } from '@/utils/format'
import { monthlyExpenses, paymentsByCategory, weeklyActivity } from './stats-utils'

const EXPENSE_CONFIG: ChartConfig = {
  servicios: { label: 'Servicios', color: 'var(--chart-1)' },
  mantenimiento: { label: 'Mantenimiento', color: 'var(--chart-2)' },
  vehiculos: { label: 'Vehículos', color: 'var(--chart-3)' },
}

const CATEGORY_CONFIG: ChartConfig = {
  amount: { label: 'Gasto', color: 'var(--chart-1)' },
}

const ACTIVITY_CONFIG: ChartConfig = {
  tareas: { label: 'Tareas', color: 'var(--chart-1)' },
  compras: { label: 'Compras', color: 'var(--chart-2)' },
}

/** Fila de tooltip para valores en pesos: indicador + etiqueta + monto formateado. */
function currencyTooltipRow(value: unknown, name: unknown, item: { color?: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item?.color }} />
      <span className="flex-1 text-muted-foreground">{String(name)}</span>
      <span className="font-mono font-medium text-foreground tabular-nums">
        {formatCurrency(Number(value))}
      </span>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? <EmptyState icon={BarChart3} message="Aún no hay datos suficientes." /> : children}
      </CardContent>
    </Card>
  )
}

/** Módulo de Estadísticas: gastos, pagos y actividad del hogar. */
export function StatsPage() {
  const { data: payments = [] } = useServicePayments()
  const { data: services = [] } = useServices()
  const { data: maintenance = [] } = useMaintenance()
  const { data: vehicleRecords = [] } = useVehicleRecords()
  const { data: tasks = [] } = useTasks()
  const { data: shopping = [] } = useShoppingItems()

  const expenses = useMemo(
    () => monthlyExpenses(payments, maintenance, vehicleRecords),
    [payments, maintenance, vehicleRecords],
  )
  const categorySpend = useMemo(
    () => paymentsByCategory(payments, services),
    [payments, services],
  )
  const activity = useMemo(() => weeklyActivity(tasks, shopping), [tasks, shopping])

  const spentThisMonth =
    payments.filter((p) => isCurrentMonth(p.paidAt)).reduce((sum, p) => sum + p.amount, 0) +
    maintenance
      .filter((m) => isCurrentMonth(m.date))
      .reduce((sum, m) => sum + (m.cost ?? 0), 0) +
    vehicleRecords
      .filter((v) => isCurrentMonth(v.date))
      .reduce((sum, v) => sum + (v.cost ?? 0), 0)

  const tasksDoneThisMonth = tasks.filter(
    (t) => t.completedAt && isCurrentMonth(t.completedAt),
  ).length
  const shoppingDoneThisMonth = shopping.filter(
    (s) => s.completedAt && isCurrentMonth(s.completedAt),
  ).length

  const hasExpenses = expenses.some((e) => e.servicios + e.mantenimiento + e.vehiculos > 0)
  const hasCategorySpend = categorySpend.length > 0
  const hasActivity = activity.some((a) => a.tareas + a.compras > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Wallet} label="Gastado este mes" value={formatCurrency(spentThisMonth)} />
        <StatTile icon={CircleCheckBig} label="Tareas completadas" value={String(tasksDoneThisMonth)} />
        <StatTile icon={ListTodo} label="Compras completadas" value={String(shoppingDoneThisMonth)} />
      </div>

      <ChartCard title="Gastos mensuales" empty={!hasExpenses}>
        <ChartContainer config={EXPENSE_CONFIG} className="aspect-auto h-64 w-full">
          <BarChart data={expenses} barCategoryGap="20%" barGap={2}>
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <ChartTooltip content={<ChartTooltipContent formatter={currencyTooltipRow} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="servicios" fill="var(--color-servicios)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="mantenimiento" fill="var(--color-mantenimiento)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="vehiculos" fill="var(--color-vehiculos)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        {hasExpenses && (
          <table className="sr-only">
            <caption>Gastos mensuales por categoría</caption>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Servicios</th>
                <th>Mantenimiento</th>
                <th>Vehículos</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.month}>
                  <td>{e.month}</td>
                  <td>{formatCurrency(e.servicios)}</td>
                  <td>{formatCurrency(e.mantenimiento)}</td>
                  <td>{formatCurrency(e.vehiculos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>

      <ChartCard title="Pagos por categoría (12 meses)" empty={!hasCategorySpend}>
        <ChartContainer
          config={CATEGORY_CONFIG}
          className="aspect-auto w-full"
          style={{ height: Math.max(160, categorySpend.length * 36) }}
        >
          <BarChart data={categorySpend} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray="0" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={currencyTooltipRow} />} />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="amount"
                position="right"
                className="fill-foreground text-xs"
                formatter={(value: unknown) => formatCurrency(Number(value))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        {hasCategorySpend && (
          <table className="sr-only">
            <caption>Pagos de servicios por categoría, últimos 12 meses</caption>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Total pagado</th>
              </tr>
            </thead>
            <tbody>
              {categorySpend.map((c) => (
                <tr key={c.category}>
                  <td>{c.label}</td>
                  <td>{formatCurrency(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>

      <ChartCard title="Actividad del hogar (8 semanas)" empty={!hasActivity}>
        <ChartContainer config={ACTIVITY_CONFIG} className="aspect-auto h-64 w-full">
          <LineChart data={activity}>
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="week" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="tareas"
              stroke="var(--color-tareas)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-tareas)', stroke: 'var(--card)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="compras"
              stroke="var(--color-compras)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-compras)', stroke: 'var(--card)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
        {hasActivity && (
          <table className="sr-only">
            <caption>Tareas y compras completadas por semana</caption>
            <thead>
              <tr>
                <th>Semana</th>
                <th>Tareas</th>
                <th>Compras</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.week}>
                  <td>{a.week}</td>
                  <td>{a.tareas}</td>
                  <td>{a.compras}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>
    </div>
  )
}
