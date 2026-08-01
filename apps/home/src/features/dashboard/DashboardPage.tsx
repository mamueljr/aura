import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CircleCheckBig,
  ListTodo,
  Receipt,
} from 'lucide-react'
import { Badge } from '@aura/ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@aura/ui/components/card'
import { EmptyState } from '@/components/EmptyState'
import { MODULES } from '@/config/navigation'
import { useEvents, useServicePayments, useServices, useTasks } from '@/hooks/queries'
import { daysUntil, formatLongDate, isCurrentMonth, relativeDayLabel } from '@/utils/dates'
import { formatCurrency } from '@/utils/format'
import type { Service } from '@/types/entities'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Buenas noches'
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: 'easeOut' as const },
})

function dueBadgeVariant(days: number): 'destructive' | 'default' | 'secondary' {
  if (days < 0) return 'destructive'
  if (days <= 3) return 'default'
  return 'secondary'
}

/**
 * Cabecera: saludo y gasto del mes como dato protagonista.
 *
 * Antes el saludo era una línea suelta y el gasto una tarjeta más entre cuatro
 * iguales, así que la pantalla no tenía a dónde mirar primero. El degradado usa
 * la paleta de marca, que el panel no estaba aprovechando.
 */
function Hero({ monthTotal }: { monthTotal: number }) {
  return (
    <motion.section
      {...fadeUp(0)}
      className="relative overflow-hidden rounded-3xl border border-aura-500/15 bg-gradient-to-br from-aura-500/15 via-card to-card p-5"
    >
      {/* Halo decorativo; `aria-hidden` porque no aporta información. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-aura-500/20 blur-3xl"
      />
      <div className="relative space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {formatLongDate()}
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {greeting()}
          </h2>
        </div>
        <div>
          <p className="font-heading text-4xl font-semibold tracking-tight text-foreground">
            {formatCurrency(monthTotal)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">Gastado este mes</p>
        </div>
      </div>
    </motion.section>
  )
}

/**
 * Indicador compacto. Cada uno lleva su propio tono: en monocromo los cuatro
 * números se leían como un bloque indistinto.
 */
function StatChip({
  icon: Icon,
  label,
  value,
  tone,
  to,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: string
  to: string
  delay: number
}) {
  return (
    <motion.div {...fadeUp(delay)}>
      <Link
        to={to}
        className="flex h-full flex-col gap-2 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent/50"
      >
        {/* El color va en el contenedor y el icono lo hereda (`currentColor`). */}
        <span
          className="flex size-9 items-center justify-center rounded-xl"
          style={{
            color: tone,
            backgroundColor: `color-mix(in oklch, ${tone} 18%, transparent)`,
          }}
        >
          <Icon className="size-4.5" />
        </span>
        <span className="font-heading text-xl font-semibold leading-none">{value}</span>
        <span className="text-xs leading-tight text-muted-foreground">{label}</span>
      </Link>
    </motion.div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  to,
  delay,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <motion.div {...fadeUp(delay)}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-primary" /> {title}
          </CardTitle>
          <Link
            to={to}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todo <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  )
}

function UpcomingPayments({ services }: { services: Service[] }) {
  const upcoming = services
    .filter((s) => s.archived === 0)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 5)

  if (upcoming.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        message="Aún no registras servicios."
        actionLabel="Ir a Servicios"
        actionTo="/servicios"
      />
    )
  }

  return (
    <ul className="space-y-3">
      {upcoming.map((s) => {
        const days = daysUntil(s.nextDueDate)
        return (
          <li key={s.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(s.amount)}
              </p>
            </div>
            <Badge variant={dueBadgeVariant(days)}>
              {relativeDayLabel(s.nextDueDate)}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}

/** Dashboard: resumen del hogar con datos reales de IndexedDB. */
export function DashboardPage() {
  const { data: services = [] } = useServices()
  const { data: payments = [] } = useServicePayments()
  const { data: tasks = [] } = useTasks()
  const { data: events = [] } = useEvents()

  const monthTotal = payments
    .filter((p) => isCurrentMonth(p.paidAt))
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingTasks = tasks.filter((t) => !t.completedAt && !t.parentId)
  const dueSoon = services.filter(
    (s) => s.archived === 0 && daysUntil(s.nextDueDate) <= 7,
  )
  const upcomingEvents = events
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <Hero monthTotal={monthTotal} />

      {/* Tres en fila: caben en móvil sin apretarse y llevan a su sección. */}
      <section className="grid grid-cols-3 gap-3">
        <StatChip
          icon={Receipt}
          label="Pagos en 7 días"
          value={String(dueSoon.length)}
          tone="var(--chart-2)"
          to="/servicios"
          delay={0.05}
        />
        <StatChip
          icon={ListTodo}
          label="Tareas pendientes"
          value={String(pendingTasks.length)}
          tone="var(--chart-3)"
          to="/tareas"
          delay={0.1}
        />
        <StatChip
          icon={CalendarDays}
          label="Eventos próximos"
          value={String(upcomingEvents.length)}
          tone="var(--chart-4)"
          to="/calendario"
          delay={0.15}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Próximos pagos" icon={Receipt} to="/servicios" delay={0.25}>
          <UpcomingPayments services={services} />
        </SectionCard>

        <SectionCard title="Tareas pendientes" icon={ListTodo} to="/tareas" delay={0.3}>
          {pendingTasks.length === 0 ? (
            <EmptyState
              icon={CircleCheckBig}
              message="Sin pendientes. Disfruta tu día."
              actionLabel="Ir a Tareas"
              actionTo="/tareas"
            />
          ) : (
            <ul className="space-y-3">
              {pendingTasks.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{t.title}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {relativeDayLabel(t.dueDate)}
                      </span>
                    )}
                    <Badge
                      variant={t.priority === 'alta' ? 'default' : 'secondary'}
                    >
                      {t.priority}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Próximos eventos"
          icon={CalendarDays}
          to="/calendario"
          delay={0.35}
        >
          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              message="No hay eventos próximos."
              actionLabel="Ir a Calendario"
              actionTo="/calendario"
            />
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{e.title}</p>
                  <Badge variant="secondary">{relativeDayLabel(e.date)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <motion.section {...fadeUp(0.4)}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-x-2 gap-y-3">
              {MODULES.slice(0, 8).map((m) => (
                <Link
                  key={m.id}
                  to={m.path}
                  className="group flex flex-col items-center gap-1.5 rounded-xl py-1.5 text-center transition-colors"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-aura-500/10 text-primary transition-colors group-hover:bg-aura-500/20">
                    <m.icon className="size-5" />
                  </div>
                  {/* Sin `truncate`: cortaba etiquetas como "Mantenimiento" a
                      media palabra. Dos líneas caben de sobra. */}
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {m.label}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      </section>
    </div>
  )
}
