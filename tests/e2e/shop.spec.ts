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

test('buying with debug coins: prices, states, gates, feedback and persistence', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1');
  // Nothing affordable yet: no dot.
  await expect(page.getByTestId('upgrades-dot')).toBeHidden();
  await menuWithCoins(page, 700);
  await expect(page.getByTestId('upgrades-dot')).toBeVisible();

  await page.getByTestId('upgrades').click();
  const shop = page.getByTestId('shop');
  await expect(shop).toBeVisible();
  // The four upgrades, the blessings' heading and the five blessing cards (v0.36).
  await expect(shop.locator('.shop-card')).toHaveCount(9);
  await expect(page.getByTestId('shop-blessings')).toContainText('Blessings');
  await expect(page.getByTestId('shop-balance')).toHaveText('700');

  // Lucky Paw 0 → 1 for 150.
  const paw = page.getByTestId('shop-buy-luckyPaw');
  // The art's button says "Buy" over the price.
  await expect(paw.locator('.shop-price')).toHaveText('150');
  await expect(page.getByTestId('shop-value-luckyPaw')).toHaveText('Coins+0%→+22.5%');
  await buy(page, 'luckyPaw');
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('1/10');
  await expect(paw.locator('.shop-price')).toHaveText('400');
  await expect(page.getByTestId('shop-balance')).toHaveText('550'); // after the count-down

  // Big Catch shows what a level adds: 3.6 points of the biggest drop, rounded.
  await expect(page.getByTestId('shop-value-bigCatch')).toHaveText('Biggest drop10%→14%');

  // Golden Cats starts open at 1: the next level lets a run reach 12%.
  await expect(page.getByTestId('shop-level-goldenCats')).toHaveText('1/5');
  await expect(page.getByTestId('shop-value-goldenCats')).toHaveText('Up to6%→12%');
  await buy(page, 'goldenCats');
  await expect(page.getByTestId('shop-level-goldenCats')).toHaveText('2/5');
  await expect(page.getByTestId('shop-balance')).toHaveText('150');

  // Combo Charm waits for stage 2: "Reach" over the stage, disabled.
  const combo = page.getByTestId('shop-buy-comboCharm');
  await expect(combo).toBeDisabled();
  await expect(combo).toHaveAttribute('data-state', 'locked');
  await expect(combo).toContainText('Reach');
  await expect(combo.locator('.shop-price')).toHaveText('Stage 2');

  // Not enough coins: Lucky Paw 2 (400) is disabled and says what is missing.
  await expect(paw).toBeDisabled();
  await expect(paw).toHaveAttribute('data-state', 'insufficient');
  await expect(page.getByTestId('shop-need-luckyPaw')).toHaveText('Need 250 more');

  // Saved at once, outside any write throttle.
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    SAVE_KEY,
  );
  expect(saved.data.wallet.coins).toBe(150);
  expect(saved.data.upgrades).toMatchObject({ luckyPaw: 1, goldenCats: 2, bigDrops: 1 });

  // Closing returns to the menu with the new balance; a reload keeps the purchases.
  await page.getByTestId('shop-close').click();
  await expect(shop).toBeHidden();
  await expect(page.getByTestId('coin-balance')).toHaveText('150');
  await page.reload();
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('1/10');
  await expect(page.getByTestId('shop-level-goldenCats')).toHaveText('2/5');
  await expect(page.getByTestId('shop-balance')).toHaveText('150');

  // Reaching stage 2 opens Combo Charm.
  await page.evaluate(() => window.__game?.setBestStage(2));
  await expect(combo).toHaveAttribute('data-state', 'insufficient');
  await expect(combo.locator('.shop-price')).toHaveText('1,000');

  // At the max level: MAX, disabled.
  await page.evaluate(() => window.__game?.setUpgrade('secondChance', 2));
  const chance = page.getByTestId('shop-buy-secondChance');
  await expect(chance.locator('.shop-price')).toHaveText('MAX');
  await expect(chance).toBeDisabled();
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

test('a save from before v0.36 starts over, keeping its settings', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1');
  await expect(page.getByTestId('play')).toBeVisible();
  // A v0.35 save (version 6): a maxed profile with billions of coins and the sound off.
  await page.evaluate((key) => {
    const data = {
      wallet: { coins: 9_000_000_000 },
      upgrades: { luckyPaw: 10, bigCatch: 5, comboCharm: 5, secondChance: 2 },
      records: { bestScore: 2 ** 60, bestStage: 31, highestTier: 279 },
      settings: { sound: false, haptics: true, reduceMotion: false },
    };
    localStorage.setItem(key, JSON.stringify({ version: 6, data }));
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByTestId('coin-balance')).toHaveText('0');
  await expect(page.getByTestId('best-stage')).toHaveText('1');
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('0/10');
  await expect(page.getByTestId('shop-level-goldenCats')).toHaveText('1/5');
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    SAVE_KEY,
  );
  expect(saved.version).toBe(7);
  expect(saved.data.settings.sound).toBe(false);
  expect(saved.data.records).toEqual({ bestScore: 0, bestStage: 1, highestTier: 0 });
  expect(Object.keys(saved.data.upgrades)).toEqual([
    'luckyPaw',
    'bigCatch',
    'comboCharm',
    'secondChance',
    'goldenCats',
    'bigDrops',
    'moreMagnets',
    'hanabi',
    'joker',
  ]);
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
    const last = page.getByTestId('shop-card-joker');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
  });
}
