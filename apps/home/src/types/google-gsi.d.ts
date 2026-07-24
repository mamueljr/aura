/**
 * Declaración mínima de Google Identity Services (GIS).
 * El script se carga dinámicamente desde https://accounts.google.com/gsi/client;
 * solo tipamos lo que usa drive-sync.service.ts.
 */

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface GoogleTokenClient {
  requestAccessToken(config?: { prompt?: '' | 'consent' }): void
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type: string; message?: string }) => void
    /** Usa FedCM para el re-canje silencioso de tokens (evita depender de cookies de terceros). */
    use_fedcm_for_prompt?: boolean
    /** Correo sugerido, para saltar el selector de cuenta cuando ya sabemos cuál es. */
    hint?: string
  }): GoogleTokenClient
  revoke(token: string, callback?: () => void): void
}

interface Window {
  google?: {
    accounts: {
      oauth2: GoogleOAuth2
    }
  }
}
