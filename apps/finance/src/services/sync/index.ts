import type { AuraSyncEnvelope, SyncPayload, SyncResult as CoreSyncResult } from '@aura/core/sync';

import { db } from '@/db/db';
import { APP_CONFIG } from '@/config/app';
import { useSyncStore } from '@/stores/syncStore';
import { BACKUP_KEY, provider } from './provider';
import { exportSnapshot, mergeSnapshot, purgeOldTombstones, totalMerged, type SyncSnapshot } from './snapshot';

/**
 * Aura Sync — orquestación de Aura Finance.
 *
 * Mismo contrato (`@aura/core/sync`) y mismo transporte (`@aura/sync/drive`)
 * que Home y Music; este archivo solo decide qué lado gana. Qué se replica y
 * cómo se fusiona vive en `snapshot.ts`.
 *
 * Alcance de esta primera versión (documentado en ESTADO-MIGRACION §10):
 * transacciones, cuentas, presupuestos y recurrentes viajan en claro, sin
 * cifrado E2E todavía. Los comprobantes (fotos) NO sincronizan — son locales
 * a cada dispositivo por ahora.
 */

export { loadGis, SyncAuthError } from '@aura/sync/drive';
export type { SyncSnapshot };

export type SyncResult = Extract<
  CoreSyncResult,
  { action: 'pushed' | 'up-to-date' | 'pulled' | 'merged' }
>;

const SCHEMA_VERSION = 6;

/** Fecha (ISO) del cambio local más reciente entre las 4 colecciones, o null si no hay datos. */
async function latestLocalChange(): Promise<string | null> {
  let latest: string | null = null;
  await db.transaction(
    'r',
    [db.transactions, db.accounts, db.budgets, db.recurringRules],
    async () => {
      const tables = [db.transactions, db.accounts, db.budgets, db.recurringRules];
      for (const table of tables) {
        const rows = await table.toArray();
        for (const row of rows as { updatedAt: string }[]) {
          if (!latest || row.updatedAt > latest) latest = row.updatedAt;
        }
      }
    },
  );
  return latest;
}

async function push(): Promise<SyncResult> {
  const data = await exportSnapshot();
  const envelope: AuraSyncEnvelope<SyncSnapshot> = {
    app: APP_CONFIG.slug,
    appVersion: APP_CONFIG.version,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  await provider.push(BACKUP_KEY, envelope);
  useSyncStore.getState().setLastSync(envelope.exportedAt);
  return { action: 'pushed', syncedAt: envelope.exportedAt };
}

function openPayload(payload: SyncPayload): AuraSyncEnvelope<SyncSnapshot> {
  // Sin cifrado E2E en esta versión: si llega un sobre cifrado (p. ej.
  // activado por una versión futura, o compartiendo espacio por error con
  // otra app), fallar claro es mejor que tratarlo como datos vacíos.
  if ('ciphertext' in payload) {
    throw new Error(
      'El respaldo remoto está cifrado. Aura Finance todavía no soporta cifrado E2E.',
    );
  }
  return payload as AuraSyncEnvelope<SyncSnapshot>;
}

/**
 * Sincroniza según qué lado cambió desde la última vez. Si ambos cambiaron,
 * fusiona lo remoto sobre lo local (registro a registro, última-escritura-gana
 * incluyendo tombstones) y sube el resultado.
 */
export async function syncNow(opts?: { interactive?: boolean }): Promise<SyncResult> {
  // Pre-vuelo: falla rápido si la sesión ya no sirve, antes de tocar nada.
  await provider.getAccessToken(opts);
  await purgeOldTombstones();

  const payload = await provider.pull(BACKUP_KEY);
  if (!payload) return push();

  const remote = openPayload(payload);
  const { lastSyncAt } = useSyncStore.getState();
  const localChange = await latestLocalChange();

  const remoteChanged = !lastSyncAt || remote.exportedAt > lastSyncAt;
  const localChanged = lastSyncAt ? (localChange ?? '') > lastSyncAt : localChange !== null;

  if (!remoteChanged && !localChanged) {
    const syncedAt = new Date().toISOString();
    useSyncStore.getState().setLastSync(syncedAt);
    return { action: 'up-to-date', syncedAt };
  }
  if (localChanged && !remoteChanged) return push();

  const imported = totalMerged(await mergeSnapshot(remote.data));
  if (remoteChanged && !localChanged) {
    const syncedAt = new Date().toISOString();
    useSyncStore.getState().setLastSync(syncedAt);
    return { action: 'pulled', syncedAt, imported };
  }
  // Ambos lados cambiaron: ya se fusionó lo remoto; ahora sube el resultado.
  const pushed = await push();
  return { action: 'merged', syncedAt: pushed.syncedAt, imported };
}

/** Inicia sesión con Google y devuelve la cuenta conectada. */
export async function connect(): Promise<string> {
  const account = (await provider.connect?.()) ?? 'cuenta conectada';
  useSyncStore.getState().setConnected(account);
  return account;
}

/** Cierra la sesión: revoca credenciales y limpia el estado persistido. */
export function disconnect(): void {
  provider.disconnect?.();
  useSyncStore.getState().disconnect();
}
