import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    // Lo inyecta vite.config.ts en la app real; aquí basta un valor fijo.
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'node',
    // IndexedDB en memoria para poder probar Dexie fuera del navegador.
    setupFiles: ['fake-indexeddb/auto'],
  },
});
