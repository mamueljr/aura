# Aura — Monorepo (contexto para Claude)

Monorepo del ecosistema **Aura**: apps PWA local-first + paquetes compartidos.
Gestión: **pnpm workspaces + Turborepo**.

> 📄 **Estado detallado, bitácora y decisiones abiertas:** [`docs/ESTADO-MIGRACION.md`](docs/ESTADO-MIGRACION.md).
> Léelo antes de continuar la migración.

## Estructura

```
apps/      home (React 19, la joya) · music (React 19) · weather (vanilla + Capacitor) ·
           finance (React 19, v1: movimientos, resumen, ajustes — ver ESTADO-MIGRACION §10)
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
- **…y también `@import '@aura/ui/variants.css'`**: los componentes usan las
  utilidades cortas de shadcn (`data-active:`, `data-open:`…) pero Radix emite
  `data-state="active|open|…"`. Sin ese import, Tailwind las interpreta como el
  atributo `[data-active]` que nunca existe y **el estado no se estiliza, en
  silencio**: pestañas activas indistinguibles, diálogos sin animación. Home lo
  recibía de rebote vía `@import 'shadcn/tailwind.css'`; Music y Finance no.
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
`/weather/`, `/finance/`. Repo `aura` ahora **público**. Re-deploy: `pnpm deploy`.

**Fase 5 (ago-2026):** 5 bugs corregidos (sync de favoritos en Music, watermark de
Aura Sync en Home, recurrentes duplicados en Finance, datos fabricados en Weather,
404 que no cubría Finance) — bitácora en `docs/ESTADO-MIGRACION.md` §4.

**Fase 6 (ago-2026):** XSS en Weather corregido (`escapeHtml`), code-splitting en
Finance (527→377 kB), y auditoría a11y con fixes en las 3 apps React (labels,
`aria-pressed`, `aria-modal`, skip link, i18n) — bitácora en `docs/ESTADO-MIGRACION.md` §4.

**Fase 7 (ago-2026):** Content-Security-Policy por meta tag en las 4 apps (sha256 de
los scripts inline — **recalcular si se tocan**), deuda a11y restante (preview de
documentos en Home con `Dialog` Radix, `TrackList` con `<button>` real, radiogroup con
flechas y `progressbar` en Music, `noopener` en Weather) y hub del ecosistema con
estado en vivo por tarjeta y sección "Cómo instalar" — bitácora en §4.

**Fase 8 (ago-2026):** Music hereda la base de `@aura/tokens` (fuentes + esqueleto
shadcn) conservando su identidad (auras, glass, radius 0.75rem), y **nav entre apps**:
`EcosystemNav` en `@aura/ui` dentro de Home/Music/Finance + launcher vanilla en Weather
para saltar de app a app sin pasar por el hub — bitácora en §4.

**Fase 9 (ago-2026):** **eliminar una canción de la biblioteca** en Music (menú (…)
en Biblioteca/Artistas/Álbumes/Géneros/Favoritos/Búsqueda, con confirmación; libera
copia OPFS y audio de Drive, el archivo en disco no se toca) y botón **"Eliminar
duplicados"** en Ajustes que corre `dedupeLibrary` a demanda — bitácora en §4.

**Fase 10 (ago-2026):** el **selector de cuenta de Google** reaparecía en cada entrada
o cambio de app (el token vivía solo en memoria). Ahora `@aura/sync/drive` acepta
`getToken`/`setToken` y las 3 apps persisten el token en `localStorage` bajo la **misma
clave** (`aura:google:drive-token`): comparten origen + Client ID, así que un token vale
para todas y cambiar de app no pide nada mientras siga vivo (~1h). Renovación
**proactiva** en segundo plano a <5 min de caducar (silenciosa, sin UI) y reintento
automático en 401 para Drive y Contactos. El token de Contactos de Home se persiste
aparte (`aura:google:contacts-token`). Límite: sin backend, Google emite tokens de 1h —
como mucho pedirá 1 vez por hora, no en cada entrada — bitácora en §4.

**Siguiente (ya no es migración):** implementar **Aura Sync** (`SyncProvider` de
`@aura/core` en el `drive-sync` de Home) — ver `docs/ESTADO-MIGRACION.md` §8.
Pendiente del usuario: **archivar los repos originales** (`App_Clima`, `Aura-music`,
`AuraHome`) en solo-lectura para evitar divergencia (siguen sirviendo URLs viejas).

## Verificación antes de publicar

No hay CI (Actions descartado: en repo privado pedía tarjeta, y ahora no se ha
montado). En su lugar hay un **hook de pre-push** en `.githooks/pre-push` que
corre `lint`, `typecheck` y `test`, y **aborta el push si algo falla**.

Se instala solo: el script `prepare` de la raíz apunta `core.hooksPath` a
`.githooks` en cada `pnpm install`, así que basta con instalar al clonar en una
máquina nueva. Para saltárselo puntualmente: `git push --no-verify`.

> `pnpm typecheck` **sí** cubre ahora Aura Home (antes su tipado solo corría
> dentro de `build`, así que el comando de la raíz se saltaba la app más grande).

## Reglas de trabajo

- **Trabajar solo en este monorepo.** Los repos originales quedaron congelados.
- `git pull` antes de empezar y `git push` al terminar (se trabaja desde >1 máquina).
- Confirmar cambios verificando: `pnpm build && pnpm lint && pnpm typecheck`.
- **Autonomía en commit/push/deploy**: una vez que `pnpm build && pnpm lint &&
  pnpm typecheck` pasan en verde, hacer `git commit`, `git push` y (si aplica)
  `pnpm deploy` directo, sin pedir confirmación en cada paso. El pre-push hook
  ya corre lint/typecheck/test y aborta el push si algo falla — es el freno
  real. Seguir pidiendo confirmación explícita para lo que sí es irreversible
  o afecta más allá de este repo: `--force`, `reset --hard`, borrar ramas,
  archivar/despublicar algo, o cualquier acción fuera de este monorepo.
