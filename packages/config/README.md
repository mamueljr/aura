# @aura/config

Configs compartidas del ecosistema Aura.

## `oxlint.json` — base de oxlint

Reglas comunes a todas las apps. Cada app la hereda vía `extends`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc", "jsx-a11y"],
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

## Accesibilidad (`jsx-a11y`)

Son PWAs que se usan con el teclado y con lector de pantalla, así que las reglas
que detectan un control **inoperable** están en `error` (rompen el push, no solo
avisan): `click-events-have-key-events`, `no-static-element-interactions`,
`no-noninteractive-element-interactions` y `control-has-associated-label`.

Dos reglas están **apagadas a propósito**:

- `no-autofocus`: todos los usos son el primer campo de un diálogo modal o el
  buscador. Ahí enfocar solo es lo esperado, no una trampa.
- `prefer-tag-over-role`: pide `<output>` para `role="status"` (que es una
  región viva, no el resultado de un cálculo) y `<dialog>` para los modales de
  Radix, que no es un reemplazo directo. Es estilo, no accesibilidad.

> Nota: las configs de Vite **no** se comparten — difieren de forma legítima
> por app (PWA, tema, workbox). Tailwind 4 no usa archivo de config (es CSS).
