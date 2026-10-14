import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The scenes for the owner's clips (GAME_DESIGN §2.6): a hidden menu button, a panel of set-up
// moments, and runs that leave the profile alone.
test.describe.configure({ timeout: 90_000 });
const WAIT = { timeout: 20_000 };
const SCENES_KEY = 'maneki-merge:scenes';
const SAVE_KEY = 'maneki-merge:save';
const RUN_KEY = 'maneki-merge:run';

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('the Scenes button is off until ?scenes=1 or the tester reset turn it on', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1');
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(page.getByTestId('scenes')).toBeHidden();
  await page.evaluate(() => {
    window.__game!.addCoins(500);
    window.__game!.setBestStage(5);
  });

  // Seven quick taps on the version in Settings start the save over with a million coins and
  // turn the button on (GAME_DESIGN §2.4); the device remembers.
  await page.getByTestId('settings').click();
  const version = page.getByTestId('version');
  for (let i = 0; i < 7; i++) await version.click();
  await page.waitForFunction(() => window.__game?.state().wallet === 1_000_000, null, WAIT);
  await expect(page.getByTestId('scenes')).toBeVisible();
  // Every upgrade opens: the best stage counts as 20, past every card's gate.
  expect(await page.evaluate(() => window.__game!.state().bestStage)).toBe(20);
  await expect(page.getByTestId('best-stage')).toHaveText('20');
  await page.getByTestId('upgrades').click();
  await expect(page.getByTestId('shop')).toBeVisible();
  await expect(page.locator('[data-testid^="shop-card-"][data-state="locked"]')).toHaveCount(0);
  await page.getByTestId('shop-close').click();
  expect(await page.evaluate((key) => localStorage.getItem(key), SCENES_KEY)).toBe('1');
  await page.reload();
  await expect(page.getByTestId('scenes')).toBeVisible();
  expect(await page.evaluate(() => window.__game!.state().wallet)).toBe(1_000_000);

  // ?scenes=0 turns it off again.
  await page.goto('./?scenes=0');
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(page.getByTestId('scenes')).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), SCENES_KEY)).toBeNull();
  expect(errors).toEqual([]);
});

test('the scene list scrolls under a finger', async ({ page, context, browserName }) => {
  // Real touch events go through CDP, which only Chromium has.
  test.skip(browserName !== 'chromium', 'CDP touch events');
  await page.goto('./?scenes=1');
  await page.getByTestId('scenes').click();
  const list = page.getByTestId('scenes-panel').locator('.scenes-list');
  await expect(list).toBeVisible();
  const box = await list.boundingBox();
  if (!box) throw new Error('No scene list');
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const from = box.y + box.height * 0.8;
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y = 0): Promise<unknown> =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
  // A 300 px swipe up: every touchmove outside a scrollable element is cancelled
  // (platform/viewport.ts), so the list must be one.
  await touch('touchStart', from);
  for (let i = 1; i <= 10; i++) await touch('touchMove', from - i * 30);
  await touch('touchEnd');
  await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
});

test('a scene opens on its set-up jar, plays as a sandbox and restarts for another take', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('./?scenes=1&debug=1');
  await expect(page.getByTestId('play')).toBeVisible();
  const walletBefore = await page.evaluate(() => window.__game!.state().wallet);

  await page.getByTestId('scenes').click();
  const panel = page.getByTestId('scenes-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.scenes-row')).toHaveCount(18);
  // Back closes the panel and stays on the menu.
  await page.goBack();
  await expect(panel).toBeHidden();
  await expect(page.getByTestId('play')).toBeVisible();

  await page.getByTestId('scenes').click();
  await page.getByTestId('scene-jokerClear').click();
  await expect(panel).toBeHidden();
  await expect(page.locator('#game-screen')).toBeVisible();
  await page.waitForFunction(() => window.__game!.state().canDrop, null, WAIT);
  const start = await page.evaluate(() => window.__game!.state());
  expect(start).toMatchObject({ scene: 'jokerClear', stage: 15, current: 'joker', score: 98_610 });
  expect(start.balls).toBe(12);

  // The joker on the 8 makes the last cat: the stage clears.
  await page.evaluate(() => window.__game!.dropAt(0));
  await page.waitForFunction(() => window.__game!.state().runState !== 'playing', null, WAIT);
  // Nothing reaches the profile and nothing is saved to come back.
  const after = await page.evaluate(() => window.__game!.state());
  expect(after.runCoins).toBeGreaterThan(start.runCoins);
  expect(after.wallet).toBe(walletBefore);
  expect(after.bestStage).toBe(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), RUN_KEY)).toBeNull();

  // The pause's Restart scene sets the jar up again (back pauses the clear as it plays).
  await page.goBack();
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  await expect(page.getByTestId('restart-scene')).toBeVisible();
  await page.getByTestId('restart-scene').click();
  await page.waitForFunction(() => window.__game!.state().canDrop, null, WAIT);
  expect(await page.evaluate(() => window.__game!.state())).toMatchObject({
    scene: 'jokerClear',
    stage: 15,
    current: 'joker',
    balls: 12,
    pick: null,
  });

  // Game Over's Play Again plays the scene again too.
  await page.evaluate(() => window.__game!.forceGameOver());
  await expect(page.getByTestId('game-over')).toBeVisible();
  await expect(page.getByTestId('go-new-best')).toBeHidden();
  await page.getByTestId('play-again').click();
  await page.waitForFunction(() => window.__game!.state().canDrop, null, WAIT);
  expect(await page.evaluate(() => window.__game!.state().scene)).toBe('jokerClear');

  // Back on the menu, a real run has no Restart and leaves no scene behind.
  await page.getByTestId('pause').click();
  await page.getByTestId('quit').click();
  await expect(page.getByTestId('scenes')).toBeVisible();
  await page.getByTestId('play').click();
  await page.waitForFunction(() => window.__game!.state().canDrop, null, WAIT);
  expect(await page.evaluate(() => window.__game!.state())).toMatchObject({
    scene: null,
    stage: 1,
  });
  await page.getByTestId('pause').click();
  await expect(page.getByTestId('restart-scene')).toBeHidden();
  const save = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}').data,
    SAVE_KEY,
  );
  expect(save?.records?.bestStage ?? 1).toBe(1);
  expect(errors).toEqual([]);
});
