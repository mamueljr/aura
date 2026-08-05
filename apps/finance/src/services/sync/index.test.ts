import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/db';
import { useSyncStore } from '@/stores/syncStore';

/**
 * El transporte real (OAuth + red de Drive) se sustituye por uno en memoria —
 * justo lo que el contrato `SyncProvider` de `@aura/core` hace posible.
 *
 * Lo que se prueba aquí es el cifrado extremo a extremo: que lo que sale hacia
 * Drive deje de ser legible, que otro dispositivo pueda abrirlo con la misma
 * frase, y sobre todo que **ningún camino pierda datos** — ni al activarlo, ni
 * al llegar un sobre que este dispositivo no puede descifrar.
 */
const fake = vi.hoisted(() => ({ remote: null as unknown }));

vi.mock('./provider', () => ({
  BACKUP_KEY: 'aura-finance-backup.json',
  provider: {
    id: 'fake',
    getAccessToken: () => Promise.resolve('token-de-prueba'),
    pull: () => Promise.resolve(fake.remote),
    push: (_key: string, payload: unknown) => {
      fake.remote = payload;
      return Promise.resolve();
    },
    remove: () => {
      fake.remote = null;
      return Promise.resolve();
    },
    connect: () => Promise.resolve('persona@example.com'),
    disconnect: () => {},
  },
}));

const { disableEncryption, isEncryptionEnabled, setUpEncryption, syncNow, SyncCryptoError } =
  await import('./index');
const { clearKey } = await import('./crypto');

const FRASE = 'una frase larga y secreta';

async function movimiento(id: string, updatedAt: string, amount = 100): Promise<void> {
  await db.transactions.put({
    id,
    type: 'expense',
    description: `Movimiento ${id}`,
    amount,
    category: 'Otro gasto',
    date: '2026-08-01',
    accountId: 'acc-1',
    createdAt: updatedAt,
    updatedAt,
  });
}

/** El respaldo tal y como quedaría en Drive, en JSON. */
const remoteAsText = (): string => JSON.stringify(fake.remote);

beforeEach(async () => {
  fake.remote = null;
  await clearKey();
  await Promise.all(
    [db.transactions, db.accounts, db.budgets, db.recurringRules].map((t) => t.clear()),
  );
  useSyncStore.setState({
    enabled: true,
    accountEmail: 'persona@example.com',
    lastSyncAt: null,
    fileId: null,
    encrypted: false,
  });
});

describe('cifrado opt-in', () => {
  it('activarlo deja el respaldo de Drive ilegible', async () => {
    await movimiento('t1', '2026-08-01T10:00:00.000Z', 12345);

    await setUpEncryption(FRASE);

    const enDrive = remoteAsText();
    // Lo que se sube ya no contiene ni el importe ni la descripción.
    expect(enDrive).not.toContain('12345');
    expect(enDrive).not.toContain('Movimiento t1');
    expect(enDrive).toContain('ciphertext');
    expect(await isEncryptionEnabled()).toBe(true);
  });

  it('sigue sincronizando con el cifrado activo', async () => {
    await movimiento('t1', '2026-08-01T10:00:00.000Z');
    await setUpEncryption(FRASE);

    // Un cambio local posterior tiene que subir, y poder volver a leerse.
    // La marca va por delante del `lastSyncAt` que acaba de sellar el push
    // (que usa el reloj real), no de las fechas fijas del resto del test.
    await movimiento('t2', new Date(Date.now() + 60_000).toISOString());
    const result = await syncNow();

    expect(result.action).toBe('pushed');
    expect(remoteAsText()).toContain('ciphertext');

    // …y se puede volver a leer: se borra lo local y se recupera del respaldo.
    await db.transactions.clear();
    useSyncStore.setState({ lastSyncAt: null });
    expect((await syncNow()).action).toBe('pulled');

    expect(await db.transactions.get('t2')).toBeDefined();
  });

  it('otro dispositivo lo abre con la misma frase', async () => {
    await movimiento('t1', '2026-08-01T10:00:00.000Z');
    await setUpEncryption(FRASE);

    // "Otro dispositivo": mismo respaldo remoto, sin clave y sin datos.
    await clearKey();
    await db.transactions.clear();
    useSyncStore.setState({ lastSyncAt: null, encrypted: false });

    expect(await setUpEncryption(FRASE)).toBe('unlocked');
    await syncNow();

    expect(await db.transactions.get('t1')).toBeDefined();
  });

  it('una frase incorrecta no queda registrada', async () => {
    await movimiento('t1', '2026-08-01T10:00:00.000Z');
    await setUpEncryption(FRASE);
    await clearKey();

    await expect(setUpEncryption('otra frase distinta')).rejects.toThrow();
    // Si se guardara igualmente, la siguiente sincronización fallaría en
    // silencio con una clave que no abre nada.
    expect(await isEncryptionEnabled()).toBe(false);
  });

  it('desactivarlo devuelve el respaldo a texto legible', async () => {
    await movimiento('t1', '2026-08-01T10:00:00.000Z', 12345);
    await setUpEncryption(FRASE);

    await disableEncryption();

    expect(remoteAsText()).toContain('12345');
    expect(remoteAsText()).not.toContain('ciphertext');
    expect(await isEncryptionEnabled()).toBe(false);
  });

  it('al activarlo no se pierde lo que ya había en claro en Drive', async () => {
    // El otro dispositivo había subido algo sin cifrar; aquí no está.
    await movimiento('mio', '2026-08-02T10:00:00.000Z');
    const suyo = {
      app: 'aura-finance',
      appVersion: '0.0.1',
      schemaVersion: 6,
      exportedAt: '2026-08-01T10:00:00.000Z',
      data: {
        transactions: [
          {
            id: 'suyo',
            type: 'expense',
            description: 'Movimiento suyo',
            amount: 50,
            category: 'Otro gasto',
            date: '2026-08-01',
            accountId: 'acc-1',
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-01T10:00:00.000Z',
          },
        ],
        accounts: [],
        budgets: [],
        recurringRules: [],
      },
    };
    fake.remote = suyo;

    await setUpEncryption(FRASE);

    // Cifrar sube todo lo local encima: sin fusionar antes, "suyo" se perdería.
    expect(await db.transactions.get('suyo')).toBeDefined();
    expect(await db.transactions.get('mio')).toBeDefined();
  });
});

describe('sobre cifrado sin clave en este dispositivo', () => {
  it('falla claro en vez de tratarlo como un respaldo vacío', async () => {
    await movimiento('t1', '2026-08-01T10:00:00.000Z');
    await setUpEncryption(FRASE);
    const cifrado = fake.remote;

    await clearKey();
    useSyncStore.setState({ lastSyncAt: null });

    await expect(syncNow()).rejects.toThrow(SyncCryptoError);
    // Y no ha tocado el respaldo: si lo sobrescribiera con lo local, el otro
    // dispositivo perdería sus datos por no saber leerlos aquí.
    expect(fake.remote).toBe(cifrado);
  });
});
