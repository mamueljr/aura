import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/app/AppShell';

// Carga diferida por página: cada ruta baja su propio chunk y el inicial no
// arrastra SummaryPage/SettingsPage (y sus dependencias) al primer paint.
const TransactionsPage = lazy(() =>
  import('@/features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })),
);
const SummaryPage = lazy(() =>
  import('@/features/summary/SummaryPage').then((m) => ({ default: m.SummaryPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-20" role="status" aria-label="Cargando…">
      <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-muted-foreground" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<TransactionsPage />} />
            <Route path="resumen" element={<SummaryPage />} />
            <Route path="ajustes" element={<SettingsPage />} />
            <Route path="*" element={<TransactionsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
