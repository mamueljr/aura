# Aura Home

El centro del ecosistema **Aura**: una PWA premium, offline-first, para organizar tu hogar — pagos, servicios, tareas, calendario, mantenimiento, documentos y más.

## Stack

React 19 · TypeScript (estricto) · Vite · TailwindCSS 4 · Framer Motion · React Router · Zustand · TanStack Query · Dexie (IndexedDB) · vite-plugin-pwa (Workbox)

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # typecheck + build de producción
npm run preview  # previsualizar el build (incluye service worker)
npm run lint     # oxlint
npm run deploy   # build + publicar a GitHub Pages (rama gh-pages)
```

## Arquitectura

```
src/
├── components/    # Componentes UI reutilizables (Aura Design)
├── features/      # Módulos por dominio (servicios, tareas, calendario…)
├── pages/         # Páginas enrutables
├── layouts/       # Shells de layout
├── hooks/         # Hooks compartidos
├── services/      # Lógica de aplicación
├── repositories/  # Acceso a datos (Dexie/IndexedDB)
├── stores/        # Estado global (Zustand)
├── types/         # Tipos del dominio
├── utils/         # Utilidades puras
├── config/        # Configuración global
└── theme/         # Tokens de Aura Design System
```

## Deploy

`npm run deploy` construye la app y publica `dist/` en la rama `gh-pages` (sin GitHub Actions). En GitHub: *Settings → Pages → Source: Deploy from a branch → gh-pages*.

Ver [ROADMAP.md](ROADMAP.md) para el plan por versiones.
