import { Suspense, useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageLoader } from '@/components/PageLoader'
import { ThemeToggle } from '@/components/ThemeToggle'
import { APP_CONFIG } from '@/config/app'
import { NAV_MODULES, findModuleByPath } from '@/config/navigation'
import { BottomNav } from '@/layouts/BottomNav'
import { Sidebar } from '@/layouts/Sidebar'

function usePageTitle(pathname: string): string {
  if (pathname === '/') return APP_CONFIG.name
  if (pathname === NAV_MODULES.path) return NAV_MODULES.label
  if (pathname === '/design') return 'Aura Design'
  if (pathname === '/ajustes') return 'Ajustes'
  return findModuleByPath(pathname)?.label ?? APP_CONFIG.name
}

/**
 * Shell principal: sidebar en desktop, barra inferior en móvil,
 * header translúcido y transiciones animadas entre páginas.
 */
export function AppLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const title = usePageTitle(location.pathname)

  useEffect(() => {
    document.title =
      title === APP_CONFIG.name ? APP_CONFIG.name : `${title} · ${APP_CONFIG.name}`
  }, [title])

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 md:px-8">
          <h1 className="font-heading text-lg font-semibold tracking-tight">
            {title}
          </h1>
          <ThemeToggle />
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            id="main-content"
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10"
          >
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
            </ErrorBoundary>
          </motion.main>
        </AnimatePresence>

        <BottomNav />
      </div>
    </div>
  )
}
