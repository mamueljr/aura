import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Cloud, Download, HardDrive, Lock, RefreshCw, Upload } from 'lucide-react'
import { Button } from '@aura/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aura/ui/components/card'
import { Input } from '@aura/ui/components/input'
import { Label } from '@aura/ui/components/label'
import { Separator } from '@aura/ui/components/separator'
import { Switch } from '@aura/ui/components/switch'
import { APP_CONFIG } from '@/config/app'
import { queryKeys } from '@/config/query-client'
import {
  eventsRepo,
  servicesRepo,
  shoppingRepo,
  tasksRepo,
} from '@/repositories'
import { downloadBackup, importBackup } from '@/services/backup.service'
import {
  connect,
  disableEncryption,
  disconnect,
  setUpEncryption,
  syncNow,
  type SyncResult,
} from '@/services/drive-sync.service'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useSyncStore } from '@/stores/sync.store'

const STATS = [
  ['Servicios', servicesRepo],
  ['Tareas', tasksRepo],
  ['Compras', shoppingRepo],
  ['Eventos', eventsRepo],
] as const

type Feedback = { kind: 'ok' | 'error'; message: string } | null

function formatSyncDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Frase mínima: por debajo, PBKDF2 no compensa lo débil que es. */
const MIN_PASSPHRASE = 8

/**
 * Cifrado extremo a extremo del respaldo (opt-in).
 *
 * Deliberadamente explícito sobre la contrapartida: sin la frase no hay forma
 * de recuperar el respaldo, así que la advertencia va antes de activarlo.
 */
