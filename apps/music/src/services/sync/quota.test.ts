import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Espacio disponible en Drive. Lo que importa aquí es que **nunca bloquee**:
 * si la cuota no se puede leer, subir debe seguir siendo posible.
 */
const fake = vi.hoisted(() => ({
  quota: null as null | (() => Promise<{ used: number; limit: number | null }>),
}));

vi.mock('./provider', () => ({
  BACKUP_KEY: 'aura-music-backup.json',
  provider: {
    id: 'fake',
    getAccessToken: () => Promise.resolve('token'),
    pull: () => Promise.resolve(null),
    push: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    blobs: undefined,
    get quota() {
      return fake.quota ?? undefined;
    },
  },
}));

const { cloudFreeBytes } = await import('./library');

beforeEach(() => {
  fake.quota = null;
});

describe('cloudFreeBytes', () => {
  it('devuelve lo que queda libre', async () => {
    fake.quota = () => Promise.resolve({ used: 5_000, limit: 15_000 });

    expect(await cloudFreeBytes()).toBe(10_000);
  });

  it('nunca devuelve negativo si Drive ya está por encima del tope', async () => {
    fake.quota = () => Promise.resolve({ used: 20_000, limit: 15_000 });

    expect(await cloudFreeBytes()).toBe(0);
  });

  it('devuelve null si la cuenta no tiene tope conocido', async () => {
    fake.quota = () => Promise.resolve({ used: 5_000, limit: null });

    // Sin tope no hay "libre" que mostrar; la UI simplemente omite el dato.
    expect(await cloudFreeBytes()).toBeNull();
  });

  it('no propaga el fallo: no poder leer la cuota no debe impedir subir', async () => {
    fake.quota = () => Promise.reject(new Error('403'));

    await expect(cloudFreeBytes()).resolves.toBeNull();
  });

  it('devuelve null si el proveedor no sabe de cuotas', async () => {
    expect(await cloudFreeBytes()).toBeNull();
  });
});
