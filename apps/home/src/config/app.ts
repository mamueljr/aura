/**
 * Configuración global de Aura Home.
 * Punto único de verdad para metadatos de la app y del ecosistema Aura.
 */
export const APP_CONFIG = {
  name: 'Aura Home',
  version: '1.0.0',
  ecosystem: 'Aura',
  /** Base pública (GitHub Pages). Vite la inyecta en build. */
  baseUrl: import.meta.env.BASE_URL,
  /**
   * OAuth Client ID de Google para la sincronización con Drive.
   * Es público por diseño (flujo de token en el navegador, sin secreto).
   * Vacío = sincronización deshabilitada en la UI. Se crea en
   * console.cloud.google.com → Credenciales → ID de cliente OAuth (Web).
   */
  googleClientId: '348046896392-tlkgkvvoga6dicoqpifsurv799bqjpja.apps.googleusercontent.com',
} as const

/**
 * Apps hermanas del ecosistema. Solo identidad por ahora:
 * la integración real llegará en versiones futuras.
 */
export const AURA_ECOSYSTEM = [
  'aura-inventory',
  'aura-weather',
  'aura-music',
  'aura-notes',
  'aura-finance',
  'aura-vault',
] as const

export type AuraApp = (typeof AURA_ECOSYSTEM)[number]
