# Aura — Monorepo

El monorepo del ecosistema **Aura**: apps y paquetes compartidos bajo una sola raíz,
gestionados con **pnpm workspaces** + **Turborepo**.

## Estructura

```
aura/
├─ apps/          # Aplicaciones desplegables
│  ├─ home/       # Aura Home  — centro del ecosistema (React 19)
│  ├─ music/      # Aura Music — reproductor offline-first (React 19)
│  └─ weather/    # AuraWeather — clima premium (vanilla + Capacitor)
└─ packages/      # Código compartido (se poblará en Fase 2+)
   ├─ tokens/     # @aura/tokens — design tokens (CSS/OKLCH)
   ├─ ui/         # @aura/ui     — componentes React (shadcn/Radix)
   ├─ core/       # @aura/core   — tipos de dominio, utils, contrato de sync
   └─ tsconfig/   # @aura/tsconfig — presets compartidos
```

## Requisitos

- Node ≥ 20
- pnpm (`npm i -g pnpm` o vía corepack)

## Comandos (raíz)

```bash
pnpm install          # instala todo el workspace
pnpm build            # turbo run build en todas las apps/paquetes
pnpm dev              # turbo run dev
pnpm lint             # oxlint en cada paquete
pnpm typecheck        # typecheck en cada paquete
pnpm test             # tests donde existan
```

Turbo cachea por tarea: solo reconstruye lo que cambió.

## Estado de la migración

Ver el plan de migración a monorepo. Fase actual: **Fase 1 — andamiaje**.
