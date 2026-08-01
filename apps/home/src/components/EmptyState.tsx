import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@aura/ui/components/button'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  actionLabel?: string
  actionTo?: string
}

/** Estado vacío compacto para tarjetas y listas. */
export function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  actionTo,
}: EmptyStateProps) {
  return (
    // Compacto a propósito: en un panel recién estrenado casi todo está vacío,
    // y con mucho aire cada hueco parecía un agujero.
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionTo && (
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}
