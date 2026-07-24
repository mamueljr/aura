import { useEffect } from 'react'
import { resolveTheme, useThemeStore } from '@/stores/theme.store'

const DARK_THEME_COLOR = '#211f2e'
const LIGHT_THEME_COLOR = '#fbfafc'

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    )
}

/**
 * Sincroniza la preferencia de tema con el DOM (clase `dark` en <html>
 * y meta theme-color). Reacciona a cambios del sistema cuando la
 * preferencia es "system". Montar una sola vez, en App.
 */
export function useApplyTheme() {
  const preference = useThemeStore((s) => s.preference)

  useEffect(() => {
    applyTheme(resolveTheme(preference))
    if (preference !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(resolveTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])
}
