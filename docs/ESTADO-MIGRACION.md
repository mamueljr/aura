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
- **Estrategia de deploy** (Fase 4): GitHub Actions con filtros de ruta, o `gh-pages`
  por app. Decidir también si el repo pasa a público (necesario para Pages en plan
  gratuito) y si se conservan las URLs actuales.

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
- **Home no tiene script `typecheck`**: su tipado corre dentro de `build` (`tsc -b`),
  así que `pnpm typecheck` en la raíz NO cubre Home. Para verificarlo hay que buildear.
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

### Punto de entrada del ecosistema (parcialmente resuelto)
El deploy ya publica un **hub** en `mamueljr.github.io/aura/` que enlaza las 3 apps.
Es una landing simple, no un shell unificado. La decisión de fondo (apps
independientes vs hub-puerta vs shell) sigue abierta para la fase de diferenciación.

### Decisión pendiente: ¿unificar tokens de Music con `@aura/tokens`?

Music conserva su tema propio (violeta + cyan + rosa, glass, radius 0.75rem, hex);
Home usa `@aura/tokens` (violeta OKLCH, radius 1rem). Ambos comparten los mismos
**componentes**, pero con **valores de token distintos** — patrón sano de design
system. Convergerlos cambiaría el look de Music y es una decisión de identidad,
no técnica. Se deja abierta para la fase de diferenciación.

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

**Deliberadamente fuera de v1** (no son bugs, son alcance): cuentas
múltiples, transacciones recurrentes, adjuntar comprobantes, y Aura Sync
(sincronizar entre dispositivos). Son decisiones de producto reales;
quedan para cuando se pidan explícitamente.
