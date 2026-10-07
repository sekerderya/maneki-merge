import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameStateSnapshot } from '../../src/debug';

// Headless browsers render in software at a few frames per second, and the run slows down with
// them (at most 5 fixed steps per frame): one expansion can take several seconds here.
test.describe.configure({ timeout: 120_000 });
const WAIT = { timeout: 40_000 };

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

async function startRun(page: Page, seed: number): Promise<void> {
  await page.goto(`./?debug=1&seed=${seed}`);
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  // A few cats, so the stage clear has something to pop.
  for (const x of [-150, 150]) {
    await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
    await page.evaluate((at) => window.__game?.dropAt(at), x);
  }
}

/**
 * Makes the stage's last cat the way a player does: two cats one tier below it meet (here both
 * spawn at the dropper, on top of each other) and merge into it.
 */
async function makeLastCat(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    const tier = game.state().lastTier - 1;
    game.spawnTier(tier, 0);
    game.spawnTier(tier, 0);
  });
}

test('making the last cat (two 10s) clears stage 1 and grows the jar', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 3);
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 1');
  await expect(page.getByTestId('hud-goal')).toHaveText('11');

  await makeLastCat(page);
  await expect(page.getByTestId('banner')).toHaveText('The shrine grows!', WAIT);
  // The other cats popped into coins; drops wait until the jar has grown.
  const clearing = await state(page);
  expect(clearing.expansion?.to).toBe(2);
  expect(clearing.runCoins).toBeGreaterThan(119);
  expect(await page.evaluate(() => window.__game?.dropAt(0))).toBe(false);

  // The reveal: the 11 is stage 2's smallest cat, and 21 is the next goal.
  // One wait for the banner and its cat: it only shows for 2 s, and a slow software renderer
  // can take most of that between two separate checks.
  const banner = page.getByTestId('banner').filter({ hasText: 'New cats unlocked!' });
  await expect(banner.locator('.cat-icon')).toHaveText(['21'], WAIT);
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 2');
  await expect(page.getByTestId('hud-goal')).toHaveText('21');

  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  const s = await state(page);
  expect(s.stage).toBe(2);
  expect([s.firstTier, s.lastTier]).toEqual([11, 21]);
  expect(s.balls).toBe(1);
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  expect(await page.evaluate(() => window.__game?.dropAt(0))).toBe(true);
  expect(errors).toEqual([]);
});

test('with no upgrades, clearing stage 2 grows the jar into stage 3', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchConsole(page);
  await startRun(page, 4);
  // Two expansions in a row take long in software rendering (WebKit especially).
  const long = { timeout: 120_000 };
  for (const stage of [2, 3]) {
    await makeLastCat(page);
    await expect.poll(async () => (await state(page)).stage, long).toBe(stage);
    await expect.poll(async () => (await state(page)).runState, long).toBe('playing');
  }
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 3');
  await expect(page.getByTestId('hud-goal')).toHaveText('31');
  expect(errors).toEqual([]);
});

test('a resize and a pause in the middle of an expansion are safe', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 5);
  const size = page.viewportSize();
  if (!size) throw new Error('No viewport');

  await page.evaluate(() => window.__game?.setStage(2));
  await expect.poll(async () => (await state(page)).expansion?.phase ?? null, WAIT).toBe('zoom');

  // Turn into a bigger phone and back while the camera zooms.
  await page.setViewportSize({ width: size.width + 40, height: size.height + 90 });
  await page.waitForTimeout(150);
  await page.setViewportSize(size);

  // Backgrounding pauses the run, timeline included.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  const paused = await state(page);
  expect(paused.runState).toBe('paused');
  await page.waitForTimeout(500);
  expect((await state(page)).ticks).toBe(paused.ticks);

  await page.getByTestId('resume').click();
  await expect.poll(async () => (await state(page)).stage, WAIT).toBe(2);
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  expect((await state(page)).expansion).toBeNull();
  expect(errors).toEqual([]);
});

test('the debug jump plays every expansion in turn', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 6);
  await page.evaluate(() => window.__game?.setStage(3));
  await expect.poll(async () => (await state(page)).stage, { timeout: 80_000 }).toBe(3);
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 3');
  await expect(page.getByTestId('hud-goal')).toHaveText('31');
  expect(errors).toEqual([]);
});
