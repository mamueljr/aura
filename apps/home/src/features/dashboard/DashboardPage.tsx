import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CircleCheckBig,
  ListTodo,
  Receipt,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  delay: number
}) {
  return (
    <motion.div {...fadeUp(delay)}>
      <Card>
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-semibold leading-tight">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
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
      <motion.section {...fadeUp(0)} className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {formatLongDate()}
        </p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {greeting()}
        </h2>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Gastado este mes"
          value={formatCurrency(monthTotal)}
          delay={0.05}
        />
        <StatCard
          icon={Receipt}
          label="Pagos en 7 días"
          value={String(dueSoon.length)}
          delay={0.1}
        />
        <StatCard
          icon={ListTodo}
          label="Tareas pendientes"
          value={String(pendingTasks.length)}
          delay={0.15}
        />
        <StatCard
          icon={CalendarDays}
          label="Eventos próximos"
          value={String(upcomingEvents.length)}
          delay={0.2}
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
            <CardContent className="grid grid-cols-4 gap-2">
              {MODULES.slice(0, 8).map((m) => (
                <Link
                  key={m.id}
                  to={m.path}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-colors hover:bg-accent"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <m.icon className="size-5" />
                  </div>
                  <span className="w-full truncate text-[11px] text-muted-foreground">
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
