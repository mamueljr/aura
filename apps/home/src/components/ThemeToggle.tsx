import { Moon, Sun, SunMoon } from 'lucide-react'
import { Button } from '@aura/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@aura/ui/components/dropdown-menu'
import { useThemeStore, type ThemePreference } from '@/stores/theme.store'

const ICONS = {
  light: Sun,
  dark: Moon,
  system: SunMoon,
} as const

const LABELS: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Sistema',
}

/** Selector de tema claro / oscuro / sistema. */
export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const Icon = ICONS[preference]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
        >
          {(Object.keys(LABELS) as ThemePreference[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
