import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { HomePage } from '@/pages/HomePage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
