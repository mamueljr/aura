import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Download,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Siren,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import { APP_CONFIG } from '@/config/app'
import { useContacts } from '@/hooks/queries'
import type { Contact, ContactCategory } from '@/types/entities'
import { CONTACT_CATEGORY_META } from './contact-meta'
import { ContactFormDialog } from './ContactFormDialog'
import { ImportGoogleContactsDialog } from './ImportGoogleContactsDialog'
import { useContactMutations } from './useContactMutations'

function ContactCard({
  contact,
  onEdit,
  onRemove,
}: {
  contact: Contact
  onEdit: () => void
  onRemove: () => void
}) {
  const meta = CONTACT_CATEGORY_META[contact.category]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <meta.icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{contact.name}</p>
              {contact.isEmergency && (
                <Siren className="size-3.5 shrink-0 text-destructive" />
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {contact.role ?? meta.label}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {contact.phone && (
              <Button size="icon" variant="ghost" asChild>
                <a href={`tel:${contact.phone}`} aria-label={`Llamar a ${contact.name}`}>
                  <Phone className="size-4" />
                </a>
              </Button>
            )}
            {contact.email && (
              <Button size="icon" variant="ghost" asChild>
                <a
                  href={`mailto:${contact.email}`}
                  aria-label={`Enviar correo a ${contact.name}`}
                >
                  <Mail className="size-4" />
                </a>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Opciones de ${contact.name}`}
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
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Módulo de Contactos: familia, salud, servicios y emergencias. */
export function ContactsPage() {
  const { data: contacts = [] } = useContacts()
  const { createContact, updateContact, removeContact, importContacts } =
    useContactMutations()

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const { emergency, byCategory } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = contacts.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q),
    )
    const grouped = new Map<ContactCategory, Contact[]>()
    for (const c of filtered) {
      const list = grouped.get(c.category) ?? []
      list.push(c)
      grouped.set(c.category, list)
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }
    return {
      emergency: filtered
        .filter((c) => c.isEmergency)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      byCategory: [...grouped.entries()],
    }
  }, [contacts, query])

  const cardHandlers = (contact: Contact) => ({
    onEdit: () => {
      setEditing(contact)
      setFormOpen(true)
    },
    onRemove: () => removeContact.mutate(contact.id),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar contacto…"
          className="min-w-40 flex-1"
        />
        {APP_CONFIG.googleClientId && (
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Download />
            <span className="hidden sm:inline">Importar de Google</span>
          </Button>
        )}
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus />
          <span className="hidden sm:inline">Nuevo contacto</span>
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          message="Sin contactos aún. Agrega a tu familia y servicios de confianza."
        />
      ) : (
        <>
          {emergency.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-destructive">
                <Siren className="size-3.5" /> Emergencias
              </h3>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {emergency.map((c) => (
                    <ContactCard key={c.id} contact={c} {...cardHandlers(c)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {byCategory.map(([category, list]) => (
            <section key={category} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {CONTACT_CATEGORY_META[category].label}
              </h3>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {list.map((c) => (
                    <ContactCard key={c.id} contact={c} {...cardHandlers(c)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {emergency.length === 0 && byCategory.length === 0 && (
            <EmptyState icon={Users} message="Sin resultados para tu búsqueda." />
          )}
        </>
      )}

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editing}
        onSubmit={(data) => {
          if (editing) {
            updateContact.mutate({ id: editing.id, changes: data })
          } else {
            createContact.mutate(data)
          }
        }}
      />

      {APP_CONFIG.googleClientId && (
        <ImportGoogleContactsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          existingContacts={contacts}
          onImport={(items) => importContacts.mutate(items)}
        />
      )}
    </div>
  )
}
