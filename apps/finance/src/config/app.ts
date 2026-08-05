/**
 * Configuración de Aura Finance.
 */
export const APP_CONFIG = {
  /** Slug de la app en el ecosistema; identifica el respaldo. */
  slug: 'aura-finance',
  version: '0.1.0',

  /**
   * Client ID de OAuth compartido con el resto del ecosistema Aura.
   *
   * Es el mismo que usan Aura Home y Aura Music a propósito: las tres apps
   * se sirven desde el mismo origen (`mamueljr.github.io`), así que el
   * origen autorizado ya vale para todas y el usuario da su consentimiento
   * una sola vez. Comparten por tanto la misma `appDataFolder` de Drive,
   * pero cada app escribe su propio archivo (`aura-finance-backup.json`),
   * así que no se pisan. Contrapartida: revocar el acceso afecta a las tres.
   */
  googleClientId: '348046896392-tlkgkvvoga6dicoqpifsurv799bqjpja.apps.googleusercontent.com',
} as const;
