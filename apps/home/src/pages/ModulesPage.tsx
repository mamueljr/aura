import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Palette, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MODULES } from '@/config/navigation'

/** Entradas extra (no-módulos) accesibles solo desde el sidebar en desktop. */
const EXTRAS = [
  {
    id: 'ajustes',
    path: '/ajustes',
    label: 'Ajustes',
    icon: Settings,
    description: 'Respaldos, sincronización con Drive y notificaciones.',
  },
  {
    id: 'design',
    path: '/design',
    label: 'Aura Design',
    icon: Palette,
    description: 'Showcase interno del sistema de diseño Aura.',
  },
] as const

/** Directorio de todos los módulos de Aura Home. */
export function ModulesPage() {
  const entries = [...MODULES, ...EXTRAS]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entries.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.03, duration: 0.25, ease: 'easeOut' }}
        >
          <Link to={m.path} className="group block h-full">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex flex-col items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <m.icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium">{m.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {m.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
