# @aura/core

Contratos y tipos compartidos del ecosistema **Aura**. Paquete **solo-tipos**:
sin dependencias, sin runtime, sin React — footprint cero en el bundle.

## Contenido

| Módulo | Qué es |
|---|---|
| `@aura/core/ecosystem` | Contrato de intercambio de datos entre apps Aura (habitaciones e inventario). Formato JSON neutral, versionado, para export/import manual entre apps sin backend. |
| `@aura/core/sync` | **Esqueleto** del contrato de Aura Sync (sincronización opcional, local-first, cifrada E2E). Interfaces `SyncProvider`, `AuraSyncEnvelope`, `EncryptedEnvelope`… **sin implementación aún.** |

```ts
import type { AuraRoomsExport } from '@aura/core/ecosystem'
import type { SyncProvider } from '@aura/core/sync'
```

## Alcance deliberado

`@aura/core` **no** contiene utilidades genéricas ni helpers de Dexie: Home y
Music no comparten esas piezas hoy (dominios distintos, utils sin overlap,
estructuras de Dexie diferentes). Meterlas sería sobre-abstracción. Este paquete
crece solo cuando aparece algo **genuinamente** común al ecosistema.

## Próximo paso natural

El sync a Google Drive que ya vive en Aura Home se refactorizará en el futuro
para **implementar `SyncProvider`**, convirtiéndose en el primer proveedor real
del contrato.
