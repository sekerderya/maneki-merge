import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameStateSnapshot } from '../../src/debug';

// Headless browsers run the game slowly (see expansion.spec.ts), so waits are generous.
test.describe.configure({ timeout: 120_000 });
const WAIT = { timeout: 40_000 };
const SAVE_KEY = 'maneki-merge:save';

async function state(page: Page): Promise<GameStateSnapshot> {
  const snapshot = await page.evaluate(() => window.__game?.state());
  if (!snapshot) throw new Error('Debug hooks missing');
  return snapshot;
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** The menu with `coins` debug coins in the wallet. */
async function menuWithCoins(page: Page, coins: number): Promise<void> {
  await page.goto('./?debug=1&seed=42');
  await expect(page.getByTestId('play')).toBeVisible();
  await page.evaluate((c) => window.__game?.addCoins(c), coins);
  await expect(page.getByTestId('coin-balance')).toHaveText(coins.toLocaleString('en-US'));
}

async function buy(page: Page, id: string): Promise<void> {
  await page.getByTestId(`shop-buy-${id}`).click();
}

test('buying with debug coins: prices, states, feedback and persistence', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1');
  // Nothing affordable yet: no dot.
  await expect(page.getByTestId('upgrades-dot')).toBeHidden();
  await menuWithCoins(page, 600);
  await expect(page.getByTestId('upgrades-dot')).toBeVisible();

  await page.getByTestId('upgrades').click();
  const shop = page.getByTestId('shop');
  await expect(shop).toBeVisible();
  await expect(shop.locator('.shop-card')).toHaveCount(8);
  await expect(page.getByTestId('shop-balance')).toHaveText('600');

  // Lucky Paw 0 → 1 for 50.
  const paw = page.getByTestId('shop-buy-luckyPaw');
  await expect(paw).toHaveText('50');
  await expect(page.getByTestId('shop-value-luckyPaw')).toHaveText('Coins+0%→+15%');
  await buy(page, 'luckyPaw');
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('1/10');
  await expect(paw).toHaveText('80');
  await expect(page.getByTestId('shop-balance')).toHaveText('550'); // after the count-down
  await expect(page.getByTestId('shop-card-luckyPaw').locator('.shop-pip.is-on')).toHaveCount(1);

  // Fortune Teller has one level: MAX afterwards.
  await buy(page, 'fortuneTeller');
  const teller = page.getByTestId('shop-buy-fortuneTeller');
  await expect(teller).toHaveText('MAX');
  await expect(teller).toBeDisabled();
  await expect(page.getByTestId('shop-balance')).toHaveText('150');

  // Not enough coins: Shrine Expansion (1,500) is disabled and clicking does nothing.
  const shrine = page.getByTestId('shop-buy-shrineExpansion');
  await expect(shrine).toBeDisabled();
  await expect(shrine).toHaveAttribute('data-state', 'insufficient');

  // Saved at once, outside any write throttle.
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    SAVE_KEY,
  );
  expect(saved.data.wallet.coins).toBe(150);
  expect(saved.data.upgrades).toMatchObject({ luckyPaw: 1, fortuneTeller: 1 });

  // Closing returns to the menu with the new balance; a reload keeps the purchases.
  await page.getByTestId('shop-close').click();
  await expect(shop).toBeHidden();
  await expect(page.getByTestId('coin-balance')).toHaveText('150');
  await page.reload();
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('1/10');
  await expect(page.getByTestId('shop-buy-fortuneTeller')).toHaveText('MAX');
  await expect(page.getByTestId('shop-balance')).toHaveText('150');
  expect(errors).toEqual([]);
});

test('the back button closes the shop and stays on the menu', async ({ page }) => {
  await menuWithCoins(page, 100);
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('shop')).toBeHidden();
  await expect(page.getByTestId('play')).toBeVisible();
  // Open again and close from the UI: the history must not grow.
  const length = await page.evaluate(() => history.length);
  await page.getByTestId('upgrades').click();
  await page.getByTestId('shop-close').click();
  await page.getByTestId('upgrades').click();
  await page.getByTestId('shop-close').click();
  expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(length + 1);
});

test('Fortune Teller shows two cats in the preview', async ({ page }) => {
  const errors = watchConsole(page);
  await menuWithCoins(page, 400);
  await page.getByTestId('upgrades').click();
  await buy(page, 'fortuneTeller');
  await expect(page.getByTestId('shop-buy-fortuneTeller')).toHaveText('MAX');
  await page.getByTestId('shop-close').click();

  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await expect(page.getByTestId('hud-next').locator('.cat-icon')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('Shrine Expansion Lv 1 lets the jar grow into stage 3', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchConsole(page);
  await menuWithCoins(page, 1500);
  await page.getByTestId('upgrades').click();
  await buy(page, 'shrineExpansion');
  await expect(page.getByTestId('shop-level-shrineExpansion')).toHaveText('1/3');
  await page.getByTestId('shop-close').click();

  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  // 3,000 points: stage 2, then stage 3, one expansion at a time.
  // Two expansions in a row take long in software rendering (WebKit especially).
  const long = { timeout: 120_000 };
  await page.evaluate(() => window.__game?.setScore(3000));
  await expect.poll(async () => (await state(page)).stage, long).toBe(3);
  await expect.poll(async () => (await state(page)).runState, long).toBe('playing');
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 3');
  await expect(page.getByTestId('toast')).toBeHidden();
  expect(errors).toEqual([]);
});

for (const [width, height] of [
  [375, 667],
  [390, 844],
  [430, 932],
] as const) {
  test(`the menu and the shop fit ${width}×${height} without overlap`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await menuWithCoins(page, 2000);
    await page.getByTestId('upgrades').click();
    await expect(page.getByTestId('shop')).toBeVisible();
    // Measure once the sheet has slid up.
    await page
      .locator('.shop-sheet')
      .evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)));
    const issues = await page.evaluate(() => {
      const found: string[] = [];
      const inside = (inner: DOMRect, outer: DOMRect): boolean =>
        inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5;
      if (document.documentElement.scrollWidth > window.innerWidth) found.push('page overflow');
      const header = document.querySelector('.shop-header')!.getBoundingClientRect();
      if (header.top < 0 || header.right > window.innerWidth) found.push('header off screen');
      for (const card of document.querySelectorAll<HTMLElement>('.shop-card')) {
        const box = card.getBoundingClientRect();
        if (!inside(box, document.querySelector('.shop-list')!.getBoundingClientRect())) {
          found.push(`${card.dataset['testid']} outside the list`);
        }
        for (const child of card.querySelectorAll('*')) {
          const r = child.getBoundingClientRect();
          if (r.width > 0 && !inside(r, box))
            found.push(`${card.dataset['testid']} ${child.className}`);
        }
        const value = card.querySelector('.shop-value')!.getBoundingClientRect();
        const price = card.querySelector('.shop-buy')!.getBoundingClientRect();
        if (value.right > price.left) found.push(`${card.dataset['testid']} value under the price`);
        if (price.height < 47.5 || price.width < 47.5)
          found.push(`${card.dataset['testid']} small target`);
      }
      return found;
    });
    expect(issues).toEqual([]);
    // The last card scrolls into view.
    const last = page.getByTestId('shop-card-fortuneTeller');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
  });
}
