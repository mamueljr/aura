import {
  FileText,
  Receipt,
  ShieldCheck,
  Book,
  FileSignature,
  File,
  type LucideIcon,
} from 'lucide-react'
import type { DocumentCategory } from '@/types/entities'

export const DOCUMENT_CATEGORY_META: Record<
  DocumentCategory,
  { label: string; icon: LucideIcon }
> = {
  garantia: { label: 'Garantía', icon: ShieldCheck },
  contrato: { label: 'Contrato', icon: FileSignature },
  seguro: { label: 'Seguro', icon: ShieldCheck },
  recibo: { label: 'Recibo', icon: Receipt },
  manual: { label: 'Manual', icon: Book },
  otro: { label: 'Otro', icon: FileText },
}

export function fileIconFor(fileType: string): LucideIcon {
  if (fileType === 'application/pdf') return FileText
  return File
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
