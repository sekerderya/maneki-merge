import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function screen(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__game?.screen());
}

test.describe('screens and back button', () => {
  test('PLAY opens the game screen and Pause → Quit returns to the menu', async ({ page }) => {
    await page.goto('./?debug=1');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('play-area')).toBeVisible();
    await expect(page.locator('#menu-screen')).toBeHidden();
    expect(await screen(page)).toBe('game');

    await page.getByTestId('pause').click();
    await expect(page.getByTestId('pause-overlay')).toBeVisible();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(page.locator('#game-screen')).toBeHidden();
    expect(await screen(page)).toBe('menu');
  });

  test('the browser/Android back button goes game → pause → menu', async ({ page }) => {
    await page.goto('./?debug=1');
    const startLength = await page.evaluate(() => history.length);

    await page.getByTestId('play').click();
    await expect(page.getByTestId('play-area')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('pause-overlay')).toBeVisible();
    expect(await screen(page)).toBe('game');
    await page.goBack();
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(page.getByTestId('pause-overlay')).toBeHidden();
    expect(await screen(page)).toBe('menu');
    // Still on the app: the back press was consumed, the page didn't navigate away.
    await expect(page).toHaveURL(/\?debug=1$/);

    // Opening and closing via the UI must not grow the history.
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('play').click();
      await page.getByTestId('pause').click();
      await page.getByTestId('quit').click();
    }
    await expect(page.getByTestId('play')).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(startLength + 1);
  });
});

test.describe('update badge', () => {
  test('appears only on the menu, never during a run', async ({ page }) => {
    await page.goto('./?debug=1');
    await page.getByTestId('play').click();
    await page.evaluate(() => window.__game?.simulateUpdateReady());
    await expect(page.getByTestId('update-badge')).toBeHidden();

    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('update-badge')).toBeVisible();
    await expect(page.getByTestId('update-badge')).toHaveText('Update ready — tap to restart');
  });
});

test.describe('URL flags', () => {
  test('are parsed from the query string', async ({ page }) => {
    await page.goto('./?debug=1&seed=1234&skin=placeholder');
    const flags = await page.evaluate(() => window.__game?.flags);
    expect(flags).toEqual({ debug: true, seed: 1234, skin: 'placeholder' });
  });

  test('test hooks are absent without ?debug=1', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    expect(await page.evaluate(() => window.__game === undefined)).toBe(true);
  });
});

test.describe('layout', () => {
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ] as const) {
    test(`has no overflow at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await expect(page.getByTestId('play')).toBeVisible();

      for (const screenName of ['menu', 'game'] as const) {
        if (screenName === 'game') await page.getByTestId('play').click();
        const result = await page.evaluate(() => {
          const root = document.documentElement;
          const offscreen = [...document.querySelectorAll('button, p, h1, .coin-balance')]
            .filter((node) => {
              const rect = node.getBoundingClientRect();
              if (rect.width === 0 && rect.height === 0) return false;
              return (
                rect.left < 0 ||
                rect.top < 0 ||
                rect.right > window.innerWidth ||
                rect.bottom > window.innerHeight
              );
            })
            .map((node) => node.outerHTML.slice(0, 80));
          return {
            scrollWidth: root.scrollWidth,
            scrollHeight: root.scrollHeight,
            offscreen,
          };
        });
        expect(result.scrollWidth).toBeLessThanOrEqual(width);
        expect(result.scrollHeight).toBeLessThanOrEqual(height);
        expect(result.offscreen).toEqual([]);
      }
    });
  }

  test('touch targets are at least 48 px', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    for (const id of ['play', 'upgrades', 'sound-toggle']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(48);
      expect(box?.height).toBeGreaterThanOrEqual(48);
    }
    await page.getByTestId('play').click();
    const pause = await page.getByTestId('pause').boundingBox();
    expect(pause?.width).toBeGreaterThanOrEqual(48);
    expect(pause?.height).toBeGreaterThanOrEqual(48);
  });

  test('a phone in landscape shows the rotate overlay', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('rotate-overlay')).toBeHidden();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByTestId('rotate-overlay')).toBeVisible();
    await expect(page.getByTestId('rotate-overlay')).toHaveText('Please rotate your device');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('rotate-overlay')).toBeHidden();
  });
});
