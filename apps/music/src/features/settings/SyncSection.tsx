import { Cloud, CloudUpload, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@aura/ui/components/button';
import { Input } from '@aura/ui/components/input';
import { Switch } from '@aura/ui/components/switch';
import {
  connect,
  disableEncryption,
  disconnect,
  findOrphanBlobs,
  removeOrphanBlobs,
  setUpEncryption,
  syncNow,
  type OrphanReport,
  type SyncResult,
} from '@/services/sync';
import {
  libraryUploadStats,
  uploadLibrary,
  type LibraryUploadStats,
  type UploadProgress,
} from '@/services/sync/library';
import { useSyncStore } from '@/stores/syncStore';

/** Frase mínima: por debajo, PBKDF2 no compensa lo débil que es. */
const MIN_PASSPHRASE = 8;

type Note = { kind: 'ok' | 'error'; text: string } | null;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

/**
 * Subida de los archivos de audio a Drive (biblioteca en la nube).
 *
 * La subida es reanudable: se salta lo ya subido, así que detenerla y
 * retomarla más tarde no repite trabajo.
 */
function CloudLibraryRow() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<LibraryUploadStats | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [note, setNote] = useState<Note>(null);
  const stopRef = useRef(false);

  const refresh = useCallback(() => {
    void libraryUploadStats().then(setStats);
  }, []);

  useEffect(refresh, [refresh]);

  async function handleUpload() {
    stopRef.current = false;
    setNote(null);
    setProgress({ done: 0, total: stats?.pending ?? 0, current: '' });
    try {
      const report = await uploadLibrary(setProgress, () => stopRef.current);
      const parts = [t('settings.cloudDone', { count: report.uploaded })];
      if (report.unavailable > 0) {
        parts.push(t('settings.cloudUnavailable', { count: report.unavailable }));
      }
      if (report.failed > 0) parts.push(t('settings.cloudFailed', { count: report.failed }));
      setNote({ kind: report.failed > 0 ? 'error' : 'ok', text: parts.join(' ') });
    } catch (error) {
      setNote({
        kind: 'error',
        text: error instanceof Error ? error.message : t('settings.syncError'),
      });
    } finally {
      setProgress(null);
      refresh();
    }
  }

  const uploading = progress !== null;

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CloudUpload className="size-4 text-primary" />
            {t('settings.cloudLibrary')}
          </p>
          <p className="text-xs text-muted-foreground">
            {!stats || stats.total === 0
              ? t('settings.cloudEmpty')
              : stats.pending === 0
                ? t('settings.cloudAllUploaded')
                : `${t('settings.cloudUploaded', {
                    uploaded: stats.uploaded,
                    total: stats.total,
                  })} · ${t('settings.cloudPending', {
                    count: stats.pending,
                    size: formatBytes(stats.pendingBytes),
                  })}`}
          </p>
        </div>
        {stats && stats.pending > 0 ? (
          uploading ? (
            <Button variant="outline" onClick={() => (stopRef.current = true)}>
              {t('settings.cloudStop')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void handleUpload()}>
              <CloudUpload />
              {t('settings.cloudUpload')}
            </Button>
          )
        ) : null}
      </div>

      {progress ? (
        <p className="text-xs text-muted-foreground">
          {t('settings.cloudUploading', { done: progress.done, total: progress.total })}{' '}
          {progress.current}
        </p>
      ) : null}

      {note ? (
        <p
          role="status"
          className={note.kind === 'ok' ? 'text-xs text-primary' : 'text-xs text-destructive'}
        >
          {note.text}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Limpieza de los binarios que ya no referencia ninguna pista.
 *
 * Se busca primero y se muestra qué se va a borrar: eliminar sin enseñar nada
 * en una carpeta que además comparte espacio con Aura Home daría demasiado
 * miedo (y con razón).
 */
function CleanupRow() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<OrphanReport | null>(null);
  const [note, setNote] = useState<Note>(null);

  async function run<T>(action: () => Promise<T>, after: (result: T) => void) {
    setBusy(true);
    setNote(null);
    try {
      after(await action());
    } catch (error) {
      setNote({
        kind: 'error',
        text: error instanceof Error ? error.message : t('settings.syncError'),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Trash2 className="size-4 text-primary" />
            {t('settings.cloudCleanup')}
          </p>
          <p className="text-xs text-muted-foreground">
            {found
              ? found.count === 0
                ? t('settings.cloudCleanupNone')
                : t('settings.cloudCleanupFound', {
                    count: found.count,
                    size: formatBytes(found.bytes),
                  })
              : t('settings.cloudCleanupHint')}
          </p>
        </div>
        {found && found.count > 0 ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(removeOrphanBlobs, (report) => {
                setFound({ count: 0, bytes: 0 });
                setNote({
                  kind: 'ok',
                  text: t('settings.cloudCleanupDone', {
                    count: report.count,
                    size: formatBytes(report.bytes),
                  }),
                });
              })
            }
          >
            {busy ? t('settings.cloudCleanupWorking') : t('settings.cloudCleanupDelete')}
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void run(findOrphanBlobs, setFound)}
          >
            {busy ? t('settings.cloudCleanupWorking') : t('settings.cloudCleanupCheck')}
          </Button>
        )}
      </div>

      {note ? (
        <p
          role="status"
          className={note.kind === 'ok' ? 'text-xs text-primary' : 'text-xs text-destructive'}
        >
          {note.text}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sincronización de Aura Music con Google Drive, con cifrado E2E opcional.
 * Mismo contrato y transporte que Aura Home (`@aura/core` + `@aura/sync`).
 */
export function SyncSection() {
  const { t } = useTranslation();
  const enabled = useSyncStore((s) => s.enabled);
  const accountEmail = useSyncStore((s) => s.accountEmail);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const encrypted = useSyncStore((s) => s.encrypted);

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [asking, setAsking] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');

  function describe(result: SyncResult): string {
    // Se comprueba el caso positivo: descartar 'pushed' no elimina el miembro
    // entero de la unión, porque su discriminante es a su vez una unión.
    if (result.action === 'pulled' || result.action === 'merged') {
      return t('settings.syncImported', { count: result.imported });
    }
    return result.action === 'pushed' ? t('settings.syncPushed') : t('settings.syncUpToDate');
  }

  async function run(operation: () => Promise<SyncResult>) {
    setBusy(true);
    setNote(null);
    try {
      setNote({ kind: 'ok', text: describe(await operation()) });
    } catch (error) {
      setNote({
        kind: 'error',
        text: error instanceof Error ? error.message : t('settings.syncError'),
      });
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setAsking(false);
    setPassphrase('');
    setConfirmation('');
  }

  async function handleEnableEncryption() {
    if (passphrase.length < MIN_PASSPHRASE) {
      setNote({ kind: 'error', text: t('settings.passphraseShort', { min: MIN_PASSPHRASE }) });
      return;
    }
    if (passphrase !== confirmation) {
      setNote({ kind: 'error', text: t('settings.passphraseMismatch') });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const outcome = await setUpEncryption(passphrase);
      resetForm();
      setNote({
        kind: 'ok',
        text:
          outcome === 'unlocked'
            ? t('settings.encryptionUnlocked')
            : t('settings.encryptionEnabled'),
      });
    } catch (error) {
      setNote({
        kind: 'error',
        text: error instanceof Error ? error.message : t('settings.syncError'),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisableEncryption() {
    setBusy(true);
    setNote(null);
    try {
      await disableEncryption();
      setNote({ kind: 'ok', text: t('settings.encryptionDisabled') });
    } catch (error) {
      setNote({
        kind: 'error',
        text: error instanceof Error ? error.message : t('settings.syncError'),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {enabled
          ? `${t('settings.syncConnectedAs', { email: accountEmail ?? '—' })} · ${t(
              'settings.syncLastAt',
              { when: lastSyncAt ? formatDate(lastSyncAt) : t('settings.syncNever') },
            )}`
          : t('settings.syncHint')}
      </p>

      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => syncNow({ interactive: true }))}
            >
              <RefreshCw className={busy ? 'animate-spin' : undefined} />
              {t('settings.syncNow')}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                disconnect();
                setNote({ kind: 'ok', text: t('settings.syncDisconnected') });
              }}
            >
              {t('settings.syncDisconnect')}
            </Button>
          </>
        ) : (
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await connect();
                return syncNow({ interactive: true });
              })
            }
          >
            <Cloud />
            {t('settings.syncConnect')}
          </Button>
        )}
      </div>

      {enabled ? <CloudLibraryRow /> : null}
      {enabled ? <CleanupRow /> : null}

      {enabled ? (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Lock className="size-4 text-primary" />
                {t('settings.encryption')}
              </p>
              <p className="text-xs text-muted-foreground">
                {encrypted ? t('settings.encryptionOn') : t('settings.encryptionOff')}
              </p>
            </div>
            <Switch
              checked={encrypted}
              disabled={busy}
              onCheckedChange={(checked) => {
                setNote(null);
                if (checked) setAsking(true);
                else void handleDisableEncryption();
              }}
            />
          </div>

          {asking && !encrypted ? (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-xs text-destructive">{t('settings.encryptionWarning')}</p>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t('settings.passphrase')}
                aria-label={t('settings.passphrase')}
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t('settings.passphraseRepeat')}
                aria-label={t('settings.passphraseRepeat')}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => void handleEnableEncryption()}>
                  {busy ? t('settings.encryptionWorking') : t('settings.encryptionEnable')}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={resetForm}>
                  {t('settings.cancel')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.encryptionOtherDevice')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {note ? (
        <p
          role="status"
          className={note.kind === 'ok' ? 'text-xs text-primary' : 'text-xs text-destructive'}
        >
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
