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
import { Switch } from '@aura/ui/components/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  CONTACT_CATEGORIES,
  type Contact,
  type ContactCategory,
  type NewEntity,
} from '@/types/entities'
import { CONTACT_CATEGORY_META } from './contact-meta'

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
  onSubmit: (data: NewEntity<Contact>) => void
}

interface FormState {
  name: string
  category: ContactCategory
  role: string
  phone: string
  email: string
  notes: string
  isEmergency: boolean
}

function initialState(contact: Contact | null): FormState {
  return {
    name: contact?.name ?? '',
    category: contact?.category ?? 'familia',
    role: contact?.role ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    notes: contact?.notes ?? '',
    isEmergency: contact?.isEmergency ?? false,
  }
}

/** Formulario de alta/edición de un contacto. */
export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: ContactFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(contact))

  useEffect(() => {
    if (open) setForm(initialState(contact))
  }, [open, contact])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.name.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<Contact> = {
      name: form.name.trim(),
      category: form.category,
      isEmergency: form.isEmergency,
    }
    const role = form.role.trim()
    const phone = form.phone.trim()
    const email = form.email.trim()
    const notes = form.notes.trim()
    if (role) data.role = role
    if (phone) data.phone = phone
    if (email) data.email = email
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
          <DialogDescription>
            Familia, doctores, plomero… todo a la mano cuando lo necesites.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ct-name">Nombre</Label>
              <Input
                id="ct-name"
                placeholder="Ej. Dra. García"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-role">Rol (opcional)</Label>
              <Input
                id="ct-role"
                placeholder="Ej. Pediatra"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ct-category">Categoría</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set('category', v as ContactCategory)}
            >
              <SelectTrigger id="ct-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CONTACT_CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ct-phone">Teléfono</Label>
              <Input
                id="ct-phone"
                type="tel"
                placeholder="55 1234 5678"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-email">Email</Label>
              <Input
                id="ct-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label htmlFor="ct-emergency" className="cursor-pointer">
              Contacto de emergencia
            </Label>
            <Switch
              id="ct-emergency"
              checked={form.isEmergency}
              onCheckedChange={(v) => set('isEmergency', v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ct-notes">Notas (opcional)</Label>
            <Textarea
              id="ct-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {contact ? 'Guardar cambios' : 'Agregar contacto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
