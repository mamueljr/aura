# @aura/tsconfig

Presets de TypeScript compartidos del ecosistema Aura.

| Preset | Uso |
|---|---|
| `@aura/tsconfig/base.json` | Denominador común (skipLibCheck, noEmit, reglas de unused). No usar directo. |
| `@aura/tsconfig/react-app.json` | Apps React + Vite (bundler mode, JSX, strict). |
| `@aura/tsconfig/node.json` | Typecheck de tooling en Node (vite.config.ts, scripts). |

## Uso

En el `package.json` de la app:

```json
{ "devDependencies": { "@aura/tsconfig": "workspace:*" } }
```

En el `tsconfig` de la app (extiende y añade solo tus deltas):

```json
{
  "extends": "@aura/tsconfig/react-app.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable", "WebWorker"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

> `lib`, `types` y `paths` **reemplazan** (no fusionan) al extender: si los necesitas,
> vuelve a declararlos completos en la app.
