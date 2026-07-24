import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, FileStack, MoreVertical, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@aura/ui/components/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@aura/ui/components/dropdown-menu'
import { Input } from '@aura/ui/components/input'
import { EmptyState } from '@/components/EmptyState'
import { Plus } from 'lucide-react'
import { useDocuments } from '@/hooks/queries'
import { useDocumentBlobUrl } from '@/hooks/useDocumentBlobUrl'
import { daysUntil, parseLocalDate, relativeDayLabel } from '@/utils/dates'
import type { AuraDocument, DocumentCategory } from '@/types/entities'
import {
  DOCUMENT_CATEGORY_META,
  fileIconFor,
  formatFileSize,
} from './document-meta'
import { DocumentFormDialog } from './DocumentFormDialog'
import { useDocumentMutations } from './useDocumentMutations'

function expiryBadgeVariant(days: number): 'destructive' | 'default' | 'secondary' {
  if (days < 0) return 'destructive'
  if (days <= 30) return 'default'
  return 'secondary'
}

function DocumentCard({
  doc,
  onPreview,
  onRemove,
}: {
  doc: AuraDocument
  onPreview: () => void
  onRemove: () => void
}) {
  const meta = DOCUMENT_CATEGORY_META[doc.category]
  const isImage = doc.fileType.startsWith('image/')
  const Icon = fileIconFor(doc.fileType)
  const expiryDays = doc.expiryDate ? daysUntil(doc.expiryDate) : null
  const blobUrl = useDocumentBlobUrl(doc.id)

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
          <button
            type="button"
            onClick={onPreview}
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-accent-foreground"
            aria-label={`Ver ${doc.title}`}
          >
            {isImage && blobUrl ? (
              <img src={blobUrl} alt="" className="size-full object-cover" />
            ) : (
              <Icon className="size-5" />
            )}
          </button>

          <button type="button" onClick={onPreview} className="min-w-0 flex-1 text-left">
            <p className="truncate font-medium">{doc.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {meta.label} · {formatFileSize(doc.fileSize)}
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {expiryDays !== null && (
              <Badge variant={expiryBadgeVariant(expiryDays)}>
                {expiryDays < 0 ? 'Vencido' : relativeDayLabel(doc.expiryDate!)}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`Opciones de ${doc.title}`}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild disabled={!blobUrl}>
                  <a href={blobUrl ?? undefined} download={doc.fileName}>
                    <Download /> Descargar
                  </a>
                </DropdownMenuItem>
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

function PreviewOverlay({ doc, onClose }: { doc: AuraDocument; onClose: () => void }) {
  const isImage = doc.fileType.startsWith('image/')
  const isPdf = doc.fileType === 'application/pdf'
  const blobUrl = useDocumentBlobUrl(doc.id)

  return (
    <div
      role="dialog"
      aria-label={doc.title}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-white">
        <div className="min-w-0">
          <p className="truncate font-medium">{doc.title}</p>
          <p className="text-xs text-white/70">
            {parseLocalDate(doc.createdAt).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" asChild disabled={!blobUrl}>
            <a href={blobUrl ?? undefined} download={doc.fileName}>
              <Download className="size-4" /> Descargar
            </a>
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto">
        {!blobUrl ? (
          <p className="text-white/80">Descargando el archivo desde tu otro dispositivo…</p>
        ) : isImage ? (
          <img src={blobUrl} alt={doc.title} className="max-h-full max-w-full rounded-lg" />
        ) : isPdf ? (
          <iframe src={blobUrl} title={doc.title} className="size-full rounded-lg bg-white" />
        ) : (
          <p className="text-white/80">
            Vista previa no disponible para este tipo de archivo. Descárgalo para verlo.
          </p>
        )}
      </div>
    </div>
  )
}

/** Módulo de Documentos: garantías, contratos, seguros, recibos y manuales. */
export function DocumentsPage() {
  const { data: documents = [] } = useDocuments()
  const { createDocument, removeDocument } = useDocumentMutations()

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [preview, setPreview] = useState<AuraDocument | null>(null)

  const byCategory = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = documents.filter(
      (d) => !q || d.title.toLowerCase().includes(q),
    )
    const grouped = new Map<DocumentCategory, AuraDocument[]>()
    for (const d of filtered) {
      const list = grouped.get(d.category) ?? []
      list.push(d)
      grouped.set(d.category, list)
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return [...grouped.entries()]
  }, [documents, query])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar documento…"
          className="min-w-40 flex-1"
        />
        <Button onClick={() => setFormOpen(true)}>
          <Plus />
          <span className="hidden sm:inline">Subir documento</span>
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileStack}
          message="Sin documentos aún. Guarda garantías, contratos y recibos importantes."
        />
      ) : byCategory.length === 0 ? (
        <EmptyState icon={FileStack} message="Sin resultados para tu búsqueda." />
      ) : (
        byCategory.map(([category, list]) => (
          <section key={category} className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {DOCUMENT_CATEGORY_META[category].label}
            </h3>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {list.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onPreview={() => setPreview(doc)}
                    onRemove={() => removeDocument.mutate(doc.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))
      )}

      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data, blob) => createDocument.mutate({ data, blob })}
      />

      {preview && <PreviewOverlay doc={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
