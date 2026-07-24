import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toDateOnly } from '@/utils/dates'

const NOTIFIED_RETENTION_DAYS = 7

interface NotificationsState {
  enabled: boolean
  /** Días de anticipación para documentos, mantenimiento, mascotas y vehículos. */
  daysBefore: number
  /** Clave del recordatorio -> fecha (ISO) en que se notificó. */
  notified: Record<string, string>
  setEnabled: (enabled: boolean) => void
  setDaysBefore: (days: number) => void
  markNotified: (key: string) => void
  pruneNotified: () => void
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      enabled: false,
      daysBefore: 2,
      notified: {},
      setEnabled: (enabled) => set({ enabled }),
      setDaysBefore: (days) => set({ daysBefore: Math.min(14, Math.max(0, days)) }),
      markNotified: (key) =>
        set((s) => ({ notified: { ...s.notified, [key]: toDateOnly(new Date()) } })),
      pruneNotified: () =>
        set((s) => {
          const cutoff = toDateOnly(
            new Date(new Date().setDate(new Date().getDate() - NOTIFIED_RETENTION_DAYS)),
          )
          const notified = Object.fromEntries(
            Object.entries(s.notified).filter(([, date]) => date >= cutoff),
          )
          return { notified }
        }),
    }),
    { name: 'aura-home:notifications' },
  ),
)
