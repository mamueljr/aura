import { motion } from 'framer-motion'
import { Button } from '@aura/ui/components/button'
import { APP_CONFIG } from '@/config/app'

interface WelcomePageProps {
  onComplete: () => void
}

/** Bienvenida de primer uso: se muestra una sola vez antes del Dashboard. */
export function WelcomePage({ onComplete }: WelcomePageProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="size-20 rounded-2xl bg-gradient-to-br from-aura-400 to-aura-700 shadow-xl shadow-aura-500/30"
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
        className="space-y-2"
      >
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          {APP_CONFIG.name}
        </h1>
        <p className="max-w-sm text-balance text-muted-foreground">
          Pagos, tareas, calendario, mantenimiento, documentos y más — todo el
          hogar en un solo lugar, sin conexión y sin cuentas.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
      >
        <Button size="lg" onClick={onComplete}>
          Comenzar
        </Button>
      </motion.div>
    </main>
  )
}
