import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Icon className="size-6 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionTo && (
        <Button asChild variant="outline" size="sm">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}
