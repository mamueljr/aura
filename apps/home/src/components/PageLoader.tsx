import { Loader2 } from 'lucide-react'

/** Marcador de carga para páginas cargadas de forma diferida (code-splitting). */
export function PageLoader() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
