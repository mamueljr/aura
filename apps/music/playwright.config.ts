import { defineConfig } from '@playwright/test';

/**
 * Smoke E2E de Aura Music. Se ejecuta aparte de `pnpm test` (vitest) a
 * propósito: es lento y depende de un navegador, así que NO entra en el
 * pre-push hook. Lanzar con `pnpm --filter aura-music test:e2e`.
 *
 * Usa el dev server de Vite con base '/' para que las rutas sean simples.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'VITE_BASE=/ pnpm dev --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
