import { useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { APP_CONFIG } from '@/config/app';
import { connect, disconnect, syncNow, type SyncResult } from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';

type Feedback = { kind: 'ok' | 'error'; message: string } | null;

function formatSyncDate(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resultMessage(result: SyncResult): string {
  switch (result.action) {
    case 'pulled':
      return `Datos actualizados desde Drive: ${result.imported} registros.`;
    case 'merged':
      return `Cambios de ambos dispositivos fusionados: ${result.imported} registros actualizados.`;
    case 'pushed':
      return 'Respaldo subido a Drive.';
    case 'up-to-date':
      return 'Todo está al día.';
  }
}

/**
 * Sincronización con Google Drive — mismo Client ID que Home/Music, mismo
 * contrato (`@aura/core/sync`). Sin cifrado E2E ni sincronización de
 * comprobantes todavía (ver ESTADO-MIGRACION §10).
 */
export function SyncCard() {
  const enabled = useSyncStore((s) => s.enabled);
  const accountEmail = useSyncStore((s) => s.accountEmail);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run(operation: () => Promise<SyncResult>) {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await operation();
      setFeedback({ kind: 'ok', message: resultMessage(result) });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Error al sincronizar.',
      });
    } finally {
      setBusy(false);
    }
  }

  function handleConnect() {
    void run(async () => {
      await connect();
      return syncNow({ interactive: true });
    });
  }

  if (!APP_CONFIG.googleClientId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="size-4 text-primary" /> Sincronización
        </CardTitle>
        <CardDescription>
          {enabled
            ? `Conectado como ${accountEmail ?? 'cuenta de Google'} · Última sincronización: ${
                lastSyncAt ? formatSyncDate(lastSyncAt) : 'nunca'
              }`
            : 'Guarda un respaldo en tu Google Drive y ve los mismos movimientos en cualquier dispositivo.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {enabled ? (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => syncNow({ interactive: true }))}
              >
                <RefreshCw className={busy ? 'animate-spin' : undefined} /> Sincronizar ahora
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  disconnect();
                  setFeedback({ kind: 'ok', message: 'Cuenta desconectada.' });
                }}
              >
                Desconectar
              </Button>
            </>
          ) : (
            <Button disabled={busy} onClick={handleConnect}>
              <Cloud /> Conectar con Google
            </Button>
          )}
        </div>

        {feedback && (
          <p
            role="status"
            className={feedback.kind === 'ok' ? 'text-sm text-primary' : 'text-sm text-destructive'}
          >
            {feedback.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
