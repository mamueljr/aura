import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { TransactionsPage } from '@/features/transactions/TransactionsPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route index element={<TransactionsPage />} />
        <Route path="*" element={<TransactionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
