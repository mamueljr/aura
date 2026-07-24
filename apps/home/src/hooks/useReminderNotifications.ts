import { useEffect } from 'react'
import { useNotificationsStore } from '@/stores/notifications.store'
import { collectDueReminders } from '@/services/reminders.service'

const CHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * Revisa los recordatorios vigentes y dispara notificaciones locales
 * (Notification API) para los que no se han notificado hoy. Corre al
 * montar, al volver a la pestaña y cada 30 minutos mientras está abierta.
 * No hay servidor push: solo cubre mientras la app está abierta o en
 * segundo plano dentro del mismo navegador.
 */
export function useReminderNotifications() {
  const enabled = useNotificationsStore((s) => s.enabled)
  const daysBefore = useNotificationsStore((s) => s.daysBefore)

  useEffect(() => {
    if (!enabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    async function check() {
      useNotificationsStore.getState().pruneNotified()
      const notified = useNotificationsStore.getState().notified
      const reminders = await collectDueReminders(daysBefore)
      for (const reminder of reminders) {
        if (notified[reminder.key]) continue
        const notification = new Notification(reminder.title, {
          body: reminder.body,
          tag: reminder.key,
        })
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
        useNotificationsStore.getState().markNotified(reminder.key)
      }
    }

    void check()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = setInterval(() => void check(), CHECK_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
    }
  }, [enabled, daysBefore])
}
