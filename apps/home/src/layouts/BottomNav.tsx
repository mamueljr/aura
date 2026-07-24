import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BOTTOM_NAV_IDS,
  MODULES,
  NAV_HOME,
  NAV_MODULES,
} from '@/config/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  NAV_HOME,
  ...BOTTOM_NAV_IDS.map((id) => {
    const m = MODULES.find((mod) => mod.id === id)
    if (!m) throw new Error(`Módulo desconocido en BOTTOM_NAV_IDS: ${id}`)
    return { path: m.path, label: m.label, icon: m.icon }
  }),
  NAV_MODULES,
]

/** Barra de navegación inferior — solo en móvil. */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="glass fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-x-3 top-1 h-8 rounded-full bg-accent"
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 size-5 transition-colors',
                    isActive ? 'text-accent-foreground' : 'text-muted-foreground',
                  )}
                />
                <span
                  className={cn(
                    'relative z-10 truncate transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
