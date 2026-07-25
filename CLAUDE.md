# Aura — Monorepo (contexto para Claude)

Monorepo del ecosistema **Aura**: apps PWA local-first + paquetes compartidos.
Gestión: **pnpm workspaces + Turborepo**.

> 📄 **Estado detallado, bitácora y decisiones abiertas:** [`docs/ESTADO-MIGRACION.md`](docs/ESTADO-MIGRACION.md).
> Léelo antes de continuar la migración.

## Estructura

```
apps/      home (React 19, la joya) · music (React 19) · weather (vanilla + Capacitor)
packages/  @aura/tsconfig · @aura/tokens · @aura/ui (15 componentes) · @aura/core (tipos)
```

## Comandos (desde la raíz)

```bash
pnpm install
pnpm build        # turbo, las 3 apps, con caché
pnpm lint         # oxlint
pnpm typecheck
pnpm --filter aura-home dev     # una sola app
```

## Convenciones y gotchas (importantes)

- **Node ≥ 20 + pnpm** (no npm/yarn). Linter: **oxlint** (no eslint).
- **Tailwind 4 no escanea `node_modules`**: toda app que consuma `@aura/ui` debe
  declarar `@source '…/packages/ui/src'` en su CSS raíz, o los componentes salen
  sin estilos.
- `@aura/ui` es **just-in-time**: expone TS fuente, sin build. `cn` vive ahí.
- **Cada app conserva sus propios tokens** (Home usa `@aura/tokens` OKLCH; Music su
  tema hex propio con degradados). Comparten componentes, no valores de token —
  patrón intencional. NO unificar el tema de Music sin decisión explícita.
- `@aura/core` es **solo-tipos** (sin runtime). No meter utils/Dexie ahí: Home y
  Music no los comparten (evitar sobre-abstracción).
- Las PWAs registran service worker: al probar en `localhost` puede servir caché
  vieja. Desregistrar SW + limpiar caches al verificar builds nuevos.

## Estado de la migración

Fases 0–3 ✅ completas (monorepo, design system, `@aura/core`).
**Siguiente: Fase 4 — deploy y CI.** Es más de decisiones que de código:
- Repo público (Pages gratis) vs plan de pago.
- Conservar URLs actuales (`mamueljr.github.io/AuraHome`…) o nuevas.
- Archivar los repos originales (`App_Clima`, `Aura-music`, `AuraHome`) en
  solo-lectura para evitar divergencia.

## Reglas de trabajo

- **Trabajar solo en este monorepo.** Los repos originales quedaron congelados.
- `git pull` antes de empezar y `git push` al terminar (se trabaja desde >1 máquina).
- Confirmar cambios verificando: `pnpm build && pnpm lint && pnpm typecheck`.
