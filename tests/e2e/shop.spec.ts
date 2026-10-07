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
  await expect(shop.locator('.shop-card')).toHaveCount(5);
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

  // Big Catch and Golden Merge show what a level adds.
  await expect(page.getByTestId('shop-value-bigCatch')).toHaveText('Biggest drop10%→13%');
  await expect(page.getByTestId('shop-value-goldenMerge')).toHaveText('Golden merges0%→3%');

  // Second Chance 0 → 1 for 500; level 2 costs 4,000.
  await buy(page, 'secondChance');
  await expect(page.getByTestId('shop-level-secondChance')).toHaveText('1/2');
  await expect(page.getByTestId('shop-balance')).toHaveText('50');

  // Not enough coins: Golden Merge (120) is disabled and clicking does nothing.
  const golden = page.getByTestId('shop-buy-goldenMerge');
  await expect(golden).toBeDisabled();
  await expect(golden).toHaveAttribute('data-state', 'insufficient');
  await expect(page.getByTestId('shop-need-goldenMerge')).toHaveText('Need 70 more');

  // Saved at once, outside any write throttle.
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    SAVE_KEY,
  );
  expect(saved.data.wallet.coins).toBe(50);
  expect(saved.data.upgrades).toMatchObject({ luckyPaw: 1, secondChance: 1 });

  // Closing returns to the menu with the new balance; a reload keeps the purchases.
  await page.getByTestId('shop-close').click();
  await expect(shop).toBeHidden();
  await expect(page.getByTestId('coin-balance')).toHaveText('50');
  await page.reload();
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('1/10');
  await expect(page.getByTestId('shop-level-secondChance')).toHaveText('1/2');
  await expect(page.getByTestId('shop-balance')).toHaveText('50');

  // At the max level: MAX, disabled.
  await page.evaluate(() => window.__game?.setUpgrade('secondChance', 2));
  const chance = page.getByTestId('shop-buy-secondChance');
  await expect(chance).toHaveText('MAX');
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

test('an old save gets its Shrine Expansion and Fortune Teller coins back', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1');
  await expect(page.getByTestId('play')).toBeVisible();
  // A v0.11 save (version 2): Shrine Expansion 1, Fortune Teller 1, Golden Touch 2, and a
  // record tier from the 12-cat stages.
  await page.evaluate((key) => {
    const data = {
      wallet: { coins: 100 },
      upgrades: { luckyPaw: 1, shrineExpansion: 1, fortuneTeller: 1, goldenTouch: 2 },
      records: { bestScore: 900, bestStage: 5, highestTier: 54 },
    };
    localStorage.setItem(key, JSON.stringify({ version: 2, data }));
  }, SAVE_KEY);
  await page.reload();
  // 100 + 1,500 + 400
  await expect(page.getByTestId('coin-balance')).toHaveText('2,000');
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop-level-goldenMerge')).toHaveText('2/5');
  await expect(page.getByTestId('shop-level-luckyPaw')).toHaveText('1/10');
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    SAVE_KEY,
  );
  expect(saved.version).toBe(4);
  // Capped at today's last tier (v3 → v4).
  expect(saved.data.records.highestTier).toBe(46);
  expect(Object.keys(saved.data.upgrades)).toEqual([
    'luckyPaw',
    'bigCatch',
    'goldenMerge',
    'comboCharm',
    'secondChance',
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
    const last = page.getByTestId('shop-card-secondChance');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
  });
}
