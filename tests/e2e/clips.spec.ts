import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// How-it-works clips (GAME_DESIGN §2.5, docs/plans/batch-21.md). Playwright's browsers can't
// all play H.264, so these check that the clip loads (a blob URL and its poster), not that it plays.
test.describe.configure({ timeout: 90_000 });
const WAIT = { timeout: 20_000 };
const SAVE_KEY = 'maneki-merge:save';

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openShop(page: Page): Promise<void> {
  await page.goto('./?debug=1&seed=42');
  await expect(page.getByTestId('play')).toBeVisible();
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop')).toBeVisible();
}

test('a shop card plays its clip; the new dot goes for good; the popup closes three ways', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await openShop(page);
  const shop = page.getByTestId('shop');
  // Only the cards whose effect can't be guessed have a clip.
  await expect(shop.locator('.clip-btn')).toHaveCount(7);
  await expect(page.getByTestId('shop-card-luckyPaw').locator('.clip-btn')).toHaveCount(0);
  const combo = page.getByTestId('clip-btn-combo');
  await expect(combo.locator('.clip-dot')).toBeVisible();

  await combo.click();
  const popup = page.getByTestId('clip-popup');
  await expect(popup).toBeVisible();
  await expect(popup.locator('.clip-title')).toHaveText('Combo Charm');
  await expect(page.getByTestId('clip-caption')).toContainText('combo');
  const video = page.getByTestId('clip-video');
  await expect(video).toHaveAttribute('poster', /clips\/combo\.webp$/);
  await expect(video).toHaveAttribute('src', /^blob:/, WAIT);
  await expect(combo.locator('.clip-dot')).toBeHidden();

  // The close button; a tap outside the card; the back button (which leaves the shop open).
  await page.getByTestId('clip-close').click();
  await expect(popup).toBeHidden();
  await combo.click();
  await page.mouse.click(8, 8);
  await expect(popup).toBeHidden();
  await combo.click();
  await page.goBack();
  await expect(popup).toBeHidden();
  await expect(shop).toBeVisible();

  // Seen survives a reload.
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? '', SAVE_KEY))
    .toContain('"combo":true');
  await openShop(page);
  await expect(page.getByTestId('clip-btn-combo').locator('.clip-dot')).toBeHidden();
  await expect(page.getByTestId('clip-btn-luckySave').locator('.clip-dot')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a pick card plays its clip without being chosen; "How to play" brings the dots back', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1&seed=42');
  await page.getByTestId('play').click();
  await expect.poll(() => page.evaluate(() => window.__game?.state().canDrop), WAIT).toBe(true);
  // Every rule has a clip.
  await page.evaluate(() => window.__game?.offerPicks(true));
  const overlay = page.getByTestId('pick-overlay');
  await expect(overlay).toHaveAttribute('data-kind', 'rule', WAIT);
  await expect(overlay.locator('.pick-card .clip-btn')).toHaveCount(3, WAIT);
  await page.waitForTimeout(500);
  const first = overlay.locator('.pick-card').first();
  const rule = await first.getAttribute('data-id');
  await first.locator('.clip-btn').click();
  await expect(page.getByTestId('clip-popup')).toBeVisible();
  await expect(page.getByTestId('clip-video')).toHaveAttribute('src', /^blob:/, WAIT);
  await expect(overlay.locator('.pick-card.is-selected')).toHaveCount(0);
  await expect(page.getByTestId('pick-choose')).toBeDisabled();

  // Back closes the clip, not the run: no pause.
  await page.goBack();
  await expect(page.getByTestId('clip-popup')).toBeHidden();
  await expect(page.getByTestId('pause-overlay')).toBeHidden();
  await expect(first.locator('.clip-dot')).toBeHidden();
  // The card itself still selects.
  await first.click();
  await expect(first).toHaveClass(/is-selected/);
  await page.getByTestId('pick-choose').click();
  await expect(overlay).toHaveAttribute('data-kind', 'blessing', WAIT);
  expect(await page.evaluate((id) => window.__game?.state().pickLevels?.[id!], rule)).toBe(1);

  // "How to play" in the settings brings every dot back. (The run ends first: a reload would
  // bring it back, paused.)
  await page.evaluate(() => window.__game?.forceGameOver());
  await page.getByTestId('go-menu').click();
  await page.getByTestId('settings').click();
  await page.getByTestId('setting-tips').click();
  await page.getByTestId('settings-close').click();
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop').locator('.clip-dot:visible')).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('the clip popup fits small and big phones', async ({ page }) => {
  for (const size of [
    { width: 375, height: 667 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(size);
    await openShop(page);
    await page.getByTestId('clip-btn-luckySave').click();
    const card = page.locator('.clip-card');
    await expect(card).toBeVisible();
    // Measure once the card has popped in (it scales up from 0.86) and the font is in.
    await card.evaluate(async (node) => {
      await document.fonts.ready;
      await Promise.all(node.getAnimations().map((animation) => animation.finished));
    });
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    const caption = await page.getByTestId('clip-caption').boundingBox();
    expect(caption!.y + caption!.height).toBeLessThanOrEqual(box!.y + box!.height);
  }
});
