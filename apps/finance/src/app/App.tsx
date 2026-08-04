import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/app/AppShell';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { SummaryPage } from '@/features/summary/SummaryPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TransactionsPage />} />
          <Route path="resumen" element={<SummaryPage />} />
          <Route path="*" element={<TransactionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
