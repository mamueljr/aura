import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    // IndexedDB en memoria para poder probar Dexie fuera del navegador.
    setupFiles: ['fake-indexeddb/auto'],
  },
})
