import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, Leaf, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { usePlants } from '@/hooks/queries'
import { relativeDayLabel } from '@/utils/dates'
import type { Plant } from '@/types/entities'
import { daysUntilWatering } from './plant-utils'
import { PlantFormDialog } from './PlantFormDialog'
import { usePlantMutations } from './usePlantMutations'

function wateringBadgeVariant(days: number): 'destructive' | 'default' | 'secondary' {
  if (days < 0) return 'destructive'
  if (days === 0) return 'default'
  return 'secondary'
}

function PlantCard({
  plant,
  onWater,
  onEdit,
  onRemove,
}: {
  plant: Plant
  onWater: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const days = daysUntilWatering(plant)
  const nextDate =
    plant.lastWateredDate &&
    (() => {
      const d = new Date(plant.lastWateredDate)
      d.setDate(d.getDate() + plant.wateringFrequencyDays)
      return d.toISOString().slice(0, 10)
    })()

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
          <div className="flex items-center gap-3">
            {plant.photos[0] ? (
              <img
                src={plant.photos[0]}
                alt=""
                className="size-11 shrink-0 rounded-xl border object-cover"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Leaf className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{plant.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {plant.location ? `${plant.location} · ` : ''}
                Cada {plant.wateringFrequencyDays} días
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {days === null ? (
                <Badge variant="secondary">Sin regar</Badge>
              ) : (
                <Badge variant={wateringBadgeVariant(days)}>
                  {days <= 0 ? 'Regar hoy' : `Riego ${relativeDayLabel(nextDate ?? '')}`}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={onWater}>
                <Droplets className="size-4" />
                <span className="hidden sm:inline">Regar</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label={`Opciones de ${plant.name}`}>
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Módulo de Plantas: riego, fertilización y fotografías. */
export function PlantsPage() {
  const { data: plants = [] } = usePlants()
  const { createPlant, updatePlant, removePlant, waterPlant } = usePlantMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Plant | null>(null)

  const sorted = [...plants].sort((a, b) => {
    const da = daysUntilWatering(a) ?? -Infinity
    const db = daysUntilWatering(b) ?? -Infinity
    return da - db
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {plants.length === 0 ? 'Registra tus plantas' : `${plants.length} plantas`}
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus /> Nueva planta
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Leaf} message="Sin plantas registradas todavía." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {sorted.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onWater={() => waterPlant.mutate(plant.id)}
                onEdit={() => {
                  setEditing(plant)
                  setFormOpen(true)
                }}
                onRemove={() => removePlant.mutate(plant.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <PlantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plant={editing}
        onSubmit={(data) => {
          if (editing) {
            updatePlant.mutate({ id: editing.id, changes: data })
          } else {
            createPlant.mutate(data)
          }
        }}
      />
    </div>
  )
}
