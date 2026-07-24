# @aura/ui

Componentes UI compartidos del ecosistema **Aura** (Aura Design). Basados en
shadcn + Radix, en estilo **React 19** (`ref` como prop, sin `forwardRef`, con
`data-slot`). Las implementaciones provienen de Aura Home, que tenía las
versiones más completas y modernas.

## Componentes

`badge` · `button` · `card` · `checkbox` · `dialog` · `dropdown-menu` · `input` ·
`label` · `select` · `separator` · `sheet` · `skeleton` · `switch` · `tabs` ·
`textarea` (+ la utilidad `cn`)

> `chart` (recharts) se queda local en Aura Home a propósito: recharts es pesado y
> hoy tiene un único consumidor. Si otra app necesita gráficas, se promueve con
> `recharts` como peer dependency.

## Paquete "just-in-time"

No tiene paso de build: expone **TypeScript fuente** y el bundler de cada app lo
compila. Menos ceremonia y mejor DX en monorepo.

```json
{ "dependencies": { "@aura/ui": "workspace:*" } }
```

```tsx
import { Button, Dialog, DialogContent, cn } from '@aura/ui'
// o por componente:
import { Button } from '@aura/ui/components/button'
```

## ⚠️ Requisito de Tailwind 4 en la app consumidora

Tailwind **no escanea `node_modules`** por defecto, así que las clases usadas
dentro de estos componentes no se generarían. Hay que declarar la fuente en el
CSS raíz de la app:

```css
@import 'tailwindcss';
@import '@aura/tokens/index.css';
@source '../../../packages/ui/src';   /* ← indispensable */
```

Sin ese `@source`, los componentes se renderizan **sin estilos**.

## Requisitos

- Los tokens de [`@aura/tokens`](../tokens) deben estar importados (los
  componentes usan las variables semánticas: `--primary`, `--border`, `--radius`…).
- React 19 (peer dependency).
