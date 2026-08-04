import { execSync } from 'node:child_process';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sirve el monorepo bajo /aura/ → esta app en /aura/music/.
// Override con VITE_BASE al construir.
const BASE = process.env.VITE_BASE ?? '/aura/music/';

// A short build stamp so we can confirm which version a device is actually
// running (useful when a cached service worker serves a stale bundle).
function buildStamp(): string {
  let sha = 'dev';
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // not a git checkout / git unavailable
  }
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${sha} · ${date}`;
}

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(buildStamp()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Aura Music',
        short_name: 'Aura',
        description: 'A premium, offline-first music player for your local library.',
        theme_color: '#0b0a12',
        background_color: '#0b0a12',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: BASE,
        scope: BASE,
        categories: ['music', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
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
        navigateFallback: `${BASE}index.html`,
        // The app is fully local-first: no runtime network caching is required.
        // External APIs (lyrics) fail gracefully offline.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Rollup 4 (Vite 8) ya no acepta la forma de objeto aquí; el mismo
        // reparto expresado como función.
        // Aquí solo van las dependencias que de verdad se usan desde el primer
        // pintado. Forzar un chunk para algo que NO se usa al arrancar sale
        // caro: `music-metadata` tenía el suyo ("media") y Rolldown acababa
        // colgándolo del grafo estático del entry, así que sus ~60 KB
        // comprimidos se descargaban siempre aunque solo los use el worker al
        // escanear. Sin regla, cae en el chunk perezoso que le corresponde.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(id)) {
            return 'react';
          }
          if (id.includes('node_modules/framer-motion/')) return 'motion';
          return undefined;
        },
      },
    },
  },
});
