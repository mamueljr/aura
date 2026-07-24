import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'aura-home:theme' },
  ),
)

/** Resuelve la preferencia a un tema concreto. */
export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
