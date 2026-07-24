# @aura/tokens

Design tokens del ecosistema **Aura** + fuentes variables. Fuente única de la
identidad visual (paleta violeta OKLCH, tipografía, radios, tokens semánticos
claro/oscuro estilo shadcn).

## Contenido

| Archivo | Qué es |
|---|---|
| `aura.css` | Los tokens: `@theme` (primitivas) + `:root` / `.dark` (semánticos). |
| `index.css` | Punto de entrada: importa las fuentes (Inter/Sora Variable) + `aura.css`. |

## Uso

```json
{ "dependencies": { "@aura/tokens": "workspace:*" } }
```

En el CSS raíz de la app, **después** de Tailwind:

```css
@import 'tailwindcss';
@import '@aura/tokens/index.css';   /* fuentes + tokens */
```

Luego se mapean los tokens semánticos a utilidades Tailwind con `@theme inline`
en la propia app (ver `apps/home/src/index.css`). El tema oscuro se activa con la
clase `dark` en `<html>`.

> Solo tokens: si no quieres las fuentes, importa `@aura/tokens/aura.css`.
