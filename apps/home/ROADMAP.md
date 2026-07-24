# Aura Home — Roadmap

Cada versión es funcional y desplegable. No se avanza a la siguiente sin que la anterior esté completa, probada y pulida.

## Fase 1 — Fundamentos

- **v0.1 — Configuración del proyecto** ✅
  Vite + React 19 + TypeScript estricto, TailwindCSS 4, estructura Clean Architecture, PWA base (manifest, service worker, iconos), deploy manual a GitHub Pages con `npm run deploy` (gh-pages).

- **v0.2 — Aura Design System** ✅
  Tokens completos (color, tipografía, espaciado, sombras, radios), tema claro/oscuro con persistencia, componentes base (Button, Card, Input, Badge, Sheet, Dialog…) sobre Shadcn UI, glassmorphism ligero, microanimaciones con Framer Motion, página interna de showcase.

- **v0.3 — Navegación y shell de la app** ✅
  React Router, layout principal (barra inferior en móvil, sidebar en desktop), transiciones entre páginas, páginas vacías de cada módulo, estado global con Zustand.

- **v0.4 — Capa de datos** ✅
  Dexie + IndexedDB, patrón Repository, TanStack Query como capa de acceso, tipos del dominio (Payment, Task, Event, Service…), migraciones de esquema, export/import de datos.

## Fase 2 — Módulos núcleo

- **v0.5 — Dashboard** ✅ (resumen, próximos pagos/eventos, accesos rápidos)
- **v0.6 — Servicios y pagos** ✅ (registro, frecuencia, historial, archivado)
- **v0.7 — Tareas** ✅ (prioridad, subtareas, etiquetas, fechas)
- **v0.8 — Calendario** ✅ (vista mensual/semanal + agenda diaria, agregación de todos los módulos)
- **v0.9 — Compras** ✅ (lista inteligente, categorías, historial)

## Fase 3 — Módulos del hogar

- **v0.10 — Mantenimiento** ✅ (casa, auto, electrodomésticos, fotos, costos)
- **v0.11 — Contactos y emergencias** ✅
- **v0.12 — Mascotas / Vehículos / Plantas** ✅
- **v0.13 — Documentos** ✅ (PDF, fotos, garantías; base para Aura Vault)

## Fase 4 — Diferenciación y pulido

- **v0.14 — "Mi Hogar"** ✅ (representación visual interactiva de la vivienda por habitaciones)
- **v0.15 — Estadísticas** ✅ (gráficas de gastos, pagos, actividad)
- **v0.16 — Notificaciones** ✅ (recordatorios inteligentes vía Notification API)
- **v0.17 — Integración ecosistema Aura** ✅ (contrato de datos compartido para habitaciones/inventario)
- **v1.0 — Release** ✅ (auditoría de accesibilidad, rendimiento, onboarding, splash, pulido final)
