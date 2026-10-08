import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const SAVE_KEY = 'maneki-merge:save';

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function savedData(page: Page): Promise<Record<string, Record<string, unknown>>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').data, SAVE_KEY);
}

test('settings: switches persist, reduce motion marks the page, tips come back', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('./');
  await expect(page.getByTestId('play')).toBeVisible();
  // A returning player who has seen both first-run hints.
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 2, data: { flags: { hintsSeen: { aim: true, merge: true } } } }),
      ),
    SAVE_KEY,
  );
  await page.reload();

  await page.getByTestId('settings').click();
  const panel = page.getByTestId('settings-panel');
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText('Music');
  await expect(page.getByTestId('version')).toBeVisible();

  const sound = page.getByTestId('setting-sound');
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await expect(sound).toContainText('ON');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await expect(sound).toContainText('OFF');

  const motion = page.getByTestId('setting-reduceMotion');
  await expect(motion).toHaveAttribute('aria-checked', 'false');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);

  await page.getByTestId('setting-tips').click();
  await expect(page.getByTestId('setting-tips')).toContainText('Tips will show in your next run');

  // The back button closes the panel and stays on the menu.
  await page.goBack();
  await expect(panel).toBeHidden();
  await expect(page.getByTestId('play')).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  const data = await savedData(page);
  expect(data['settings']).toEqual({ sound: false, haptics: true, reduceMotion: true });
  expect(data['flags']).toEqual({ hintsSeen: { aim: false, merge: false, magnet: false } });
  await page.getByTestId('settings').click();
  await expect(page.getByTestId('setting-sound')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('settings-close').click();
  await expect(panel).toBeHidden();

  // The first hint is back in the next run.
  await page.getByTestId('play').click();
  await expect(page.getByTestId('hint')).toHaveText('Drag to aim, release to drop');
  expect(errors).toEqual([]);
});

for (const [width, height] of [
  [375, 667],
  [430, 932],
] as const) {
  test(`the settings card fits ${width}×${height} with full-width rows`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await page.getByTestId('settings').click();
    const card = page.locator('.settings-card');
    await card.evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)));
    const issues = await page.evaluate(() => {
      const found: string[] = [];
      const box = document.querySelector('.settings-card')!.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight || box.right > window.innerWidth) {
        found.push('card off screen');
      }
      for (const row of document.querySelectorAll<HTMLElement>('.settings-row')) {
        if (row.hidden) continue;
        const r = row.getBoundingClientRect();
        if (r.height < 48) found.push(`${row.dataset['testid']} short`);
        if (r.left < box.left || r.right > box.right) found.push(`${row.dataset['testid']} wide`);
      }
      return found;
    });
    expect(issues).toEqual([]);
  });
}
