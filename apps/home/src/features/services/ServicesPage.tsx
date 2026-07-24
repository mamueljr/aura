import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  ArchiveRestore,
  CircleCheckBig,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react'
import { Badge } from '@aura/ui/components/badge'
import { Button } from '@aura/ui/components/button'
import { Card, CardContent } from '@aura/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aura/ui/components/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aura/ui/components/tabs'
import { EmptyState } from '@/components/EmptyState'
import { useServicePayments, useServices } from '@/hooks/queries'
import { daysUntil, parseLocalDate, relativeDayLabel } from '@/utils/dates'
import { formatCurrency } from '@/utils/format'
import type { Service } from '@/types/entities'
import { ServiceFormDialog } from './ServiceFormDialog'
import { FREQUENCY_LABELS, SERVICE_CATEGORY_META } from './service-categories'
import { useServiceMutations } from './useServiceMutations'

function dueBadgeVariant(days: number): 'destructive' | 'default' | 'secondary' {
  if (days < 0) return 'destructive'
  if (days <= 3) return 'default'
  return 'secondary'
}

function ServiceCard({
  service,
  onPay,
  onEdit,
  onArchiveToggle,
  onRemove,
}: {
  service: Service
  onPay: () => void
  onEdit: () => void
  onArchiveToggle: () => void
  onRemove: () => void
}) {
  const meta = SERVICE_CATEGORY_META[service.category]
  const days = daysUntil(service.nextDueDate)
  const archived = service.archived === 1

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={archived ? 'opacity-70' : undefined}>
        <CardContent className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <meta.icon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{service.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(service.amount)} ·{' '}
              {FREQUENCY_LABELS[service.frequency]}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {archived ? (
              <Badge variant="outline">Archivado</Badge>
            ) : (
              <>
                <Badge variant={dueBadgeVariant(days)}>
                  {relativeDayLabel(service.nextDueDate)}
                </Badge>
                <Button size="sm" variant="outline" onClick={onPay}>
                  <CircleCheckBig className="size-4" />
                  <span className="hidden sm:inline">Pagado</span>
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Opciones de ${service.name}`}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchiveToggle}>
                  {archived ? (
                    <>
                      <ArchiveRestore /> Restaurar
                    </>
                  ) : (
                    <>
                      <Archive /> Archivar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onRemove}>
                  <Trash2 /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Módulo de Servicios: registro, pagos e historial. */
export function ServicesPage() {
  const { data: services = [] } = useServices()
  const { data: payments = [] } = useServicePayments()
  const { createService, updateService, removeService, payService } =
    useServiceMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  const active = services
    .filter((s) => s.archived === 0)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
  const archived = services.filter((s) => s.archived === 1)

  const serviceNames = useMemo(
    () => new Map(services.map((s) => [s.id, s.name])),
    [services],
  )
  const history = [...payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt))

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(service: Service) {
    setEditing(service)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {active.length === 0
            ? 'Registra los servicios de tu hogar'
            : `${active.length} servicios activos`}
        </p>
        <Button onClick={openCreate}>
          <Plus /> Nuevo servicio
        </Button>
      </div>

      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          {archived.length > 0 && (
            <TabsTrigger value="archivados">Archivados</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="activos" className="space-y-3 pt-3">
          {active.length === 0 ? (
            <EmptyState
              icon={Receipt}
              message="Sin servicios todavía. Agrega el primero: luz, agua, internet…"
            />
          ) : (
            <AnimatePresence initial={false}>
              {active.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onPay={() => payService.mutate(s)}
                  onEdit={() => openEdit(s)}
                  onArchiveToggle={() =>
                    updateService.mutate({ id: s.id, changes: { archived: 1 } })
                  }
                  onRemove={() => removeService.mutate(s.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="historial" className="pt-3">
          {history.length === 0 ? (
            <EmptyState
              icon={Receipt}
              message="Aquí aparecerán los pagos que registres."
            />
          ) : (
            <Card>
              <CardContent>
                <ul className="divide-y">
                  {history.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {serviceNames.get(p.serviceId) ?? 'Servicio eliminado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {parseLocalDate(p.paidAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatCurrency(p.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archivados" className="space-y-3 pt-3">
          <AnimatePresence initial={false}>
            {archived.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                onPay={() => undefined}
                onEdit={() => openEdit(s)}
                onArchiveToggle={() =>
                  updateService.mutate({ id: s.id, changes: { archived: 0 } })
                }
                onRemove={() => removeService.mutate(s.id)}
              />
            ))}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        onSubmit={(data) => {
          if (editing) {
            updateService.mutate({ id: editing.id, changes: data })
          } else {
            createService.mutate(data)
          }
        }}
      />
    </div>
  )
}
