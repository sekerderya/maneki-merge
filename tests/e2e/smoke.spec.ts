import { expect, test } from '@playwright/test';

test('boots with the title, the version and a clean console', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');

  await expect(page.getByRole('heading', { name: 'Maneki Merge' })).toBeVisible();
  await expect(page.locator('[data-testid="version"]')).toHaveText(/^v\d+\.\d+\.\d+/);
  expect(errors).toEqual([]);
});
