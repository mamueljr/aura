import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Car, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { EmptyState } from '@/components/EmptyState'
import { useVehicleRecords, useVehicles } from '@/hooks/queries'
import { parseLocalDate, relativeDayLabel } from '@/utils/dates'
import { formatCurrency } from '@/utils/format'
import type { Vehicle, VehicleRecord } from '@/types/entities'
import { VEHICLE_RECORD_KIND_META } from './vehicle-meta'
import { VehicleFormDialog } from './VehicleFormDialog'
import { VehicleRecordFormDialog } from './VehicleRecordFormDialog'
import { useVehicleMutations } from './useVehicleMutations'

function VehicleDetail({
  records,
  onAddRecord,
  onRemoveRecord,
}: {
  records: VehicleRecord[]
  onAddRecord: () => void
  onRemoveRecord: (id: string) => void
}) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const upcoming = records.filter(
    (r) => r.nextDate && parseLocalDate(r.nextDate) >= new Date(new Date().toDateString()),
  )

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {upcoming.map((r) => (
          <Badge key={r.id}>
            {VEHICLE_RECORD_KIND_META[r.kind].label}: {relativeDayLabel(r.nextDate!)}
          </Badge>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={onAddRecord}>
          <Plus className="size-3.5" /> Registro
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Sin historial todavía.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => {
            const meta = VEHICLE_RECORD_KIND_META[r.kind]
            return (
              <li key={r.id} className="group flex items-center gap-2.5 text-sm">
                <meta.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {meta.label}
                  <span className="text-muted-foreground">
                    {' · '}
                    {parseLocalDate(r.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    {r.cost !== undefined && ` · ${formatCurrency(r.cost)}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRecord(r.id)}
                  aria-label={`Eliminar registro de ${meta.label}`}
                  className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Módulo de Vehículos: servicios, gasolina, seguro, tenencia y verificación. */
export function VehiclesPage() {
  const { data: vehicles = [] } = useVehicles()
  const { data: allRecords = [] } = useVehicleRecords()
  const { createVehicle, updateVehicle, removeVehicle, createRecord, removeRecord } =
    useVehicleMutations()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [recordFormVehicleId, setRecordFormVehicleId] = useState<string | null>(null)

  const recordsByVehicle = useMemo(() => {
    const map = new Map<string, VehicleRecord[]>()
    for (const r of allRecords) {
      const list = map.get(r.vehicleId) ?? []
      list.push(r)
      map.set(r.vehicleId, list)
    }
    return map
  }, [allRecords])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {vehicles.length === 0 ? 'Registra tus vehículos' : `${vehicles.length} vehículos`}
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setVehicleFormOpen(true)
          }}
        >
          <Plus /> Nuevo vehículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState icon={Car} message="Aún no registras vehículos." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {vehicles.map((vehicle) => {
              const isOpen = expanded === vehicle.id
              return (
                <motion.div
                  key={vehicle.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardContent className="space-y-0">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : vehicle.id)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                          <Car className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{vehicle.name}</p>
                          {vehicle.plate && (
                            <p className="truncate text-sm text-muted-foreground">{vehicle.plate}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Opciones de ${vehicle.name}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex size-9 items-center justify-center rounded-md hover:bg-accent"
                            >
                              <MoreVertical className="size-4" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(vehicle)
                                setVehicleFormOpen(true)
                              }}
                            >
                              <Pencil /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => removeVehicle.mutate(vehicle.id)}
                            >
                              <Trash2 /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3">
                              <VehicleDetail
                                records={recordsByVehicle.get(vehicle.id) ?? []}
                                onAddRecord={() => setRecordFormVehicleId(vehicle.id)}
                                onRemoveRecord={(id) => removeRecord.mutate(id)}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <VehicleFormDialog
        open={vehicleFormOpen}
        onOpenChange={setVehicleFormOpen}
        vehicle={editing}
        onSubmit={(data) => {
          if (editing) {
            updateVehicle.mutate({ id: editing.id, changes: data })
          } else {
            createVehicle.mutate(data)
          }
        }}
      />

      {recordFormVehicleId && (
        <VehicleRecordFormDialog
          open={Boolean(recordFormVehicleId)}
          onOpenChange={(open) => !open && setRecordFormVehicleId(null)}
          vehicleId={recordFormVehicleId}
          onSubmit={(data) => createRecord.mutate(data)}
        />
      )}
    </div>
  )
}
