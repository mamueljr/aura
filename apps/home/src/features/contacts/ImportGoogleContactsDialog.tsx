import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aura/ui/components/dialog'
import { Button } from '@aura/ui/components/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'
import { fetchGoogleContacts, type GoogleContact } from '@/services/google-contacts.service'
import {
  CONTACT_CATEGORIES,
  type Contact,
  type ContactCategory,
  type NewEntity,
} from '@/types/entities'
import { CONTACT_CATEGORY_META } from './contact-meta'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

function existingKey(phone?: string, email?: string): { p: string | null; e: string | null } {
  return {
    p: phone ? `p:${normalizePhone(phone)}` : null,
    e: email ? `e:${email.trim().toLowerCase()}` : null,
  }
}

interface ImportGoogleContactsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingContacts: Contact[]
  onImport: (contacts: NewEntity<Contact>[]) => void
}

/** Diálogo para elegir e importar contactos desde la cuenta de Google del usuario. */
export function ImportGoogleContactsDialog({
  open,
  onOpenChange,
  existingContacts,
  onImport,
}: ImportGoogleContactsDialogProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [googleContacts, setGoogleContacts] = useState<GoogleContact[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState<ContactCategory>('familia')
  const [reloadTick, setReloadTick] = useState(0)

  const existingKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const c of existingContacts) {
      const { p, e } = existingKey(c.phone, c.email)
      if (p) keys.add(p)
      if (e) keys.add(e)
    }
    return keys
  }, [existingContacts])

  useEffect(() => {
    if (!open) return
    setStatus('loading')
    setError('')
    fetchGoogleContacts()
      .then((list) => {
        setGoogleContacts(list)
        setSelected(
          new Set(
            list
              .filter((c) => {
                const { p, e } = existingKey(c.phone, c.email)
                return !((p && existingKeys.has(p)) || (e && existingKeys.has(e)))
              })
              .map((c) => c.resourceName),
          ),
        )
        setStatus('ready')
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los contactos de Google.',
        )
        setStatus('error')
      })
    // existingKeys se recalcula con existingContacts; no debe re-disparar la carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reloadTick])

  function toggle(resourceName: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(resourceName)) next.delete(resourceName)
      else next.add(resourceName)
      return next
    })
  }

  function handleImport() {
    const items: NewEntity<Contact>[] = googleContacts
      .filter((c) => selected.has(c.resourceName))
      .map((c) => ({
        name: c.name,
        category,
        isEmergency: false,
        ...(c.phone ? { phone: c.phone } : {}),
        ...(c.email ? { email: c.email } : {}),
      }))
    onImport(items)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar de Google</DialogTitle>
          <DialogDescription>
            Elige qué contactos de tu cuenta de Google agregar. Los que ya
            tienes registrados aparecen desmarcados.
          </DialogDescription>
        </DialogHeader>

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando contactos…
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReloadTick((t) => t + 1)}
            >
              <RefreshCw /> Reintentar
            </Button>
          </div>
        )}

        {status === 'ready' && googleContacts.length === 0 && (
          <EmptyState
            icon={Users}
            message="No se encontraron contactos en tu cuenta de Google."
          />
        )}

        {status === 'ready' && googleContacts.length > 0 && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            <div className="space-y-2">
              <Label>Categoría para los importados</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ContactCategory)}
              >
                <SelectTrigger className="w-full">
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

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {selected.size} de {googleContacts.length} seleccionados
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() =>
                    setSelected(new Set(googleContacts.map((c) => c.resourceName)))
                  }
                >
                  Todos
                </button>
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setSelected(new Set())}
                >
                  Ninguno
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {googleContacts.map((c) => {
                const { p, e } = existingKey(c.phone, c.email)
                const isDuplicate = Boolean(
                  (p && existingKeys.has(p)) || (e && existingKeys.has(e)),
                )
                return (
                  <label
                    key={c.resourceName}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.has(c.resourceName)}
                      onCheckedChange={() => toggle(c.resourceName)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.phone, c.email].filter(Boolean).join(' · ') ||
                          'Sin teléfono ni correo'}
                      </p>
                    </div>
                    {isDuplicate && (
                      <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                        Ya existe
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={status !== 'ready' || selected.size === 0}
            onClick={handleImport}
          >
            Importar{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
