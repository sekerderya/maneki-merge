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
 * Picks the first card of the trial, then of the blessing, through the panel (GAME_DESIGN §15.5),
 * in front of the shut doors (§7.1).
 */
async function chooseThroughPanel(page: Page): Promise<void> {
  const overlay = page.getByTestId('pick-overlay');
  await expect(page.getByTestId('doors')).toBeVisible(WAIT);
  for (const kind of ['trial', 'blessing']) {
    await expect(overlay).toHaveAttribute('data-kind', kind, WAIT);
    await expect(overlay).toBeVisible();
    // The cards ignore taps for their first 0.4 s.
    await page.waitForTimeout(500);
    await overlay.locator('.pick-card').first().click();
    await page.getByTestId('pick-choose').click();
  }
  await expect(overlay).toBeHidden();
}

/** Takes the first option of both picks through the hooks. */
async function choosePicks(page: Page, wait: { timeout: number }): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await expect.poll(async () => (await state(page)).runState, wait).toBe('choosing');
    await page.evaluate(() => window.__game?.choose());
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

test('making the last cat (two 8s) clears stage 1 and moves on in the same jar', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await startRun(page, 3);
  await expect
    .poll(async () => {
      const s = await state(page);
      return [s.stage, s.lastTier];
    })
    .toEqual([1, 9]);

  await makeLastCat(page);
  await expect(page.getByTestId('banner')).toHaveText('Stage clear!', WAIT);
  // The other cats popped into coins; drops wait until stage 2 starts.
  const clearing = await state(page);
  expect(clearing.expansion?.to).toBe(2);
  expect(clearing.runCoins).toBeGreaterThanOrEqual(41);
  expect(await page.evaluate(() => window.__game?.dropAt(0))).toBe(false);
  // The last cat pops too, then the picks: a trial, then a blessing, before stage 2.
  await chooseThroughPanel(page);
  // The doors fold open first, then the blessing applies and stage 2 starts (GAME_DESIGN §7.1).
  await expect
    .poll(async () => {
      const levels = (await state(page)).pickLevels ?? {};
      return Object.values(levels).reduce((a, b) => a + b, 0);
    }, WAIT)
    .toBe(2);
  await expect(page.getByTestId('doors')).toBeHidden();

  // The reveal: stage 2 starts empty, with 18 as its last cat, and no banner announces it.
  await expect
    .poll(async () => {
      const s = await state(page);
      return [s.stage, s.lastTier];
    }, WAIT)
    .toEqual([2, 18]);
  await expect(page.getByTestId('banner').filter({ hasText: 'New cats unlocked!' })).toHaveCount(0);
  // The jar only grows every 5 stages (GAME_DESIGN §7).
  await expect(page.getByTestId('banner').filter({ hasText: 'The shrine grows!' })).toHaveCount(0);

  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  const s = await state(page);
  expect(s.stage).toBe(2);
  expect([s.firstTier, s.lastTier]).toEqual([10, 18]);
  expect(s.balls).toBe(0);
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  expect(await page.evaluate(() => window.__game?.dropAt(0))).toBe(true);
  expect(errors).toEqual([]);
});

test('a rule pick (Batch 18) shows its rules and is chosen through the panel', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 4);
  // As at a clear that grows the jar (GAME_DESIGN §15.5): a rule, then a blessing.
  await page.evaluate(() => window.__game?.offerPicks(true));
  const overlay = page.getByTestId('pick-overlay');
  await expect(overlay).toHaveAttribute('data-kind', 'rule', WAIT);
  await expect(overlay.locator('.pick-title')).toHaveText('Choose a rule');
  await expect(overlay.locator('.pick-card')).toHaveCount(2);
  await expect(overlay.locator('.pick-card.is-rule .pick-level').first()).toHaveText('New rule');
  const rule = await overlay.locator('.pick-card').first().getAttribute('data-id');
  expect(['hubris', 'echo']).toContain(rule);
  await page.waitForTimeout(500);
  await overlay.locator('.pick-card').first().click();
  await page.getByTestId('pick-choose').click();
  await expect(overlay).toHaveAttribute('data-kind', 'blessing', WAIT);
  await page.waitForTimeout(500);
  await overlay.locator('.pick-card').first().click();
  await page.getByTestId('pick-choose').click();
  await expect(overlay).toBeHidden(WAIT);
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  expect((await state(page)).pickLevels?.[rule!]).toBe(1);
  expect(errors).toEqual([]);
});

test('with no upgrades, clearing stage 2 moves on into stage 3', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchConsole(page);
  await startRun(page, 4);
  // Two clears in a row take long in software rendering (WebKit especially).
  const long = { timeout: 120_000 };
  for (const stage of [2, 3]) {
    await makeLastCat(page);
    await choosePicks(page, long);
    await expect.poll(async () => (await state(page)).stage, long).toBe(stage);
    await expect.poll(async () => (await state(page)).runState, long).toBe('playing');
  }
  await expect
    .poll(async () => {
      const s = await state(page);
      return [s.stage, s.lastTier];
    })
    .toEqual([3, 27]);
  expect(errors).toEqual([]);
});

test('a resize and a pause in the middle of an expansion are safe', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 5);
  const size = page.viewportSize();
  if (!size) throw new Error('No viewport');

  // The jar grows when stage 5 is cleared: "The shrine grows!" and the zoom.
  await page.evaluate(() => window.__game?.setStage(6));
  await expect
    .poll(async () => (await state(page)).expansion?.phase ?? null, { timeout: 80_000 })
    .toBe('zoom');
  await expect(page.getByTestId('banner')).toHaveText('The shrine grows!');

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
  await expect.poll(async () => (await state(page)).stage, WAIT).toBe(6);
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
  await expect
    .poll(async () => {
      const s = await state(page);
      return [s.stage, s.lastTier];
    })
    .toEqual([3, 27]);
  expect(errors).toEqual([]);
});
