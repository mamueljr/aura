# Aura — Estado de la migración a Monorepo

> Documento de estado. Última actualización: **Fase 3 completa (@aura/core)**.
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

### Riesgos abiertos (no afectan a usuarios hoy)

1. **Divergencia** — existen dos copias de cada app (original + monorepo).
   Regla: **trabajar solo en el monorepo** de aquí en adelante y **archivar en
   solo-lectura** los repos originales en GitHub.
2. ~~Sin respaldo remoto~~ ✅ **Resuelto**: el monorepo está en
   [`mamueljr/aura`](https://github.com/mamueljr/aura) (privado).
   ⚠️ Ojo para la Fase 4: **GitHub Pages en repos privados requiere plan de pago**.
   En plan gratuito habría que pasar el repo a público para desplegar con Pages.

> Nota: el repo original `Aura-music` quedó con la rama `chore/react-19-upgrade`
> como checkout activo. Su `main` está intacto. Se puede volver a `main` sin problema.

---

## 3. Estructura del monorepo

```
aura/
├─ apps/
│  ├─ home/      # Aura Home  — React 19, la joya del ecosistema
│  ├─ music/     # Aura Music — React 19 + oxlint (offline-first)
│  └─ weather/   # AuraWeather — vanilla JS + Capacitor
├─ packages/
│  ├─ tsconfig/  # @aura/tsconfig — presets de TypeScript compartidos
│  ├─ tokens/    # @aura/tokens   — design tokens (OKLCH) + fuentes
│  ├─ ui/        # @aura/ui       — 15 componentes React (shadcn/Radix)
│  └─ core/      # @aura/core     — contratos y tipos (ecosistema + Aura Sync)
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

- `.oxlintrc.json` duplicado idéntico en home/music → futuro `@aura/config`.
- Configs de Vite/Tailwind repetidas entre apps → mismo `@aura/config`.
- El mapeo `@theme inline` (tokens → utilidades Tailwind) sigue en cada app; candidato
  a compartir cuando exista `@aura/ui`.

## 8. Próximos pasos

**Fases 2 y 3 completas.** Queda:

| Fase | Entregable |
|---|---|
| **Fase 4** | Deploy y CI del monorepo (GitHub Actions con filtros de ruta). Decidir repo público vs plan de pago para Pages; conservar o no las URLs actuales. |

Más allá del plan de migración: implementar Aura Sync (que `drive-sync` de Home
implemente `SyncProvider` de `@aura/core`), y las apps nuevas del ecosistema
(p. ej. Aura Finance) arrancando sobre `@aura/{tsconfig,tokens,ui,core}`.

### Decisión pendiente: ¿unificar tokens de Music con `@aura/tokens`?

Music conserva su tema propio (violeta + cyan + rosa, glass, radius 0.75rem, hex);
Home usa `@aura/tokens` (violeta OKLCH, radius 1rem). Ambos comparten los mismos
**componentes**, pero con **valores de token distintos** — patrón sano de design
system. Convergerlos cambiaría el look de Music y es una decisión de identidad,
no técnica. Se deja abierta para la fase de diferenciación.
