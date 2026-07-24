import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sirve la app bajo /AuraHome/
const BASE = '/AuraHome/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'Aura Home',
        short_name: 'Aura Home',
        description: 'El centro de tu hogar: pagos, tareas, calendario y más.',
        lang: 'es',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        theme_color: '#0b0b12',
        background_color: '#0b0b12',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // El chunk de entrada agrupa React, Router, Framer Motion, Radix y Dexie
    // (necesarios en toda la app vía AppLayout); las páginas se cargan
    // en chunks aparte con React.lazy — ver src/App.tsx.
    chunkSizeWarningLimit: 600,
  },
})
