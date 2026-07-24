import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { App } from '@/App'
import { queryClient } from '@/config/query-client'
import '@/index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('No se encontró el elemento #root')
}

createRoot(container).render(
  <StrictMode>
    {/* reducedMotion="user": respeta prefers-reduced-motion del sistema
        en todas las animaciones de Framer Motion de la app. */}
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
)
