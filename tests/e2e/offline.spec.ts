import { expect, test } from '@playwright/test';

// Service-worker offline emulation is reliable in Chromium only (TECH_SPEC §11).
test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

test('reloads and starts a run while offline', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByTestId('play')).toBeVisible();

  // Wait until the service worker is active and has precached the build.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active?.state !== 'activated') {
      await new Promise<void>((resolve) => {
        registration.active?.addEventListener('statechange', () => resolve());
      });
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Maneki Merge' })).toBeVisible();
  // The bundled font works offline too.
  expect(await page.evaluate(() => document.fonts.check('700 1em Fredoka'))).toBe(true);

  await page.getByTestId('play').click();
  await expect(page.getByTestId('play-area')).toBeVisible();

  // A deep link with flags still opens offline (navigateFallback), back in the saved run.
  await page.goto('./?seed=7');
  await expect(page.getByTestId('resume')).toBeVisible();

  await context.setOffline(false);
});
