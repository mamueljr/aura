import { RouterProvider } from 'react-router-dom';

import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { useAutoSync } from '@/hooks/useAutoSync';

export default function App() {
  useAutoSync();

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
