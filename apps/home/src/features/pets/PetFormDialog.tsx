import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aura/ui/components/dialog'
import { Button } from '@aura/ui/components/button'
import { Input } from '@aura/ui/components/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PET_SPECIES, type NewEntity, type Pet, type PetSpecies } from '@/types/entities'
import { PET_SPECIES_META } from './pet-meta'

interface PetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pet: Pet | null
  onSubmit: (data: NewEntity<Pet>) => void
}

interface FormState {
  name: string
  species: PetSpecies
  breed: string
  birthDate: string
  notes: string
}

function initialState(pet: Pet | null): FormState {
  return {
    name: pet?.name ?? '',
    species: pet?.species ?? 'perro',
    breed: pet?.breed ?? '',
    birthDate: pet?.birthDate ?? '',
    notes: pet?.notes ?? '',
  }
}

/** Formulario de alta/edición de una mascota. */
export function PetFormDialog({ open, onOpenChange, pet, onSubmit }: PetFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(pet))

  useEffect(() => {
    if (open) setForm(initialState(pet))
  }, [open, pet])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.name.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<Pet> = { name: form.name.trim(), species: form.species }
    const breed = form.breed.trim()
    const notes = form.notes.trim()
    if (breed) data.breed = breed
    if (form.birthDate) data.birthDate = form.birthDate
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pet ? 'Editar mascota' : 'Nueva mascota'}</DialogTitle>
          <DialogDescription>Un perfil por cada integrante peludo de la familia.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pet-name">Nombre</Label>
              <Input id="pet-name" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-species">Especie</Label>
              <Select value={form.species} onValueChange={(v) => set('species', v as PetSpecies)}>
                <SelectTrigger id="pet-species" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PET_SPECIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PET_SPECIES_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pet-breed">Raza (opcional)</Label>
              <Input id="pet-breed" value={form.breed} onChange={(e) => set('breed', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-birth">Nacimiento (opcional)</Label>
              <Input
                id="pet-birth"
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pet-notes">Notas (opcional)</Label>
            <Textarea id="pet-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {pet ? 'Guardar cambios' : 'Agregar mascota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
