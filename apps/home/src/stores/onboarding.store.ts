import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  completed: boolean
  complete: () => void
}

/** Recuerda si ya se mostró la bienvenida de primer uso. */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      complete: () => set({ completed: true }),
    }),
    { name: 'aura-home:onboarding' },
  ),
)
