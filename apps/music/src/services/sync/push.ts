import type { AuraSyncEnvelope } from '@aura/core/sync';

import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';

import { encryptEnvelope, loadKey } from './crypto';
import { BACKUP_KEY, provider } from './provider';
import { exportSnapshot } from './snapshot';
import { SNAPSHOT_SCHEMA_VERSION, type SyncSnapshot } from './types';

/**
 * Sube el snapshot al proveedor (cifrado si el usuario lo activó).
 *
 * Vive en su propio módulo para que lo usen tanto la orquestación (`index.ts`)
 * como la subida de la biblioteca (`library.ts`), sin que se importen entre sí.
 */
export async function pushSnapshot(): Promise<string> {
  const snapshot = await exportSnapshot();
  const payload: AuraSyncEnvelope<SyncSnapshot> = {
    app: APP_CONFIG.slug,
    appVersion: __APP_VERSION__,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: snapshot,
  };

  const secret = await loadKey();
  await provider.push(
    BACKUP_KEY,
    secret ? await encryptEnvelope(payload, secret.key, secret.kdf) : payload,
  );
  useSyncStore.getState().setLastSync(payload.exportedAt);
  return payload.exportedAt;
}
