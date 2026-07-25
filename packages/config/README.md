# @aura/config

Configs compartidas del ecosistema Aura.

## `oxlint.json` — base de oxlint

Reglas comunes a todas las apps. Cada app la hereda vía `extends`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "extends": ["./node_modules/@aura/config/oxlint.json"]
}
```

**`plugins` debe repetirse en el config de la app** (además de estar aquí). Es
un quirk de oxlint: en un config sin `extends`, `plugins` reemplaza los defaults;
pero al usar `extends`, oxlint reactiva sus plugins por defecto (unicorn, etc.)
salvo que el config de entrada también declare `plugins`. Verificado: con
`plugins` en ambos → conjunto de reglas idéntico al original; si falta en el
entry, se cuelan reglas de unicorn y cambia el lint.

Las apps pueden añadir/override reglas debajo del `extends` (se aplican de la
primera a la última; la última gana).

> Nota: las configs de Vite **no** se comparten — difieren de forma legítima
> por app (PWA, tema, workbox). Tailwind 4 no usa archivo de config (es CSS).
