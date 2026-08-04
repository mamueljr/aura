import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// GitHub Pages sirve el monorepo bajo /aura/ → esta app en /aura/finance/.
// Override con VITE_BASE al construir.
const BASE = process.env.VITE_BASE ?? '/aura/finance/';

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
  },
});
