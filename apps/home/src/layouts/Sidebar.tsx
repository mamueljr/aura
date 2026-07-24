import { NavLink } from 'react-router-dom'
import { Palette, Settings } from 'lucide-react'
import { MODULES, NAV_HOME } from '@/config/navigation'
import { APP_CONFIG } from '@/config/app'
import { cn } from '@/lib/utils'

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )
      }
    >
      <Icon className="size-4.5 shrink-0" />
      {label}
    </NavLink>
  )
}

/** Navegación lateral — visible desde md hacia arriba. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="size-9 rounded-xl bg-gradient-to-br from-aura-400 to-aura-700 shadow-md shadow-aura-500/25" />
        <div className="leading-tight">
          <p className="font-heading text-sm font-semibold">{APP_CONFIG.name}</p>
          <p className="text-xs text-muted-foreground">Tu hogar, en orden</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <SidebarLink to={NAV_HOME.path} label={NAV_HOME.label} icon={NAV_HOME.icon} />
        <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Módulos
        </p>
        {MODULES.map((m) => (
          <SidebarLink key={m.id} to={m.path} label={m.label} icon={m.icon} />
        ))}
      </nav>

      <div className="border-t px-3 py-3">
        <SidebarLink to="/ajustes" label="Ajustes" icon={Settings} />
        <SidebarLink to="/design" label="Aura Design" icon={Palette} />
        <p className="px-3 pt-2 text-xs text-muted-foreground/60">
          v{APP_CONFIG.version}
        </p>
      </div>
    </aside>
  )
}
