import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameStateSnapshot } from '../../src/debug';

// Headless browsers render a DPR-3 canvas in software at a few frames per second, and the run
// slows down with them (at most 5 fixed steps per frame), so waits are generous here.
test.describe.configure({ timeout: 90_000 });
const WAIT = { timeout: 20_000 };

async function state(page: Page): Promise<GameStateSnapshot> {
  const snapshot = await page.evaluate(() => window.__game?.state());
  if (!snapshot) throw new Error('Debug hooks missing');
  return snapshot;
}

/** Waits for the cooldown, then drops at world x through the hook. */
async function dropAt(page: Page, x: number): Promise<void> {
  await expect
    .poll(async () => (await state(page)).canDrop || (await state(page)).canTake, WAIT)
    .toBe(true);
  // A magnet (GAME_DESIGN §15.2) takes the oldest ball, which is then dropped at x.
  if ((await state(page)).canTake) {
    expect(await page.evaluate(() => window.__game?.take())).toBe(true);
    await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  }
  expect(await page.evaluate((at) => window.__game?.dropAt(at), x)).toBe(true);
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('a run: drop 10 cats, pause and resume, game over, play again, menu', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1&seed=42');
  await page.getByTestId('play').click();
  await expect(page.locator('.play-area canvas')).toBeVisible();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await expect(page.getByTestId('hint')).toHaveText('Drag to aim, release to drop');

  for (let i = 0; i < 10; i++) await dropAt(page, ((i % 5) - 2) * 110);
  // Merges may have joined some of them, but cats are in the jar and the hint has moved on.
  expect((await state(page)).balls).toBeGreaterThan(0);
  await expect(page.getByTestId('hint')).not.toHaveText('Drag to aim, release to drop');

  // Pause freezes the run.
  await page.getByTestId('pause').click();
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  expect((await state(page)).runState).toBe('paused');
  const ticks = (await state(page)).ticks;
  await page.waitForTimeout(400);
  expect((await state(page)).ticks).toBe(ticks);
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('pause-overlay')).toBeHidden();
  await expect.poll(async () => (await state(page)).ticks, WAIT).toBeGreaterThan(ticks);

  // Score from a forced merge reaches the HUD.
  await page.evaluate(() => {
    window.__game?.spawnTier(3, -150);
    window.__game?.spawnTier(3, -150);
  });
  await expect.poll(async () => (await state(page)).score, WAIT).toBeGreaterThan(0);
  await expect(page.getByTestId('hud-score')).not.toHaveText('0');

  await page.evaluate(() => window.__game?.forceGameOver());
  await expect(page.getByTestId('game-over')).toBeVisible();
  const score = (await state(page)).score;
  await expect(page.getByTestId('go-score')).toHaveText(String(score));
  await expect(page.getByTestId('go-stage')).toHaveText('1');
  await expect(page.getByTestId('go-new-best')).toBeVisible();

  await page.getByTestId('play-again').click();
  await expect(page.getByTestId('game-over')).toBeHidden();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  expect((await state(page)).balls).toBe(0);
  await expect(page.getByTestId('hud-score')).toHaveText('0');

  await page.evaluate(() => window.__game?.forceGameOver());
  await page.getByTestId('go-menu').click();
  await expect(page.getByTestId('play')).toBeVisible();
  expect((await state(page)).screen).toBe('menu');

  expect(errors).toEqual([]);
});

test('a tap in the play area drops the cat at the tapped x', async ({ page }) => {
  await page.goto('./?debug=1&seed=1');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  const box = await page.locator('.play-area canvas').boundingBox();
  if (!box) throw new Error('No canvas');

  // Left quarter of the screen: the cat must start left of the jar's centre.
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5);
  await expect.poll(async () => (await state(page)).balls, WAIT).toBe(1);
  const x = await page.evaluate(() => window.__game?.ballXs()[0] ?? 0);
  expect(x).toBeLessThan(-80);

  // Releases during the cooldown are ignored.
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);
  expect((await state(page)).balls).toBe(1);
});

test('backgrounding pauses the run', async ({ page }) => {
  await page.goto('./?debug=1');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  expect((await state(page)).runState).toBe('paused');
});

test('the goal strip shows the stage, its cats and the ones the stage has had', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1&seed=7');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  const goal = page.getByTestId('hud-goal');
  await expect(page.getByTestId('hud-stage')).toHaveText('1');
  const cats = goal.locator('.cat-icon');
  await expect(cats).toHaveCount(9);
  await expect(goal.locator('.cat-icon.is-unmade')).toHaveCount(9);
  // A 5 lights cats 1–5; an 8 lights up to 8. The goal's ring stays still (v0.50.3).
  await page.evaluate(() => window.__game?.spawnTier(5, -150, -window.__game.radiusOf(5)));
  await expect(goal.locator('.cat-icon.is-unmade')).toHaveCount(4);
  await page.evaluate(() => window.__game?.spawnTier(8, 120, -window.__game.radiusOf(8)));
  await expect(goal.locator('.cat-icon.is-unmade')).toHaveCount(1);
  expect(await goal.locator('.hud-goal-slot').evaluate((node) => node.getAnimations().length)).toBe(
    0,
  );
  // The strip and the coins card have layers of their own, so the HUD's repaints don't draw the
  // strip's cats again (v0.50.3, TECH_SPEC §13).
  for (const node of [goal, page.locator('.hud-coins-card')]) {
    expect(await node.evaluate((n) => getComputedStyle(n).willChange)).toBe('transform');
  }
  expect(errors).toEqual([]);
});
