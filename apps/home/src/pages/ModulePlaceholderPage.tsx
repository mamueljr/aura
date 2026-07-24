import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import type { ModuleDef } from '@/config/navigation'

/**
 * Placeholder de un módulo aún no implementado: presenta el módulo
 * y la versión del roadmap en la que estará disponible.
 */
export function ModulePlaceholderPage({ module }: { module: ModuleDef }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center gap-5 py-16 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
        <module.icon className="size-7" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-semibold">{module.label}</h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          {module.description}
        </p>
      </div>
      <Badge variant="secondary">Disponible en {module.plannedVersion}</Badge>
    </motion.div>
  )
}
