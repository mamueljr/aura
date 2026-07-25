# Aura — Monorepo (contexto para Claude)

Monorepo del ecosistema **Aura**: apps PWA local-first + paquetes compartidos.
Gestión: **pnpm workspaces + Turborepo**.

> 📄 **Estado detallado, bitácora y decisiones abiertas:** [`docs/ESTADO-MIGRACION.md`](docs/ESTADO-MIGRACION.md).
> Léelo antes de continuar la migración.

## Estructura

```
apps/      home (React 19, la joya) · music (React 19) · weather (vanilla + Capacitor)
packages/  @aura/tsconfig · @aura/tokens · @aura/ui (15 componentes) · @aura/core (tipos) · @aura/config (oxlint base)
scripts/   deploy.mjs — deploy manual a GitHub Pages (sin Actions)
```

## Comandos (desde la raíz)

```bash
pnpm install
pnpm build        # turbo, las 3 apps, con caché
pnpm lint         # oxlint
pnpm typecheck
pnpm --filter aura-home dev     # una sola app
pnpm deploy       # build + publica a gh-pages (todo o: pnpm deploy home music)
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

**Fases 0–4 ✅ completas. Migración cerrada.** Monorepo, design system, `@aura/core`,
`@aura/config`, y **deploy en vivo** desde el monorepo a GitHub Pages (rama
`gh-pages`, sin Actions): `mamueljr.github.io/aura/` → `/home/`, `/music/`,
`/weather/`. Repo `aura` ahora **público**. Re-deploy: `pnpm deploy`.

**Siguiente (ya no es migración):** implementar **Aura Sync** (`SyncProvider` de
`@aura/core` en el `drive-sync` de Home) — ver `docs/ESTADO-MIGRACION.md` §8.
Pendiente del usuario: **archivar los repos originales** (`App_Clima`, `Aura-music`,
`AuraHome`) en solo-lectura para evitar divergencia (siguen sirviendo URLs viejas).

## Reglas de trabajo

- **Trabajar solo en este monorepo.** Los repos originales quedaron congelados.
- `git pull` antes de empezar y `git push` al terminar (se trabaja desde >1 máquina).
- Confirmar cambios verificando: `pnpm build && pnpm lint && pnpm typecheck`.
