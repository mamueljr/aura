import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, Pencil, Plus, Trash2, Wrench } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aura/ui/components/select'
import { EmptyState } from '@/components/EmptyState'
import { useMaintenance } from '@/hooks/queries'
import { daysUntil, parseLocalDate, relativeDayLabel } from '@/utils/dates'
import { formatCurrency } from '@/utils/format'
import {
  MAINTENANCE_AREAS,
  type MaintenanceArea,
  type MaintenanceRecord,
} from '@/types/entities'
import { MaintenanceFormDialog } from './MaintenanceFormDialog'
import { MAINTENANCE_AREA_META } from './maintenance-meta'
import { useMaintenanceMutations } from './useMaintenanceMutations'

function RecordCard({
  record,
  onEdit,
  onRemove,
  onPhoto,
}: {
  record: MaintenanceRecord
  onEdit: () => void
  onRemove: () => void
  onPhoto: (src: string) => void
}) {
  const meta = MAINTENANCE_AREA_META[record.area]
  const upcoming =
    record.nextDate !== undefined && daysUntil(record.nextDate) >= 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <meta.icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{record.title}</p>
              <p className="text-sm text-muted-foreground">
                {meta.label} ·{' '}
                {parseLocalDate(record.date).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {record.cost !== undefined &&
                  ` · ${formatCurrency(record.cost)}`}
              </p>
              {record.notes && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {record.notes}
                </p>
              )}
              {upcoming && record.nextDate && (
                <Badge variant="secondary" className="mt-1.5">
                  Próximo: {relativeDayLabel(record.nextDate)}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Opciones de ${record.title}`}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onRemove}>
                  <Trash2 /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {record.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {record.photos.map((photo, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPhoto(photo)}
                  className="shrink-0"
                  aria-label={`Ver foto ${i + 1} de ${record.title}`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="size-16 rounded-lg border object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Módulo de Mantenimiento: registros por área con costos y fotos. */
export function MaintenancePage() {
  const { data: records = [] } = useMaintenance()
  const { createRecord, updateRecord, removeRecord } =
    useMaintenanceMutations()

  const [areaFilter, setAreaFilter] = useState<MaintenanceArea | 'todas'>(
    'todas',
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null)
  const [photoView, setPhotoView] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      records
        .filter((r) => areaFilter === 'todas' || r.area === areaFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, areaFilter],
  )

  const yearTotal = useMemo(() => {
    const year = String(new Date().getFullYear())
    return records
      .filter((r) => r.date.startsWith(year))
      .reduce((sum, r) => sum + (r.cost ?? 0), 0)
  }, [records])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={areaFilter}
          onValueChange={(v) => setAreaFilter(v as MaintenanceArea | 'todas')}
        >
          <SelectTrigger className="w-52" aria-label="Filtrar por área">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {MAINTENANCE_AREAS.map((a) => (
              <SelectItem key={a} value={a}>
                {MAINTENANCE_AREA_META[a].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          {yearTotal > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(yearTotal)} este año
            </p>
          )}
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus />
            <span className="hidden sm:inline">Registrar</span>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          message="Sin mantenimientos registrados. Empieza con el último que hayas hecho."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((r) => (
              <RecordCard
                key={r.id}
                record={r}
                onEdit={() => {
                  setEditing(r)
                  setFormOpen(true)
                }}
                onRemove={() => removeRecord.mutate(r.id)}
                onPhoto={setPhotoView}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <MaintenanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        onSubmit={(data) => {
          if (editing) {
            updateRecord.mutate({ id: editing.id, changes: data })
          } else {
            createRecord.mutate(data)
          }
        }}
      />

      {photoView && (
        <button
          type="button"
          aria-label="Cerrar foto"
          onClick={() => setPhotoView(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <img
            src={photoView}
            alt="Fotografía de mantenimiento"
            className="max-h-full max-w-full rounded-xl"
          />
        </button>
      )}
    </div>
  )
}
