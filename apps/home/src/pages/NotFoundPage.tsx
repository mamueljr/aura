import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <Compass className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">
          Esta página no existe
        </h2>
        <p className="text-sm text-muted-foreground">
          Quizá el enlace cambió o nunca estuvo aquí.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}