function EncryptionSection() {
  const encrypted = useSyncStore((s) => s.encrypted)

  const [asking, setAsking] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Feedback>(null)

  function reset() {
    setAsking(false)
    setPassphrase('')
    setConfirmation('')
  }

  async function handleEnable() {
    if (passphrase.length < MIN_PASSPHRASE) {
      setNote({ kind: 'error', message: `Usa al menos ${MIN_PASSPHRASE} caracteres.` })
      return
    }
    if (passphrase !== confirmation) {
      setNote({ kind: 'error', message: 'Las dos frases no coinciden.' })
      return
    }
    setBusy(true)
    setNote(null)
    try {
      const outcome = await setUpEncryption(passphrase)
      reset()
      setNote({
        kind: 'ok',
        message:
          outcome === 'unlocked'
            ? 'Dispositivo desbloqueado: ya puede leer el respaldo cifrado.'
            : 'Cifrado activado. El respaldo en Drive ya no es legible sin tu frase.',
      })
    } catch (error) {
      setNote({
        kind: 'error',
        message: error instanceof Error ? error.message : 'No se pudo activar el cifrado.',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    setNote(null)
    try {
      await disableEncryption()
      setNote({ kind: 'ok', message: 'Cifrado desactivado.' })
    } catch (error) {
      setNote({
        kind: 'error',
        message: error instanceof Error ? error.message : 'No se pudo desactivar el cifrado.',
      })
    } finally {
      setBusy(false)
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
              ? 'El respaldo y los documentos viajan cifrados: nadie con acceso al archivo puede leerlos.'
              : 'Opcional. Cifra el respaldo con una frase tuya antes de subirlo a Drive.'}
          </p>
        </div>
        <Switch
          checked={encrypted}
          disabled={busy}
          aria-label="Cifrado extremo a extremo"
          onCheckedChange={(checked) => {
            setNote(null)
            if (checked) setAsking(true)
            else void handleDisable()
          }}
        />
      </div>

      {asking && !encrypted && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-destructive">
            Guarda bien tu frase: si la olvidas, el respaldo en Drive queda
            irrecuperable. No hay forma de restablecerla.
          </p>
          <div className="space-y-2">
            <Label htmlFor="passphrase">Frase de cifrado</Label>
            <Input
              id="passphrase"
              type="password"
              autoComplete="new-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passphrase-confirm">Repítela</Label>
            <Input
              id="passphrase-confirm"
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
            Si este respaldo ya estaba cifrado en otro dispositivo, escribe la
            misma frase para desbloquearlo aquí.
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
  )
}

/** Sincronización de respaldos con Google Drive. */
function SyncCard() {
  const queryClient = useQueryClient()
  const enabled = useSyncStore((s) => s.enabled)
  const accountEmail = useSyncStore((s) => s.accountEmail)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)

  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function applyResult(result: SyncResult) {
    if (result.action === 'pulled' || result.action === 'merged') {
      await queryClient.invalidateQueries()
      setFeedback({
        kind: 'ok',
        message:
          result.action === 'merged'
            ? `Cambios de ambos dispositivos fusionados: ${result.imported} registros actualizados.`
            : `Datos actualizados desde Drive: ${result.imported} registros.`,
      })
    } else if (result.action === 'pushed') {
      setFeedback({ kind: 'ok', message: 'Respaldo subido a Drive.' })
    } else {
      setFeedback({ kind: 'ok', message: 'Todo está al día.' })
    }
  }

  async function run(operation: () => Promise<SyncResult>) {
    setBusy(true)
    setFeedback(null)
    try {
      await applyResult(await operation())
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Error al sincronizar.',
      })
    } finally {
      setBusy(false)
    }
  }

  function handleConnect() {
    void run(async () => {
      await connect()
      return syncNow({ interactive: true })
    })
  }

  if (!APP_CONFIG.googleClientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="size-4 text-primary" /> Sincronización
          </CardTitle>
          <CardDescription>
            Para sincronizar con Google Drive falta configurar el Client ID de
            Google en la app (ver instrucciones del proyecto).
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

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
            : 'Guarda un respaldo en tu Google Drive y recupéralo en cualquier dispositivo.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  disconnect()
                  setFeedback({ kind: 'ok', message: 'Cuenta desconectada.' })
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
  )
}

type PermissionState = NotificationPermission | 'unsupported'

function currentPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/** Recordatorios de pagos, tareas y vencimientos vía Notification API. */
function NotificationsCard() {
  const enabled = useNotificationsStore((s) => s.enabled)
  const daysBefore = useNotificationsStore((s) => s.daysBefore)
  const setEnabled = useNotificationsStore((s) => s.setEnabled)
  const setDaysBefore = useNotificationsStore((s) => s.setDaysBefore)

  const [permission, setPermission] = useState<PermissionState>(currentPermission)
  const [testSent, setTestSent] = useState(false)

  async function handleToggle(checked: boolean) {
    if (!checked) {
      setEnabled(false)
      return
    }
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') setEnabled(true)
  }

  function sendTest() {
    if (typeof Notification === 'undefined') return
    new Notification('Aura Home', { body: 'Así se verán tus recordatorios.' })
    setTestSent(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4 text-primary" /> Notificaciones
        </CardTitle>
        <CardDescription>
          {permission === 'unsupported'
            ? 'Tu navegador no soporta notificaciones.'
            : 'Recordatorios de pagos, tareas, vencimientos y más, mientras Aura Home esté abierta.'}
        </CardDescription>
      </CardHeader>
      {permission !== 'unsupported' && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="notif-enabled" className="cursor-pointer">
              Activar recordatorios
            </Label>
            <Switch
              id="notif-enabled"
              checked={enabled}
              onCheckedChange={(v) => void handleToggle(v)}
            />
          </div>

          {permission === 'denied' && (
            <p className="text-sm text-destructive">
              Bloqueaste las notificaciones para este sitio. Actívalas desde los
              ajustes de tu navegador.
            </p>
          )}

          {enabled && permission === 'granted' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="notif-days">Días de anticipación</Label>
                <Input
                  id="notif-days"
                  type="number"
                  min={0}
                  max={14}
                  className="w-20"
                  value={daysBefore}
                  onChange={(e) => setDaysBefore(Number(e.target.value))}
                />
              </div>
              <Button variant="outline" size="sm" onClick={sendTest}>
                Probar notificación
              </Button>
              {testSent && (
                <p className="text-xs text-muted-foreground">Notificación enviada.</p>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/** Ajustes: administración de los datos locales (respaldo e importación). */
export function SettingsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const { data: counts } = useQuery({
    queryKey: queryKeys.dataStats,
    queryFn: () => Promise.all(STATS.map(([, repo]) => repo.count())),
  })

  async function onImportFile(file: File) {
    try {
      const imported = await importBackup(await file.text())
      await queryClient.invalidateQueries()
      setFeedback({
        kind: 'ok',
        message: `Respaldo importado: ${imported} registros.`,
      })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Error al importar.',
      })
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4 text-primary" /> Tus datos
          </CardTitle>
          <CardDescription>
            Todo se guarda en este dispositivo. Aura Home funciona sin conexión
            y sin cuentas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map(([label], i) => (
              <div
                key={label}
                className="rounded-xl border bg-muted/40 p-3 text-center"
              >
                <p className="font-heading text-xl font-semibold">
                  {counts?.[i] ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void downloadBackup()}>
              <Download /> Exportar respaldo
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload /> Importar respaldo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onImportFile(file)
                e.target.value = ''
              }}
            />
          </div>

          {feedback && (
            <p
              role="status"
              className={
                feedback.kind === 'ok'
                  ? 'text-sm text-primary'
                  : 'text-sm text-destructive'
              }
            >
              {feedback.message}
            </p>
          )}
        </CardContent>
      </Card>

      <SyncCard />
      <NotificationsCard />
    </div>
  )
}
