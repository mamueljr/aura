import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
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
import { Label } from '@aura/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aura/ui/components/select'
import { Textarea } from '@aura/ui/components/textarea'
import {
  BLOOD_TYPES,
  FAMILY_RELATIONS,
  type BloodType,
  type FamilyMember,
  type FamilyRelation,
  type NewEntity,
} from '@/types/entities'
import { compressImage } from '@/utils/images'
import { FAMILY_RELATION_META } from './family-meta'

interface FamilyMemberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FamilyMember | null
  onSubmit: (data: NewEntity<FamilyMember>) => void
}

interface FormState {
  name: string
  relation: FamilyRelation
  birthDate: string
  photo: string | null
  curp: string
  rfc: string
  nss: string
  bloodType: BloodType | ''
  allergies: string
  phone: string
  email: string
  insurancePolicy: string
  notes: string
}

function initialState(member: FamilyMember | null): FormState {
  return {
    name: member?.name ?? '',
    relation: member?.relation ?? 'hijo_hija',
    birthDate: member?.birthDate ?? '',
    photo: member?.photo ?? null,
    curp: member?.curp ?? '',
    rfc: member?.rfc ?? '',
    nss: member?.nss ?? '',
    bloodType: member?.bloodType ?? '',
    allergies: member?.allergies ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    insurancePolicy: member?.insurancePolicy ?? '',
    notes: member?.notes ?? '',
  }
}

/** Formulario de alta/edición de un integrante de la familia. */
export function FamilyMemberFormDialog({
  open,
  onOpenChange,
  member,
  onSubmit,
}: FamilyMemberFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(member))
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setForm(initialState(member))
  }, [open, member])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid = form.name.trim().length > 0

  async function handlePhoto(file: File) {
    setProcessing(true)
    try {
      set('photo', await compressImage(file))
    } finally {
      setProcessing(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: NewEntity<FamilyMember> = {
      name: form.name.trim(),
      relation: form.relation,
    }
    if (form.birthDate) data.birthDate = form.birthDate
    if (form.photo) data.photo = form.photo
    const curp = form.curp.trim().toUpperCase()
    const rfc = form.rfc.trim().toUpperCase()
    const nss = form.nss.trim()
    const allergies = form.allergies.trim()
    const phone = form.phone.trim()
    const email = form.email.trim()
    const insurancePolicy = form.insurancePolicy.trim()
    const notes = form.notes.trim()
    if (curp) data.curp = curp
    if (rfc) data.rfc = rfc
    if (nss) data.nss = nss
    if (form.bloodType) data.bloodType = form.bloodType
    if (allergies) data.allergies = allergies
    if (phone) data.phone = phone
    if (email) data.email = email
    if (insurancePolicy) data.insurancePolicy = insurancePolicy
    if (notes) data.notes = notes
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? 'Editar integrante' : 'Nuevo integrante'}</DialogTitle>
          <DialogDescription>
            Datos importantes de cada quien, a la mano cuando los necesites.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fotografía (opcional)</Label>
            <div className="flex items-center gap-2">
              {form.photo ? (
                <div className="relative">
                  <img src={form.photo} alt="" className="size-16 rounded-lg border object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar fotografía"
                    onClick={() => set('photo', null)}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={processing}
                    className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Elegir fotografía"
                  >
                    <ImagePlus className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    disabled={processing}
                    className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Tomar foto"
                  >
                    <Camera className="size-5" />
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handlePhoto(file)
                e.target.value = ''
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handlePhoto(file)
                e.target.value = ''
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fam-name">Nombre completo</Label>
              <Input
                id="fam-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fam-relation">Relación</Label>
              <Select value={form.relation} onValueChange={(v) => set('relation', v as FamilyRelation)}>
                <SelectTrigger id="fam-relation" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {FAMILY_RELATION_META[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fam-birth">Fecha de nacimiento (opcional)</Label>
              <Input
                id="fam-birth"
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fam-blood">Tipo de sangre (opcional)</Label>
              <Select
                {...(form.bloodType ? { value: form.bloodType } : {})}
                onValueChange={(v) => set('bloodType', v as BloodType)}
              >
                <SelectTrigger id="fam-blood" className="w-full">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fam-curp">CURP (opcional)</Label>
              <Input
                id="fam-curp"
                value={form.curp}
                onChange={(e) => set('curp', e.target.value)}
                className="uppercase"
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fam-rfc">RFC (opcional)</Label>
              <Input
                id="fam-rfc"
                value={form.rfc}
                onChange={(e) => set('rfc', e.target.value)}
                className="uppercase"
                maxLength={13}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fam-nss">NSS (opcional)</Label>
              <Input id="fam-nss" value={form.nss} onChange={(e) => set('nss', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fam-insurance">Póliza de seguro (opcional)</Label>
              <Input
                id="fam-insurance"
                value={form.insurancePolicy}
                onChange={(e) => set('insurancePolicy', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fam-phone">Teléfono (opcional)</Label>
              <Input
                id="fam-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fam-email">Correo (opcional)</Label>
              <Input
                id="fam-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fam-allergies">Alergias / condiciones médicas (opcional)</Label>
            <Textarea
              id="fam-allergies"
              placeholder="Penicilina, asma, diabetes…"
              value={form.allergies}
              onChange={(e) => set('allergies', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fam-notes">Notas (opcional)</Label>
            <Textarea
              id="fam-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || processing}>
              {member ? 'Guardar cambios' : 'Agregar integrante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
