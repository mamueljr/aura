import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Droplet,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
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
import { CopyButton } from '@/components/CopyButton'
import { EmptyState } from '@/components/EmptyState'
import { useFamilyMembers } from '@/hooks/queries'
import { parseLocalDate } from '@/utils/dates'
import type { FamilyMember } from '@/types/entities'
import { FAMILY_RELATION_META } from './family-meta'
import { FamilyMemberFormDialog } from './FamilyMemberFormDialog'
import { useFamilyMutations } from './useFamilyMutations'

function ageFromBirthDate(birthDate: string): number {
  const birth = parseLocalDate(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-0.5">
        <span className="truncate font-medium">{value}</span>
        <CopyButton value={value} label={label} />
      </span>
    </div>
  )
}

function MemberCard({
  member,
  onEdit,
  onRemove,
}: {
  member: FamilyMember
  onEdit: () => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = FAMILY_RELATION_META[member.relation]
  const age = member.birthDate ? ageFromBirthDate(member.birthDate) : null

  const hasDetails =
    member.curp ||
    member.rfc ||
    member.nss ||
    member.bloodType ||
    member.allergies ||
    member.phone ||
    member.email ||
    member.insurancePolicy ||
    member.notes

  return (
    <motion.div
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
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-3 text-left"
          >
            {member.photo ? (
              <img
                src={member.photo}
                alt=""
                className="size-11 shrink-0 rounded-xl border object-cover"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <meta.icon className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{member.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {meta.label}
                {age !== null && ` · ${age} años`}
              </p>
            </div>
            {member.bloodType && (
              <Badge variant="secondary">
                <Droplet className="size-3" /> {member.bloodType}
              </Badge>
            )}
            <span
              role="button"
              tabIndex={0}
              aria-label={expanded ? 'Ocultar datos' : 'Mostrar datos'}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {expanded ? 'Ocultar' : 'Mostrar'}
              <ChevronDown
                className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Opciones de ${member.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex size-9 items-center justify-center rounded-md hover:bg-accent"
                >
                  <MoreVertical className="size-4" />
                </span>
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
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 border-t pt-3">
                  {!hasDetails ? (
                    <p className="text-sm text-muted-foreground">Sin más datos registrados.</p>
                  ) : (
                    <>
                      {member.curp && <DetailRow label="CURP" value={member.curp} />}
                      {member.rfc && <DetailRow label="RFC" value={member.rfc} />}
                      {member.nss && <DetailRow label="NSS" value={member.nss} />}
                      {member.insurancePolicy && (
                        <DetailRow label="Seguro" value={member.insurancePolicy} />
                      )}
                      {member.phone && (
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={`tel:${member.phone}`}
                            className="flex min-w-0 items-center gap-2 text-sm text-primary"
                          >
                            <Phone className="size-3.5 shrink-0" />
                            <span className="truncate">{member.phone}</span>
                          </a>
                          <CopyButton value={member.phone} label="teléfono" />
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={`mailto:${member.email}`}
                            className="flex min-w-0 items-center gap-2 text-sm text-primary"
                          >
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </a>
                          <CopyButton value={member.email} label="correo" />
                        </div>
                      )}
                      {member.allergies && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Alergias/condiciones: </span>
                          {member.allergies}
                        </p>
                      )}
                      {member.notes && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Notas: </span>
                          {member.notes}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Módulo Familia y Datos: CURP, RFC, tipo de sangre y demás datos de cada quien. */
export function FamilyPage() {
  const { data: members = [] } = useFamilyMembers()
  const { createMember, updateMember, removeMember } = useFamilyMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {members.length === 0 ? 'Registra a tu familia' : `${members.length} integrantes`}
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus /> Nuevo integrante
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          message="Aún no registras a tu familia. Guarda CURP, RFC, tipo de sangre y más, a la mano cuando los necesites."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={() => {
                  setEditing(member)
                  setFormOpen(true)
                }}
                onRemove={() => removeMember.mutate(member.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <FamilyMemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
        onSubmit={(data) => {
          if (editing) {
            updateMember.mutate({ id: editing.id, changes: data })
          } else {
            createMember.mutate(data)
          }
        }}
      />
    </div>
  )
}
