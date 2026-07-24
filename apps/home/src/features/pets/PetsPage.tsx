import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, PawPrint, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/EmptyState'
import { usePetRecords, usePets } from '@/hooks/queries'
import { parseLocalDate, relativeDayLabel } from '@/utils/dates'
import type { Pet, PetRecord } from '@/types/entities'
import { PET_RECORD_KIND_META, PET_SPECIES_META } from './pet-meta'
import { PetFormDialog } from './PetFormDialog'
import { PetRecordFormDialog } from './PetRecordFormDialog'
import { usePetMutations } from './usePetMutations'

function PetDetail({
  records,
  onAddRecord,
  onRemoveRecord,
}: {
  records: PetRecord[]
  onAddRecord: () => void
  onRemoveRecord: (id: string) => void
}) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const lastWeight = records
    .filter((r) => r.kind === 'peso')
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const upcoming = records.filter(
    (r) => r.nextDate && parseLocalDate(r.nextDate) >= new Date(new Date().toDateString()),
  )

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {lastWeight?.weightKg !== undefined && (
          <Badge variant="secondary">{lastWeight.weightKg} kg</Badge>
        )}
        {upcoming.map((r) => (
          <Badge key={r.id} variant="default">
            {PET_RECORD_KIND_META[r.kind].label}: {relativeDayLabel(r.nextDate!)}
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
            const meta = PET_RECORD_KIND_META[r.kind]
            return (
              <li key={r.id} className="group flex items-center gap-2.5 text-sm">
                <meta.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {r.title}
                  <span className="text-muted-foreground">
                    {' · '}
                    {parseLocalDate(r.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRecord(r.id)}
                  aria-label={`Eliminar registro ${r.title}`}
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

/** Módulo de Mascotas: perfil, vacunas, veterinario, medicamentos y peso. */
export function PetsPage() {
  const { data: pets = [] } = usePets()
  const { data: allRecords = [] } = usePetRecords()
  const { createPet, updatePet, removePet, createRecord, removeRecord } =
    usePetMutations()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [petFormOpen, setPetFormOpen] = useState(false)
  const [editing, setEditing] = useState<Pet | null>(null)
  const [recordFormPetId, setRecordFormPetId] = useState<string | null>(null)

  const recordsByPet = useMemo(() => {
    const map = new Map<string, PetRecord[]>()
    for (const r of allRecords) {
      const list = map.get(r.petId) ?? []
      list.push(r)
      map.set(r.petId, list)
    }
    return map
  }, [allRecords])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {pets.length === 0 ? 'Registra a tus mascotas' : `${pets.length} mascotas`}
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setPetFormOpen(true)
          }}
        >
          <Plus /> Nueva mascota
        </Button>
      </div>

      {pets.length === 0 ? (
        <EmptyState icon={PawPrint} message="Aún no registras mascotas." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {pets.map((pet) => {
              const meta = PET_SPECIES_META[pet.species]
              const isOpen = expanded === pet.id
              return (
                <motion.div
                  key={pet.id}
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
                        onClick={() => setExpanded(isOpen ? null : pet.id)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                          <meta.icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{pet.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {pet.breed ? `${pet.breed} · ${meta.label}` : meta.label}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Opciones de ${pet.name}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex size-9 items-center justify-center rounded-md hover:bg-accent"
                            >
                              <MoreVertical className="size-4" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(pet)
                                setPetFormOpen(true)
                              }}
                            >
                              <Pencil /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => removePet.mutate(pet.id)}
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
                              <PetDetail
                                records={recordsByPet.get(pet.id) ?? []}
                                onAddRecord={() => setRecordFormPetId(pet.id)}
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

      <PetFormDialog
        open={petFormOpen}
        onOpenChange={setPetFormOpen}
        pet={editing}
        onSubmit={(data) => {
          if (editing) {
            updatePet.mutate({ id: editing.id, changes: data })
          } else {
            createPet.mutate(data)
          }
        }}
      />

      {recordFormPetId && (
        <PetRecordFormDialog
          open={Boolean(recordFormPetId)}
          onOpenChange={(open) => !open && setRecordFormPetId(null)}
          petId={recordFormPetId}
          onSubmit={(data) => createRecord.mutate(data)}
        />
      )}
    </div>
  )
}
