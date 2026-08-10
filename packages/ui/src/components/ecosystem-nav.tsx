import * as React from "react"
import { Cloud, Home, Music, Wallet } from "lucide-react"

import { cn } from "../lib/utils"

/**
 * Launcher del ecosistema: enlaces persistentes a las 4 apps de Aura.
 *
 * Se monta dentro de cada PWA para saltar de una a otra sin pasar por el hub.
 * La base del ecosistema se deriva de `BASE_URL` de la app actual: en prod cada
 * app vive en `/aura/<app>/` y su raíz de ecosistema es `/aura/` (un nivel
 * arriba); en dev la base es `/` y los enlaces quedan `/home/`, `/music/`… lo
 * que sirve si se levantan varias en el mismo origen.
 */

export type AuraAppId = "home" | "music" | "weather" | "finance"

const APPS: { id: AuraAppId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "music", label: "Music", icon: Music },
  { id: "weather", label: "Tiempo", icon: Cloud },
  { id: "finance", label: "Finanzas", icon: Wallet },
]

function ecosystemBase(baseUrl: string): string {
  const segments = baseUrl.split("/").filter(Boolean)
  segments.pop()
  return segments.length ? `/${segments.join("/")}/` : "/"
}

/** BASE_URL de la app anfitriona, sin tipado de Vite en el paquete compartido. */
function hostBaseUrl(): string {
  const env = (import.meta as { env?: { BASE_URL?: string } }).env
  return env?.BASE_URL ?? "/"
}

export function EcosystemNav({
  current,
  variant = "sidebar",
  className,
}: {
  /** App que se está viendo; se resalta con `aria-current`. */
  current: AuraAppId
  /** `sidebar`: lista vertical (widgets laterales); `bar`: fila compacta. */
  variant?: "sidebar" | "bar"
  className?: string
}) {
  const root = ecosystemBase(hostBaseUrl())

  if (variant === "bar") {
    return (
      <nav aria-label="Otras apps de Aura" className={cn("flex items-center gap-1", className)}>
        {APPS.map(({ id, label, icon: Icon }) => {
          const active = id === current
          return (
            <a
              key={id}
              href={`${root}${id}/`}
              aria-label={`Aura ${label}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </a>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Otras apps de Aura" className={cn("flex flex-col gap-1", className)}>
      <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        Ecosistema
      </p>
      {APPS.map(({ id, label, icon: Icon }) => {
        const active = id === current
        return (
          <a
            key={id}
            href={`${root}${id}/`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            {label}
          </a>
        )
      })}
    </nav>
  )
}