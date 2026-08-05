import type { KdfParams } from '@aura/core/sync';

/**
 * La clave de cifrado derivada, guardada localmente.
 *
 * Se conserva **no extraíble**: el navegador la persiste sin exponer nunca sus
 * bytes, ni siquiera a este código. Se guarda para que la sincronización
 * automática no pida la frase en cada arranque; los datos locales ya están en
 * claro en IndexedDB, así que exigirla cada vez no protegería nada más en este
 * dispositivo — protege la copia en la nube.
 *
 * NUNCA debe entrar en el snapshot: subir la clave dentro del respaldo que
 * cifra dejaría el cifrado sin sentido.
 */
export interface SyncSecret {
  /** Siempre 'default': hay una sola clave por dispositivo. */
  id: string;
  key: CryptoKey;
  /** Con qué parámetros se derivó, para reconstruirla en otro dispositivo. */
  kdf: KdfParams;
}
