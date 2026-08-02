import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Node basta: WebCrypto, Blob y fetch existen en Node 22, y los tests de
    // `drive` montan los mínimos globales de navegador que necesitan.
    environment: 'node',
  },
})
