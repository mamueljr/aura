import { expect, test } from '@playwright/test';

/**
 * Humo: arranca la app y recorre las pantallas principales. Busca crashes de
 * runtime, rutas rotas y que el shell responda. No toca la biblioteca (el
 * escaneo de carpetas no se puede automatizar con `webkitdirectory`), pero sí
 * verifica que cada vista monta sin error.
 *
 * Idioma fijado a inglés para aserciones estables, independientemente del
 * `navigator.language` del navegador headless.
 */

test.use({
  // i18next detecta por localStorage con la clave `aura.language`.
  storageState: undefined,
});

async function forceEnglish(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('aura.language', 'en'));
}

test('el shell carga y muestra el título', async ({ page }) => {
  await forceEnglish(page);
  await page.goto('/');

  await expect(page).toHaveTitle('Aura Music');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('recorre las pantallas principales sin errores', async ({ page }) => {
  await forceEnglish(page);

  const routes = [
    '/library',
    '/search',
    '/playlists',
    '/favorites',
    '/stats',
    '/settings',
    '/about',
  ];

  for (const route of routes) {
    await page.goto(route);
    // Da un instante a las `liveQuery` de Dexie para resolverse.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  }
});

test('la biblioteca vacía muestra su estado y ofrece añadir carpeta', async ({ page }) => {
  await forceEnglish(page);
  await page.goto('/library');

  await expect(page.getByText('Your library is empty')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add folder' }).first()).toBeVisible();
});

test('ajustes lista las secciones principales', async ({ page }) => {
  await forceEnglish(page);
  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
});
