import { expect, test } from '@playwright/test';

test('boots into the menu with a clean console', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');

  await expect(page.getByRole('heading', { name: 'Maneki Merge' })).toBeVisible();
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(page.getByTestId('upgrades')).toBeVisible();
  await expect(page.getByTestId('coin-balance')).toHaveText('0');
  await expect(page.getByTestId('sound-toggle')).toBeVisible();
  await expect(page.getByTestId('version')).toHaveText(/^v\d+\.\d+\.\d+/);
  await expect(page.locator('#game-screen')).toBeHidden();
  await expect(page.getByTestId('update-badge')).toBeHidden();
  await expect(page.getByTestId('rotate-overlay')).toBeHidden();

  // Let the service worker install before checking the console.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  expect(errors).toEqual([]);
});

test('serves a valid web app manifest', async ({ request }) => {
  const response = await request.get('manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as Record<string, unknown>;
  expect(manifest).toMatchObject({
    name: 'Maneki Merge',
    short_name: 'Maneki',
    display: 'fullscreen',
    orientation: 'portrait',
    start_url: '/maneki-merge/',
    scope: '/maneki-merge/',
  });
  const icons = manifest['icons'] as { sizes: string; purpose?: string }[];
  expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
});

test('shows the right install hint for the platform', async ({ page }, testInfo) => {
  await page.goto('./');
  await expect(page.getByTestId('play')).toBeVisible();
  if (testInfo.project.name.startsWith('iphone')) {
    await expect(page.getByTestId('install-hint-ios')).toBeVisible();
    await expect(page.getByTestId('install-button')).toBeHidden();
  } else {
    // Android shows its button only after Chrome fires beforeinstallprompt.
    await expect(page.getByTestId('install-hint-ios')).toBeHidden();
  }
});

test('toggles the sound icon', async ({ page }) => {
  await page.goto('./');
  const sound = page.getByTestId('sound-toggle');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
});
