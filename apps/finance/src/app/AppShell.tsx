import { NavLink, Outlet } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', label: 'Movimientos', end: true },
  { to: '/resumen', label: 'Resumen', end: false },
];

export function AppShell() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <div className="finance-gradient flex size-10 items-center justify-center rounded-xl text-white">
          <Wallet className="size-5" aria-hidden="true" />
        </div>
        <h1 className="finance-text text-xl font-bold">Aura Finance</h1>
      </header>

      <nav className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex-1 rounded-md py-1.5 text-center text-sm font-medium transition-colors',
                isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </main>
  );
}
