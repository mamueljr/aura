# Aura — Estado de la migración a Monorepo

> Documento de estado. Última actualización: **Fase 4 completa (deploy) + `@aura/config`**.
> Migración cerrada: el ecosistema ya está desplegado desde el monorepo.
> Resume qué se hizo, el estado de riesgo, cómo trabajar y qué falta.

---

## 1. Resumen

Migración del ecosistema **Aura** (apps de clima, música y hogar) a un **monorepo**
con **pnpm workspaces + Turborepo**, para compartir código (design system, tipos,
config) y dejar de copiar-pegar entre proyectos.

- **Ubicación:** `D:\Documentos\GitHub\aura` → remoto **[`mamueljr/aura`](https://github.com/mamueljr/aura)** (privado, rama `main`).
- **Apps:** `apps/home` (joya), `apps/music`, `apps/weather`.
- **Paquetes compartidos:** `packages/tsconfig`, `packages/tokens` (y más por venir).

---

## 2. Estado de riesgo de las apps ✅

**Las apps desplegadas siguen funcionando, sin cambios y sin riesgo.** Corren desde
sus repos originales, que no fueron modificados:

| Repo original (GitHub) | Estado | En vivo |
|---|---|---|
| `mamueljr/App_Clima` | `main` limpio, intacto | ✅ sin cambios |
| `mamueljr/AuraHome` | `main` limpio, intacto | ✅ sin cambios |
| `mamueljr/Aura-music` | `main` intacto; los cambios (React 19 + oxlint) están en la rama `chore/react-19-upgrade`, no en `main` ni en `gh-pages` | ✅ sin cambios |

El monorepo es una **copia paralela** no desplegada → no puede afectar lo publicado.

### Riesgos abiertos

1. **Divergencia (ahora activa)** — desde la Fase 4 el monorepo es la fuente de
   despliegue: las URLs canónicas viven bajo `mamueljr.github.io/aura/`. Los repos
   originales (`AuraHome`, `Aura-music`, `App_Clima`) **siguen sirviendo sus URLs
   viejas** con builds antiguos. Regla: **trabajar solo en el monorepo** y
   **archivar en solo-lectura** los originales en GitHub (pendiente del usuario)
   para que nadie los confunda con lo vivo.
2. ~~Sin respaldo remoto~~ ✅ **Resuelto**: el monorepo está en
   [`mamueljr/aura`](https://github.com/mamueljr/aura), ahora **público** (para
   Pages en plan gratuito, sin tarjeta).

> Nota: el repo original `Aura-music` quedó con la rama `chore/react-19-upgrade`
> como checkout activo. Su `main` está intacto. Se puede volver a `main` sin problema.

---

## 3. Estructura del monorepo

```
aura/
├─ apps/
│  ├─ home/      # Aura Home  — React 19, la joya del ecosistema
│  ├─ music/     # Aura Music — React 19 + oxlint (offline-first)
│  ├─ weather/   # AuraWeather — vanilla JS + Capacitor
│  └─ finance/   # Aura Finance — React 19, PWA instalable, v1 (ver §10)
├─ packages/
│  ├─ tsconfig/  # @aura/tsconfig — presets de TypeScript compartidos
│  ├─ tokens/    # @aura/tokens   — design tokens (OKLCH) + fuentes
│  ├─ ui/        # @aura/ui       — 15 componentes React (shadcn/Radix)
│  ├─ core/      # @aura/core     — contratos y tipos (ecosistema + Aura Sync)
│  ├─ sync/      # @aura/sync     — transporte (Drive) y cifrado E2E compartidos
│  └─ config/    # @aura/config   — oxlint base compartido
├─ scripts/      # deploy.mjs — deploy manual a GitHub Pages (sin Actions)
├─ docs/         # este documento
├─ pnpm-workspace.yaml · turbo.json · package.json · .npmrc · .gitignore
└─ pnpm-lock.yaml
```

---

## 4. Qué se hizo (bitácora)

### Fase 0 — Preparación (en el repo de Music)
- **v0.0.1** Music migrado de **React 18 → 19.2.8** y **react-router 6 → 7.18.1**
  (alineado con Home). Sin cambios de código fuente: el código ya era React-19-forward.
- **v0.0.2** Linter unificado a **oxlint** (misma config que Home); se eliminaron
  eslint, typescript-eslint y sus plugins. Prettier se conservó como formateador.

### Fase 1 — Andamiaje del monorepo
- **v0.1** Esqueleto **pnpm + Turborepo** (workspace, pipelines de build/lint/
  typecheck/test/dev con caché).
- **v0.2** Las 3 apps importadas a `apps/` (**arranque limpio**, sin historial
  per-app; el historial sigue en los repos originales). Lockfiles npm eliminados.
- **v0.3** Paquete **`@aura/tsconfig`** (`base.json`, `react-app.json`, `node.json`);
  home y music extienden los presets conservando sus deltas.

### Fase 2 — Design System (en curso)
- **v0.4** Paquete **`@aura/tokens`**: se movió `aura.css` (paleta violeta OKLCH,
  tokens claro/oscuro) desde Home y se bundlearon las fuentes (Inter/Sora Variable).
  Home ahora consume `@import '@aura/tokens/index.css'`.
- **v0.5** Paquete **`@aura/ui`** con los 6 componentes duplicados (button, dialog,
  dropdown-menu, input, switch, tabs) + `cn`. Ganan las implementaciones de Home:
  shadcn en estilo React 19 (`ref` como prop, `data-slot`) sobre `radix-ui` unificado.
  Paquete *just-in-time*: expone TS fuente, sin paso de build.
- **v0.6** **Home migrado a `@aura/ui`**: 92 imports reescritos en 37 archivos a
  subpaths (`@aura/ui/components/x`); eliminadas sus copias locales; `@/lib/utils`
  reexporta `cn` del paquete. Se añadió `@source '../../../packages/ui/src'` al CSS
  raíz — **Tailwind 4 no escanea `node_modules`** y sin eso los componentes salen
  sin estilos.
- **v0.7** **Music migrado a `@aura/ui`**: 33 imports reescritos, copias locales
  eliminadas (slider y tooltip se quedan, no están en el paquete). Decisión de
  diseño: **Music conserva su tema propio** (degradados aura-1/2/3, glass, radius
  0.75rem) — NO se adoptó `@aura/tokens`; los componentes compartidos se renderizan
  con la identidad de Music. Supuesto oculto resuelto: `<DropdownMenuItem
  destructive>` → `variant="destructive"`. Limpiadas deps redundantes (@radix-ui
  sueltos, cva, clsx, tailwind-merge). **Componentes duplicados: eliminados en las
  dos apps React.**
- **v0.8** **`@aura/ui` completado** (6 → 15 componentes): promovidos los genéricos
  restantes de Home (badge, card, checkbox, label, select, separator, sheet,
  skeleton, textarea) sin añadir dependencias. Home los consume (33 archivos) y
  borra sus copias. `chart` se queda local en Home (recharts es pesado y de único
  consumidor). **Fase 2 (design system) completa.**

### Fase 3 — Núcleo compartido
- **v0.9** Paquete **`@aura/core`** (solo-tipos, sin deps/runtime/React): se mueve el
  contrato del ecosistema (`ecosystem.ts`, ex `types/aura-contracts.ts` de Home) y se
  crea el **esqueleto de Aura Sync** (`sync.ts`: `SyncProvider`, `AuraSyncEnvelope`,
  `EncryptedEnvelope`, `SyncResult`, `SyncState` — sin implementación). Home consume
  el contrato desde `@aura/core/ecosystem`. Alcance deliberado: sin utils/Dexie (no
  hay overlap real). **Fase 3 completa.**

### Fase 4 — Deploy y CI
- **v1.0** **Deploy manual a GitHub Pages, sin GitHub Actions.** Decisión: el repo
  `aura` se pasó a **público** (Actions/Pages en privado pedían tarjeta) y se sirve
  Pages desde la rama `gh-pages`. `scripts/deploy.mjs` (`pnpm deploy`) construye las
  3 apps con `VITE_BASE=/aura/<app>/`, ensambla `.deploy/{home,music,weather}` + un
  hub `index.html` + `404.html` (fallback SPA) + `.nojekyll`, y publica a `gh-pages`
  vía el paquete `gh-pages`. **En vivo:** `mamueljr.github.io/aura/` (+ `/home/`,
  `/music/`, `/weather/`). Los `base` de home/music pasaron a `/aura/home/` y
  `/aura/music/` (override con `VITE_BASE`); weather es vanilla con rutas relativas.
- **v1.1** Paquete **`@aura/config`**: se extrajo el `.oxlintrc.json` duplicado
  idéntico de home/music a un base compartido; las apps lo heredan vía `extends`.
  Quirk de oxlint documentado: `plugins` debe repetirse en el config de entrada de
  cada app o `extends` reactiva los plugins por defecto y cambia el lint. Verificado
  idéntico al baseline. **Vite/Tailwind no se comparten** (vite difiere por app;
  Tailwind 4 no usa archivo de config).

**Verificación en cada paso:** `pnpm build` construye las 3 apps (3/3); typecheck y
lint en verde; smoke tests en runtime de Music y Home sin errores de consola.

### Fase 5 — Correcciones de bugs (ago-2026)
- **v1.2** **5 bugs de integridad de datos/deploy corregidos** (commit `fd1c6f4`,
  "fix: corregir 5 bugs: sync de favoritos, watermark, recurrentes, datos de clima y
  404 de finance"):
  - **Music — tecla F sin marcar favorito**: `useKeyboardShortcuts` actualizaba
    `isFavorite` a mano y no escribía `favoriteAt`, así que el favorito no se
    propagaba por Aura Sync. Ahora delega en `toggleFavorite(track.id)`.
  - **Home — carrera de relojes en Aura Sync**: tras pull/up-to-date se usaba
    `new Date().toISOString()` como watermark (reloj local), abriendo una ventana de
    pérdida de pushes remotos hechos "en el futuro" del dispositivo. Ahora se usa
    `remote.exportedAt` como marca; el reloj local ya no participa.
  - **Finance — recurrentes duplicados en StrictMode**: `runDue()` creaba el
    movimiento y marcaba `lastRunMonth` en dos pasos, duplicando si se invocaba
    dos veces (React StrictMode en dev). Ahora es una sola transacción Dexie sobre
    `[recurringRules, transactions]` (atómica y serializada).
  - **Weather — datos fabricados**: se reportaban sensación térmica (= real), hora
    de sol/luna y UV inventados desde JSON opcionales. Ahora `weather-data.js`
    **computa** sensación térmica (fórmula BOM) y sol/luna (algoritmo NOAA, ±2 min,
    respeta DST y offset local); UV queda `null` (BrightSky no lo reporta). La UI
    muestra `N/D` donde no hay dato. 10 tests nuevos.
  - **Deploy — 404 no cubría Finance**: la regex de `scripts/deploy.mjs` solo
    reconocía `home|music|weather`, así que un deep-link de Finance caía en 404.
    Ahora cubre las 4 apps (Finance ya decodificaba `?/ruta` en su `index.html`).
- **Verificación:** `pnpm build` 4/4 (ahora con finance), lint y typecheck en verde,
  tests: weather 23/23, home 78/78, finance OK. Publicado con `pnpm deploy`.

### Fase 6 — Seguridad, rendimiento y accesibilidad (ago-2026)
- **XSS en AuraWeather**: `innerHTML` interpolaba sin escapar nombres de ciudad de la
  API de geocodificación y favoritos de `localStorage` (`renderSearchResults`,
  `renderFavoritesList`, `showToast`). Un nombre como `<img src=x onerror=…>`
  habría ejecutado JS. Nuevo `escapeHtml()` en `lib/weather-data.js` (escapando
  `&<>"'`), aplicado en los 3 vectores + 10 tests. **Weather 26/26.**
- **Code-splitting en Aura Finance**: las 3 páginas ahora cargan con `React.lazy` +
  `Suspense` (fallback con spinner y `role="status"`). El chunk principal baja de
  **527 kB → 377 kB** (166 → 121 gzip); cada ruta en su propio chunk. Workbox sigue
  precacheando todos los chunks → la PWA conserva el modo offline completo.
- **A11y (auditoría con sub-agentes + fixes en las 3 apps React)**:
  - `@aura/ui/dialog`: el botón de cerrar decía "Close"; ahora `closeLabel` con
    default **"Cerrar"** (afecta a todos los diálogos de Home/Music/Finance).
  - **Music**: skip link en `AppLayout`, `aria-modal` + cierre con `Escape` en
    `NowPlayingOverlay` y `QueueSheet`, `aria-label` en inputs de playlists y en el
    switch de cifrado, y los 6 `aria-label` hardcodeados en inglés pasan a i18n
    (`common.play/back/more/reorder/seek/skipToContent` en es/en).
  - **Finance**: `aria-pressed` en los pills de filtro por cuenta y en los swatches
    de color, `htmlFor`+`id` en los labels de selects, indicador sr-only de "sobre
    presupuesto" (WCAG 1.4.1), y `focus-visible:ring` en los tabs.
  - **Home**: `aria-pressed` en habitaciones y días del calendario, `aria-label` en
    inputs de subtarea/tarea rápida/compras/búsquedas y en el switch de cifrado,
    checkbox de importación de Google con nombre accesible, y el preview de
    documentos ahora es `aria-modal` y cierra con `Escape`.
- **Verificación:** `pnpm build` 4/4, lint 7/7, typecheck 6/6, tests: weather 26/26,
  home 78/78, finance 55/55. Publicado con `pnpm deploy`.

### Fase 7 — CSP + a11y restante + hub (ago-2026)
- **Content-Security-Policy en las 4 apps** (meta tag; GitHub Pages no permite
  headers): `script-src` con `'self'` + hosts de terceros + **sha256 de los scripts
  inline** (restauración de ruta `?/ruta` en Home/Music/Finance, registro de SW en
  Weather); `style-src 'unsafe-inline'` (React y el `<style>` del splash); `connect-src`
  solo a los hosts que cada app consulta:
  - **Home**: GIS (`accounts.google.com`), Drive, People API, OAuth.
  - **Music**: GIS, Drive, OAuth, `lrclib.net`, `coverartarchive.org`; `media-src blob:`
    (audio desde IndexedDB/OPFS) y `worker-src blob:`.
  - **Finance**: GIS, Drive, OAuth.
  - **Weather**: `cdn.jsdelivr.net` (lucide, chart.js), `fonts.googleapis.com/gstatic.com`,
    las 4 APIs de clima (brightsky, open-meteo, geocoding, bigdatacloud).
  - `img-src` con `blob:` donde hacen falta (`documents` de Home, portadas de Music),
    `frame-src` con `blob:` (PDF/portadas en `iframe`) y `https://accounts.google.com`
    (GIS usa FedCM, sin siervos extra). `object-src 'none'`, `base-uri 'self'`,
    `form-action 'self'`.
  - Ojo futuro: si se toca un script inline, hay que recalcular su sha256.
- **Deuda a11y restante (seguimiento de la auditoría de la Fase 6)**:
  - **Home**: el preview de documentos deja de ser un `<div>` a mano y pasa a un
    `Dialog` Radix (`@aura/ui`): foco, `aria-modal` y Escape reales; el botón de
    descarga es un `<a download>` accesible.
  - **Music**: `TrackList` quita el `role="button"` de una fila y ahora usa un
    `<button>` real alrededor del bloque reproducible (favorito y menú quedan como
    hermanos); el `SegmentedControl` de Ajustes es un radiogroup con navegación por
    flechas y un solo tab-stop; la barra de progreso del `MiniPlayer` en móvil tiene
    `role="progressbar"` y `aria-valuemin/max/now`.
  - **Weather**: enlaces del footer con `rel="noopener noreferrer"`.
- **Hub del ecosistema** (`scripts/deploy.mjs`): rediseño ligero — sección "Cómo
  instalar", cada tarjeta muestra **estado en vivo** (HEAD a su subruta, indicador
  online/offline/checking con `aria-label` de disponibilidad) y se corrigió la
  descripción que omitía Finance. Es puro HTML/CSS/JS inline, sin build.
- **Verificación:** `pnpm build` 4/4, lint 7/7, typecheck 6/6, tests: weather 26/26,
  home 78/78, music 57/57, finance 55/55. Publicado con `pnpm deploy`.

### Fase 8 — Tokens de Music y nav entre apps (ago-2026)
- **Music hereda la base del ecosistema**: `globals.css` importa
  `@aura/tokens/index.css` (fuentes Inter Variable + esqueleto shadcn en OKLCH) y
  ya no define duplicadas las 16 variables semánticas ni el `--font-sans`; solo
  sobreescribe su identidad (`--aura-1/2/3` violeta·cyan·rosa, `--surface-glass`,
  `--radius: 0.75rem`). Nueva dependencia `@aura/tokens` en `music/package.json`.
  Verificado: el CSS final conserva `@font-face`/Inter, `bg-aura-2`, `tailwind glass`,
  `aura-gradient` y `--radius:.75rem` sobre el `1rem` del ecosistema.
- **Nav cruzada entre apps**: nuevo `EcosystemNav` en `@aura/ui`
  (`components/ecosystem-nav.tsx`) — launcher a Home/Music/Weather/Finanzas que
  deriva la raíz del ecosistema de `BASE_URL` de la app actual (`/aura/<app>` →
  enlaces `/aura/<otra>/`; en dev base `/`). Variante `sidebar` (lista vertical,
  Home y Music) y `bar` (fila compacta, Finance). Weather añade el launcher en su
  footer en HTML/CSS vanilla (`aria-current` + `data-lucide`). Bump del cache de
  Weather a v26 (tocados `index.html` y `style.css`).
- **Verificación:** `pnpm build` 4/4, lint 7/7, typecheck 6/6, tests: weather 26/26,
  home 78/78, music 57/57, finance 55/55. Publicado con `pnpm deploy`.

### Fase 9 — Borrar canciones de la biblioteca y deduplicar a demanda (ago-2026)
- **Eliminar una canción de la biblioteca** (antes solo se podía quitar de una
  playlist, o toda una carpeta): nuevo ítem "Eliminar de la biblioteca" en el menú
  (…) de cada canción en Biblioteca, Artista, Álbum, Género, Favoritos y Búsqueda,
  con diálogo de confirmación (`RemoveTrackDialog` en `TrackList`). Implementación en
  `removeTrackFromLibrary` (`services/library/actions.ts`):
  - la saca de todas las playlists **sin tocar `updatedAt`** (es corrección local,
    igual que `dedupeLibrary`, para no pelearse con una edición remota);
  - libera su copia OPFS (`deleteTrackFromOpfs` en `infrastructure/fs/opfs.ts`, que
    además limpia carpetas vacías) y, si estaba subida, su audio de Drive
    (`removeUploadedTrack`) + `pushSnapshot()` best-effort para que el índice remoto
    deje de referenciarlo;
  - borra la fila, reconstruye agregados, poda portadas huérfanas y la saca del
    reproductor (cola y canción actual). **El archivo en disco nunca se toca**.
- **Botón "Eliminar duplicados" en Ajustes → Biblioteca**: ejecuta `dedupeLibrary` +
  `rebuildAggregates` + `pruneOrphanCovers` a demanda y avisa cuántas filas fusionó.
  Antes la deduplicación solo corría al terminar un escaneo o al fusionar un snapshot
  con pistas nuevas, así que los duplicados heredados quedaban atascados hasta
  re-escanear.
- **Verificación:** `pnpm build` 4/4, lint 7/7, typecheck 6/6, tests: weather 26/26,
  home 78/78, music 61/61 (4 nuevos de `removeTrackFromLibrary`), finance 55/55.
  Publicado con `pnpm deploy`.

### Fase 10 — Autorización de Google sin re-prompt por app (ago-2026)
- **Problema:** entrar a una app o saltar de una a otra volvía a abrir el **selector de
  cuenta de Google** en cada navegación. Causa: el token de acceso de OAuth vivía solo
  en memoria (`cachedToken`), y cada app es una página nueva → se perdía → GIS pedía
  cuenta otra vez.
- **Solución:** persistir el token de acceso y reutilizarlo mientras siga vivo:
  - `@aura/sync/drive` (`packages/sync/src/drive.ts`): nuevos hooks `getToken`/`setToken`
    en `DriveProviderConfig` (patrón `getFileId`/`setFileId`) + helpers
    `tokenFromStorage`/`tokenToStorage`. El token sembrado se reusa sin consultar GIS;
    se guarda al emitirse y se borra ante un 401 (también en el reintento) y en
    `disconnect()` (revoca).
  - Las 3 apps cablean **la misma clave de `localStorage`** `aura:google:drive-token` en
    sus providers (`drive-provider.ts` de Home, `services/sync/provider.ts` de Music y
    de Finance). Comparten origen y Client ID, así que **un token sirve para las tres**:
    cambiar de app no pide nada.
  - Home: el token de **Contactos** (scope `contacts.readonly`, otro token) se persiste
    aparte en `aura:google:contacts-token` para que re-importar dentro de la hora no
    repita el prompt.
- **Límite honesto:** sin backend no hay refresh token; Google emite tokens de ~1h. Con
  este cambio, entrar/cambiar de app no pide nada mientras el token siga vivo y el
  re-canje silencioso de GIS/FedCM lo renueva sin UI casi siempre. Como mucho, el
  selector reaparece 1 vez por hora en vez de en cada entrada.
- **Nota de seguridad:** el token en `localStorage` es legible por cualquier script del
  origen; aceptable para una PWA local-first con CSP fuerte, anotado como deuda.
- **Verificación:** `pnpm build` 4/4, lint 7/7, typecheck 6/6, tests 30/30 en `@aura/sync`
  (4 nuevos de persistencia) y el resto sin regresión. Publicado con `pnpm deploy`.

---

## 5. Cómo trabajar

Requisitos: Node ≥ 20, pnpm (instalado a nivel usuario).

```bash
pnpm install                      # instala todo el workspace
pnpm build                        # turbo run build (las 3 apps, con caché)
pnpm lint                         # oxlint en home + music
pnpm typecheck                    # typecheck donde exista el script

# Una sola app:
pnpm --filter aura-home dev       # dev server de Home
pnpm --filter aura-music build    # build solo de Music
pnpm --filter aura-home preview   # previsualizar el build
```

---

## 6. Decisiones abiertas

- **Punto de entrada del ecosistema** (diferida): apps independientes / hub con Aura
  Home como puerta / shell unificado. Recomendación: mantener acceso separado y añadir
  un hub cuando madure. Revisar en la fase de diferenciación.
- **Archivar repos originales** en GitHub (pendiente que lo haga el usuario).
- ~~**Estrategia de deploy**~~ ✅ **Decidida**: sin Actions (pedía tarjeta), el repo
  pasó a público y `scripts/deploy.mjs` publica las 4 apps a la rama `gh-pages` bajo
  `/aura/`. Las URLs viejas siguen sirviéndose desde los repos originales hasta que
  se archiven.

### Bug encontrado al cubrir las fechas de Home (ago-2026)

`nextOccurrence` sumaba meses con `setMonth`, que **desborda**: al 31 de enero
le sumaba un mes y devolvía el 3 de marzo, porque "31 de febrero" no existe.
Con el 30 y el 29 pasaba lo mismo. En un pago mensual eso **se saltaba febrero
entero** — ningún aviso, ningún error, y el usuario se enteraba con el corte.

Ahora se recorta al último día del mes destino (31 ene → 28 feb). Contrapartida
asumida y documentada en el código: el día se queda recortado a partir de ahí,
porque cada ocurrencia se calcula sobre la anterior. Volver al 31 exigiría
guardar el día ancla en el servicio; se prefiere no saltarse un periodo.

> Los servicios que ya tengan una fecha desplazada por el bug se quedan como
> están: no hay migración. Se corrigen solos al registrar el siguiente pago, o
> a mano desde la ficha del servicio.

## 7. Deuda técnica anotada

- ~~`.oxlintrc.json` duplicado idéntico en home/music~~ ✅ **Resuelto**: base en
  `@aura/config`, heredado con `extends`.
- ~~Configs de Vite/Tailwind repetidas~~ ❌ **No aplica**: al inspeccionarlas, los
  vite difieren de forma legítima por app (PWA, tema, workbox, build-stamp) y
  Tailwind 4 no usa archivo de config (es CSS). No hay duplicación real que extraer.
- El mapeo `@theme inline` (tokens → utilidades Tailwind) sigue en cada app; candidato
  a compartir si se unifican los tokens (hoy Music mantiene tema propio a propósito).
- **404 de deploy**: el `404.html` raíz redirige rutas profundas a la raíz de la app
  (se pierde la sub-ruta al recargar). Mejorable con el truco de codificar la ruta si
  llega a molestar; para PWAs es caso menor.
- ~~Home no tiene script `typecheck`~~ ✅ **Resuelto**: Home expone `typecheck`
  (`tsc -b`) y entra en el `turbo run typecheck` de la raíz, igual que el resto.
- ~~Warning de `setState` en `componentDidUpdate` (Home)~~ ✅ **Resuelto**: se
  eliminó de paso en `4361497` al limpiar el `resetKey` sin uso de `ErrorBoundary`
  (el layout ya remonta el árbol al cambiar de ruta). Único `componentDidUpdate`
  del repo; no queda ninguno.
- ~~404 de deploy pierde la sub-ruta al recargar~~ ✅ **Resuelto**: `404.html`
  codifica la ruta profunda en la query (`?/pets`, truco spa-github-pages) y el
  `index.html` de home/music la decodifica con `history.replaceState` antes de
  montar el router. Weather no lo necesita (sin router del lado del cliente).
- **Pre-vuelo de auth en `syncNow`**: es el único punto que sigue acoplado a Drive
  (`getAccessToken`). Se conservó a propósito para no cambiar el comportamiento: sin
  él, un fallo de sesión purgaría tombstones locales antes de fallar.

## 8. Próximos pasos

**Migración cerrada: Fases 0–4 completas.** El plan de migración a monorepo terminó.
Lo que sigue es construir sobre la base:

| Frente | Entregable |
|---|---|
| **Aura Sync** (en curso) | ✅ **Paso 1**: Home implementa `SyncProvider` — transporte (`drive-provider`) separado de la orquestación, contrato con payload claro/cifrado y canal de binarios.<br>✅ **Paso 2**: Cifrado E2E opt-in (`sync-crypto.service.ts` con Web Crypto API AES-GCM 256-bit + PBKDF2), UI de ajustes y 14 tests de integración/unidad en verde.<br>✅ **Paso 3**: Transporte y cifrado extraídos a **`@aura/sync`** (paquete runtime) y **Music sincronizado** (Fase A: playlists, favoritos, historial y ajustes) sobre el mismo contrato. Music estrena vitest.<br>✅ **Paso 4 (Fase B)**: biblioteca en la nube — subida reanudable del audio, descarga bajo demanda a OPFS y snapshot v2 con las pistas subidas. **Sin probar contra Drive real todavía.** Ver §9. |
| **App nueva — Aura Finance** | ✅ **v1 completa** — ver detalle en §10. `apps/finance` sobre `@aura/{tsconfig,ui,config}`, tema propio (verde esmeralda + ámbar), PWA instalable, en el deploy y el hub. |
| **Cabos sueltos** | Archivar repos originales en GitHub (pendiente del usuario). ~~Warning de setState en component update~~ y ~~404 de deploy~~ ✅ resueltos. |

### Punto de entrada del ecosistema (resuelto — nav cruzada)
El deploy publica un **hub** en `mamueljr.github.io/aura/` que enlaza las 4 apps.
Además, desde la **Fase 8** cada app lleva un **launcher del ecosistema**
(`EcosystemNav` en `@aura/ui`, estático en Weather) para saltar de app a app sin
pasar por el hub. La decisión de fondo (apps independientes vs shell unificado)
quedó **resuelta como apps independientes + nav cruzada**: no hay shell que
fusiono código; cada app conserva su instalabilidad PWA y su tema.

### Decisión pendiente: ¿unificar tokens de Music con `@aura/tokens`? — ✅ resuelta

Music conserva su identidad (triada violeta + cyan + rosa, glass, radius
0.75rem) **pero sobre la base del ecosistema**: desde la Fase 8 importa
`@aura/tokens/index.css` (fuentes Inter Variable + esqueleto de variables
semánticas shadcn) y solo sobreescribe lo propio (`--aura-1/2/3`,
`--surface-glass`, `--radius`). Ya no duplica las 16 variables ni el `--font-sans`.

---

## 9. Aura Sync — Fase B: biblioteca de música en la nube ✅ implementada

> **Estado: ✅ funcionando en producción** (verificado el 2026-07-27 subiendo
> desde el teléfono y reproduciendo en el PC).

### Lo que solo apareció al probar contra Drive de verdad

Cuatro fallos que los tests con proveedor falso no detectaban. Todos tenían la
misma raíz: **la decisión de sincronizar se apoyaba en señales que no reflejaban
lo que realmente había cambiado.**

1. **El índice no se publicaba tras subir.** `uploadLibrary` guardaba los
   `driveFileId` solo en local; el otro dispositivo bajaba un índice sin pistas
   aunque el audio ya estuviera en la nube. Ahora se publica siempre al final.
2. **Subir no contaba como "cambio local".** `latestLocalChange()` miraba solo
   playlists y reproducciones, y subir no toca ninguna marca de tiempo → el
   teléfono decía "Todo está al día" y no publicaba nada. Peor: sin pistas
   pendientes la UI ocultaba el botón, dejando al usuario sin salida. Lo
   resuelve `hasUnpublishedUploads()`, comparando contenido.
3. **Se comparaban relojes de dos dispositivos.** `exportedAt` (del que sube)
   contra `lastSyncAt` (del que baja): con desfase horario, un índice recién
   publicado parece viejo → el otro lo descartaba y publicaba el suyo, con
   menos pistas, encima del bueno. Lo resuelve `remoteHasNewTracks()`.
4. **Sin auto-sync ni reconstrucción de índices** (albums/artists/genres) al
   recibir pistas.

**Lección para el resto del ecosistema:** cuando algo se sincroniza, la señal de
"esto cambió" debe derivarse del **contenido**, no de marcas de tiempo — menos
aún de relojes de otro dispositivo.

**Cómo quedó**
- `services/sync/library.ts`: `uploadLibrary()` sube pista a pista, saltando lo
  ya subido (reanudable, detenible) y guardando el `driveFileId` en el track.
  `libraryUploadStats()` alimenta la UI con cuántas faltan y cuánto pesan.
- `getTrackFile()` gana un cuarto origen: sin copia local y con `driveFileId`,
  baja el audio y lo guarda en OPFS (la siguiente vez ya es local y offline).
  Se inyecta con `setCloudResolver` para no invertir capas.
- Snapshot **v2**: viajan las fichas de las pistas ya subidas, sin `folderId`
  ni `opfs`. Al fusionar entran en una carpeta sintética `cloud` («Aura Sync»);
  nunca se pisa una pista local.

**Lo que quedaba abierto — actualizado, resuelto en su mayoría**
1. ~~Portadas: siguen sin viajar~~ → resuelto (`326baed`): las carátulas ya
   sincronizan.
2. ~~Cuota: no consulta el espacio libre real de Drive~~ → resuelto (`e4abd01`):
   `cloudFreeBytes()` usa `about?fields=storageQuota` antes de subir.
3. ~~Limpieza: archivos huérfanos en Drive~~ → resuelto (`a720454`): limpieza
   automática por prefijo (`track-`, `cover-`), respetando refs de la DB local
   y del índice publicado.
4. ~~Borrados~~ → resuelto (`0dad338`, no listado originalmente pero relacionado):
   tombstones propagan los borrados entre dispositivos.
5. ~~Duplicados~~ → resuelto: `services/library/dedupe.ts` funde las filas que
   son la misma canción (huella de contenido: título, artista de álbum, álbum y
   duración al segundo). Sobrevive la fila con `driveFileId` — el id que ya
   conocen los demás dispositivos — adoptando la ruta local de aquí; se
   arrastran favorito, escuchas y referencias de playlist. Corre al terminar un
   escaneo y al fusionar un snapshot.
6. **Velocidad de subida**: se sube de 3 en 3. Sigue sin medirse si ese es el
   límite real o lo es la red, pero ya **se puede** medir: la UI muestra la
   velocidad media durante la subida. Hace falta una subida real desde el
   teléfono del usuario para decidir si tocar `CONCURRENCY`.

> ⚠️ **Desinstalar la PWA borra su almacenamiento local**, y con él las fichas
> de las pistas y sus `driveFileId`. El audio sigue en Drive pero queda
> huérfano: hay que volver a subir. Conviene tenerlo en cuenta antes de sugerir
> "reinstala la app" como diagnóstico.

---

## 9-bis. Diseño original de la Fase B (referencia)

**Objetivo del usuario:** subir la música desde un dispositivo (hoy, el teléfono)
y poder escucharla en cualquier otro. La Fase A ya replica lo irrecuperable
(playlists, favoritos, historial); falta el audio.

**Base ya disponible**
- `SyncBlobChannel` en el contrato (`@aura/core/sync`) y su implementación de
  Drive en `@aura/sync` — el mismo canal por el que Home sube sus documentos.
- `infrastructure/fs/opfs.ts` + `services/library/importer.ts` en Music: ya saben
  copiar las pistas al almacenamiento privado de la app, de donde se pueden leer
  los bytes sin permisos de carpeta.
- `encryptBlob`/`decryptBlobIfNeeded` si se quiere cifrar también el audio.

**Lo que falta decidir/resolver**
1. **Cuota**: `appDataFolder` consume el Drive del usuario (15 GB gratis
   compartidos con Gmail y Fotos). Biblioteca estimada < 5 GB → cabe, pero hay
   que mostrar cuánto ocupa y cuánto queda antes de subir.
2. **Subida reanudable**: pista a pista, saltando las ya subidas (guardar el ref
   de Drive en el registro del track, como `driveFileId` en los documentos de
   Home). Una biblioteca entera no puede depender de una sola sesión.
3. **Identidad de pista entre dispositivos**: hoy `trackId = hash(folderId::path)`
   y `folderId` es el autoincremental de Dexie, propio del dispositivo. Mientras
   el dispositivo B *reciba* las pistas del snapshot (en vez de escanear), los
   ids coinciden; si B además escanea su propia carpeta, habría duplicados. Hay
   que definir una "carpeta de la nube" sintética para las pistas recibidas.
4. **Descarga bajo demanda** a OPFS en el dispositivo B, y qué hacer con el
   almacenamiento (¿todo, o solo lo que se reproduce?).
5. **Portadas**: hoy no viajan; se regeneran al escanear. En un dispositivo que
   nunca escanea habría que sincronizarlas o generar la carátula de relleno.

---

## 10. Aura Finance — v1

App nueva, greenfield sobre `@aura/{tsconfig,ui,config}` (sin `@aura/core`/
`@aura/sync` todavía — se suman cuando haya datos que sincronizar entre
dispositivos). Tema propio (verde esmeralda + ámbar, radius 0.75rem), como
Music: no usa `@aura/tokens`. Local-first con Dexie (`aura-finance`, tabla
`transactions`), sin backend.

**Qué hace**
- **Movimientos**: alta/edición/borrado (con confirmación) de ingresos y
  gastos — descripción, monto, categoría fija por tipo, fecha. Balance,
  ingresos y gastos totales arriba de la lista.
- **Resumen**: gastos del mes actual por categoría (lista ranqueada, barra de
  un solo tono — una sola serie no necesita paleta categórica ni leyenda) y
  totales de los últimos 6 meses (tabla simple, balance en verde/rojo).
- **Ajustes**: moneda configurable (`Intl.NumberFormat` sobre una lista de
  divisas comunes, persistida en `localStorage`; no se asumió una por
  defecto) y exportar todos los movimientos a CSV.
- **PWA instalable**: manifest + iconos propios (192/512 + maskable,
  generados desde SVG fuente en `public/icons/`) + `vite-plugin-pwa`, igual
  que Home/Music.
- **Presupuestos** (v1.1): límite mensual por categoría de gasto, editable en
  Ajustes (tabla `budgets`, un registro por categoría — 0 lo quita). En
  Resumen, la categoría con presupuesto muestra "gastado / límite" y la
  barra pasa de `bg-primary` a `bg-destructive` al superarlo; sin
  presupuesto sigue la barra de magnitud de siempre.
- **Cuentas múltiples** (v2, en curso): cada movimiento pertenece a una
  cuenta (`accounts`: nombre + color). Migración v3 con `.upgrade()`
  crea una cuenta "General" y le asigna todos los movimientos existentes;
  las instalaciones nuevas (sin datos que migrar, así que Dexie no corre
  `.upgrade()`) la reciben vía `db.on('ready', …)`, que sí corre siempre —
  verificado con `fake-indexeddb` en ambos escenarios. Movimientos gana
  selector de cuenta; con más de una cuenta aparecen chips filtrables con
  el balance de cada una arriba de la lista. Ajustes → Cuentas: alta,
  edición (nombre/color) y borrado — bloqueado si es la última cuenta o si
  tiene movimientos (evita huérfanos).
- **Transacciones recurrentes** (v2, en curso): reglas mensuales
  (`recurringRules` — descripción, monto, categoría, cuenta, día del mes
  1–28, activo, `lastRunMonth`). Al abrir la app (`useRecurringTransactions`
  en `AppShell`), `runDue()` genera el movimiento de cada regla activa cuyo
  día ya llegó y no se ha corrido este mes, y marca `lastRunMonth` para no
  duplicar. La fecha del movimiento generado es el día de la regla, no el
  día en que se abrió la app (para que caiga en el mes correcto aunque se
  abra tarde). Gestión en Ajustes → Recurrentes: alta/edición/borrado y un
  switch para activar/desactivar sin editar. 5 tests de `dueRules`
  (la lógica pura de "qué reglas vencen hoy").
- **Adjuntar comprobantes** (v2, en curso): foto del recibo por movimiento,
  Blob nativo en tabla `receipts` (fuera del registro de la transacción,
  igual que `documentBlobs` en Home) referenciado por `transaction.receiptId`.
  Comprime a JPEG antes de guardar (`compressReceiptImage`, máx. 1600px).
  En el formulario: botón de cámara/galería con preview y opción de quitar;
  en la lista, un ícono de clip abre un visor. Borrar el movimiento borra
  también su comprobante — nunca queda un Blob huérfano.
- **Aura Sync** (v2, Paso 1): mismo contrato (`@aura/core/sync`), mismo
  transporte (`@aura/sync/drive`, Google Drive vía `createDriveProvider`) y
  mismo Client ID de OAuth que Home/Music — las tres apps comparten
  `appDataFolder` pero escriben su propio archivo
  (`aura-finance-backup.json`), así que no se pisan. `transactions`,
  `accounts`, `budgets` y `recurringRules` ganaron `updatedAt`/`deletedAt`
  (migración v6, con backfill para lo existente) para poder fusionar
  registro a registro con última-escritura-gana, tombstones incluidos —
  sin esto, borrar en un dispositivo no se propagaría al otro (revive el
  registro al fusionar). `budgets` se fusiona por `category`, no por `id`
  (no tiene). Auto-sync silencioso al abrir la app si ya hay cuenta
  conectada; conectar/sincronizar manual/desconectar desde Ajustes. 9 tests
  de `mergeSnapshot`/`purgeOldTombstones` contra Dexie real
  (`fake-indexeddb`) — uno por cada regla de fusión documentada.

- **Cifrado E2E** (v2, Paso 2): opt-in, mismo `@aura/sync/crypto` que Home
  (AES-GCM 256 + PBKDF2-SHA256 600k). La clave derivada se guarda **no
  extraíble** en `syncSecrets` (Dexie v7), fuera del snapshot — subir la clave
  dentro del respaldo que cifra lo dejaría sin sentido. `setUpEncryption()`
  distingue **activar** de **desbloquear**: si el respaldo remoto ya viene
  cifrado, deriva con la sal del sobre en vez de generar una clave nueva, que
  es el error caro (dejaría el respaldo ilegible para el primer dispositivo).
  Al activarlo se fusiona antes lo que hubiera en claro en Drive: el push
  cifrado lo sobrescribe, y sin eso se perdería lo del otro dispositivo. Una
  frase incorrecta se verifica descifrando **antes** de guardarla. 7 tests con
  transporte en memoria, comprobados rompiendo el código a propósito (no
  cifrar, tratar el sobre cifrado como vacío, guardar sin verificar, no
  fusionar, no re-subir al desactivar: los cinco fallan).

  ⚠️ **Sin probar contra Drive real todavía**: el ciclo completo (activar,
  desbloquear en otro dispositivo, frase incorrecta, desactivar) está
  verificado en la app con el transporte sustituido, pero el popup de OAuth no
  se puede ejercitar sin navegador con sesión.

- **Comprobantes** (v2, Paso 3): las fotos viajan por el `SyncBlobChannel` del
  proveedor — el mismo canal por el que Home sube documentos y Music audio — y
  en el snapshot solo queda `receiptDriveFileId` (+ `receiptType`, porque el
  cifrado no conserva el MIME), dentro de la propia transacción.

  Tres detalles que evitan perder la foto:
  1. **Anotar la referencia mueve `updatedAt`.** La fusión es
     última-escritura-gana: sin mover la marca, la fila entrante empataría con
     la del otro dispositivo, se descartaría, y la foto sería inalcanzable
     desde allí para siempre.
  2. **Si cambió alguna referencia, se vuelve a publicar el snapshot.** Es
     exactamente el fallo que costó una tarde en Music: el archivo sube pero el
     índice no, y el otro dispositivo ve el registro sin poder descargarlo.
  3. **Activar/desactivar el cifrado reescribe los comprobantes ya subidos**
     (sobre el mismo archivo de Drive, no uno nuevo). Si no, quedarían con el
     formato anterior e ilegibles para el otro dispositivo. Al desactivar se
     bajan primero: soltar la clave con una foto cifrada que solo exista en la
     nube la volvería irrecuperable.

  La limpieza en Drive espera a que **caduque la lápida** (30 días), no al
  borrado: hasta entonces el otro dispositivo puede no haberse enterado.
  11 tests con canal de binarios en memoria, comprobados rompiendo el código a
  propósito. Verificado además en la app real: subir → publicar → recuperar en
  otro dispositivo → cifrar → recuperar descifrado → volver a claro.

**Decisiones/gotchas específicas de esta app**
- Iconos PWA: `magick`/ImageMagick trae un delegado SVG interno (MSVG) que
  **descarta silenciosamente** trazos con gradiente — no falla, solo renderiza
  el fondo y nada más (0 avisos, PNG de 1 color). No hay `rsvg-convert`
  instalado en esta máquina. Se resolvió rasterizando con
  `google-chrome --headless --screenshot` sobre un HTML que envuelve el SVG,
  que sí soporta el spec completo. Si hace falta regenerar iconos de otra app,
  usar el mismo truco en vez de asumir que `magick icon.svg icon.png` basta.
- Paleta verde/ámbar (`--finance-1`/`--finance-2`) validada con el script del
  skill de dataviz: pasa como categórica en modo claro (con aviso de
  contraste, mitigado con texto visible) pero **falla la banda de luminosidad
  en oscuro**. Por eso el resumen por mes usa texto plano en vez de barras de
  dos colores — evita tener que mantener un segundo par de tonos solo para
  gráficas en oscuro.
- Sin moneda fija por defecto a propósito: no había forma de saber la divisa
  real del usuario, así que se resolvió con un ajuste en vez de adivinar
  (ver `src/lib/currency.ts`).

**v2 completa**: cuentas múltiples, transacciones recurrentes, adjuntar
comprobantes y Aura Sync completo — fusión registro a registro, cifrado E2E
opt-in y comprobantes por el canal de binarios. Sin decisiones de producto
pendientes que no se hayan pedido ya. Lo único que falta es **probarlo contra
Drive real, en dos dispositivos**.
