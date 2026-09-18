# Aura — AGENTS.md

Monorepo del ecosistema Aura: PWAs local-first + paquetes compartidos.
Gestión: **pnpm workspaces + Turborepo**.

> La fuente completa de estado y decisiones vive en `CLAUDE.md` y
> `docs/ESTADO-MIGRACION.md` (bitácora por fase). **`README.md` está desactualizado**
> (dice "Fase 1"; la migración está cerrada). Confía en CLAUDE.md, no en README.

## Comandos (raíz)

```bash
pnpm install                     # Node ≥ 20 + pnpm (NO npm/yarn)
pnpm build && pnpm lint && pnpm typecheck   # verificación antes de publicar
pnpm test                        # vitest, solo donde exista (home/music/finance/weather/sync)

pnpm --filter aura-home dev      # una sola app (o build/test/preview)
pnpm deploy                      # build + publica a gh-pages; o: pnpm deploy home music
pnpm deploy --dry-run            # construye y ensambla, NO publica
```

- Linter: **oxlint** (no eslint). `format` usa prettier solo en music/finance.
- `pre-push` hook (`.githooks/`) corre `lint + typecheck + test` y aborta el push.
  Se instala solo vía `prepare`. Saltarlo: `git push --no-verify`.
- Deploy es **manual** a `gh-pages` (`scripts/deploy.mjs`), sin CI/Actions.

## Gotchas (fallos silenciosos — no caer)

- **Tailwind 4 no escanea `node_modules`**: toda app que use `@aura/ui` debe declarar
  `@source '…/packages/ui/src'` **y** `@import '@aura/ui/variants.css'` en su CSS raíz.
  Sin el import, los estados de Radix (`data-state="open"…`) no se estilizan y no da error.
- **`@aura/ui` es just-in-time** (expone TS fuente, sin build). **`@aura/core` es solo-tipos**
  (sin runtime; no meter utils/Dexie ahí). **`@aura/sync`** es el runtime (Drive + cifrado E2E).
- **Cada app conserva sus propios tokens** (Home usa `@aura/tokens` OKLCH; Music su tema hex
  propio). No unificar el tema de Music sin decisión explícita.
- **CSP por meta tag** con `sha256` de scripts inline: **recalcular el hash si se toca** un script.
- **PWA + service worker**: al verificar builds nuevos en local, desregistrar el SW y limpiar
  caché o se sirve caché vieja.
- **Token de Google** persiste en `localStorage` bajo `aura:google:drive-token` (compartido por
  las apps, ~1h de vida). Contactos de Home: `aura:google:contacts-token`.

## Estructura

```
apps/      home (React 19, centro) · music (offline-first PWA) · weather (vanilla+Capacitor) · finance (React 19)
packages/  tsconfig (presets) · tokens (CSS OKLCH) · ui (React, shadcn/Radix) ·
           core (solo-tipos) · sync (runtime) · config (oxlint base)
```

- `weather` es vanilla + Capacitor: su `build` es `node copy-assets.js` (no Vite).
- `home` build copia `dist/index.html` → `dist/404.html` (truco SPA para gh-pages).
- Cada app es PWA instalable con su propio tema; navegación cruzada vía `EcosystemNav` de `@aura/ui`.

## Reglas de trabajo

- Trabajar **solo en este monorepo** (repos originales congelados). `git pull` al empezar, `git push` al terminar.
- Commit/push/deploy autónomos una vez `pnpm build && pnpm lint && pnpm typecheck` pasan en verde
  (el pre-push hook es el freno real). Pedir confirmación solo para lo irreversible: `--force`,
  `reset --hard`, borrar ramas, o acciones fuera de este repo.
