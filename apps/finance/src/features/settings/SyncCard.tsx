import { useEffect, useState } from 'react';
import { Cloud, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';
import { Input } from '@aura/ui/components/input';
import { Label } from '@aura/ui/components/label';
import { Separator } from '@aura/ui/components/separator';
import { Switch } from '@aura/ui/components/switch';
import { APP_CONFIG } from '@/config/app';
import {
  connect,
  disableEncryption,
  disconnect,
  isEncryptionEnabled,
  setUpEncryption,
  syncNow,
  type SyncResult,
} from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';

type Feedback = { kind: 'ok' | 'error'; message: string } | null;

/** Suficiente para que la derivación tenga algo que proteger. */
const MIN_PASSPHRASE = 8;

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
 * Cifrado extremo a extremo, opt-in.
 *
 * Deliberadamente explícito sobre la contrapartida: sin la frase no hay forma
 * de recuperar el respaldo, así que la advertencia va ANTES de activarlo y no
 * escondida en un texto de ayuda.
 */
function EncryptionSection() {
  const encrypted = useSyncStore((s) => s.encrypted);
  const setEncrypted = useSyncStore((s) => s.setEncrypted);

  const [asking, setAsking] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Feedback>(null);

  // El interruptor refleja la tabla `syncSecrets`, no un booleano suelto: si
  // se borran los datos del navegador, la clave desaparece y el estado
  // persistido mentiría.
  useEffect(() => {
    void isEncryptionEnabled().then(setEncrypted);
  }, [setEncrypted]);

  function reset() {
    setAsking(false);
    setPassphrase('');
    setConfirmation('');
  }

  async function handleEnable() {
    if (passphrase.length < MIN_PASSPHRASE) {
      setNote({ kind: 'error', message: `Usa al menos ${MIN_PASSPHRASE} caracteres.` });
      return;
    }
    if (passphrase !== confirmation) {
      setNote({ kind: 'error', message: 'Las dos frases no coinciden.' });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const outcome = await setUpEncryption(passphrase);
      reset();
      setNote({
        kind: 'ok',
        message:
          outcome === 'unlocked'
            ? 'Dispositivo desbloqueado: ya puede leer el respaldo cifrado.'
            : 'Cifrado activado. El respaldo en Drive ya no es legible sin tu frase.',
      });
    } catch (error) {
      setNote({
        kind: 'error',
        message: error instanceof Error ? error.message : 'No se pudo activar el cifrado.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setNote(null);
    try {
      await disableEncryption();
      setNote({ kind: 'ok', message: 'Cifrado desactivado.' });
    } catch (error) {
      setNote({
        kind: 'error',
        message: error instanceof Error ? error.message : 'No se pudo desactivar el cifrado.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label className="flex items-center gap-2">
            <Lock className="size-4 text-primary" /> Cifrado extremo a extremo
          </Label>
          <p className="text-sm text-muted-foreground">
            {encrypted
              ? 'Tus movimientos y comprobantes viajan cifrados: nadie con acceso al archivo puede leerlos.'
              : 'Opcional. Cifra el respaldo y los comprobantes con una frase tuya antes de subirlos a Drive.'}
          </p>
        </div>
        <Switch
          checked={encrypted}
          disabled={busy}
          aria-label="Cifrado extremo a extremo"
          onCheckedChange={(checked) => {
            setNote(null);
            if (checked) setAsking(true);
            else void handleDisable();
          }}
        />
      </div>

      {asking && !encrypted && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-destructive">
            Guarda bien tu frase: si la olvidas, el respaldo en Drive queda irrecuperable. No hay
            forma de restablecerla.
          </p>
          <div className="space-y-2">
            <Label htmlFor="finance-passphrase">Frase de cifrado</Label>
            <Input
              id="finance-passphrase"
              type="password"
              autoComplete="new-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-passphrase-confirm">Repítela</Label>
            <Input
              id="finance-passphrase-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void handleEnable()}>
              {busy ? 'Cifrando…' : 'Activar cifrado'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={reset}>
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si ya cifraste este respaldo en otro dispositivo, escribe la misma frase para
            desbloquearlo aquí.
          </p>
        </div>
      )}

      {note && (
        <p
          role="status"
          className={note.kind === 'ok' ? 'text-sm text-primary' : 'text-sm text-destructive'}
        >
          {note.message}
        </p>
      )}
    </div>
  );
}

/**
 * Sincronización con Google Drive — mismo Client ID que Home/Music, mismo
 * contrato (`@aura/core/sync`). Los comprobantes viajan por el canal de
 * binarios, no dentro del respaldo.
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

        {/* El cifrado solo tiene sentido cuando ya hay algo que subir. */}
        {enabled && <EncryptionSection />}
      </CardContent>
    </Card>
  );
}
