/**
 * Configuración de Aura Music.
 */
export const APP_CONFIG = {
  /** Slug de la app en el ecosistema; identifica el respaldo. */
  slug: 'aura-music',

  /**
   * Client ID de OAuth compartido con el resto del ecosistema Aura.
   *
   * Es el mismo que usa Aura Home a propósito: ambas apps se sirven desde el
   * mismo origen (`mamueljr.github.io`), así que el origen autorizado ya vale
   * para las dos, y el usuario da su consentimiento una sola vez.
   *
   * Comparten por tanto la misma `appDataFolder` de Drive, pero cada app escribe
   * su propio archivo (`aura-home-backup.json` / `aura-music-backup.json`), así
   * que no se pisan. Contrapartida: revocar el acceso afecta a ambas.
   *
   * En desarrollo, el origen (p. ej. `http://localhost:5181`) debe estar dado de
   * alta en la consola de Google o el login fallará.
   */
  googleClientId: '348046896392-tlkgkvvoga6dicoqpifsurv799bqjpja.apps.googleusercontent.com',
} as const;
