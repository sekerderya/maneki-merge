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
  // A few cats, so the expansion has something to carry along.
  for (const x of [-150, 150]) {
    await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
    await page.evaluate((at) => window.__game?.dropAt(at), x);
  }
}

test('reaching 500 points grows the jar into stage 2', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 3);
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 1');

  await page.evaluate(() => window.__game?.setScore(500));
  await expect(page.getByTestId('banner')).toHaveText('The shrine grows!', WAIT);
  // Time stops: the run is expanding and nothing can be dropped.
  expect((await state(page)).expansion?.to).toBe(2);
  expect(await page.evaluate(() => window.__game?.dropAt(0))).toBe(false);

  // The reveal: stage 2's cap allows tiers 8 and 9.
  const banner = page.getByTestId('banner');
  await expect(banner).toContainText('New cats unlocked!', WAIT);
  await expect(banner.locator('.cat-icon')).toHaveText(['8', '9']);
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 2');

  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  expect((await state(page)).stage).toBe(2);
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  expect(await page.evaluate(() => window.__game?.dropAt(0))).toBe(true);
  expect(errors).toEqual([]);
});

test('a stage the Shrine does not unlock shows the lock and a toast once', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 4);
  await expect(page.getByTestId('hud-lock')).toBeHidden();

  // 3,000 points: stage 2 opens, stage 3 needs Shrine Expansion Lv 1.
  await page.evaluate(() => window.__game?.setScore(3000));
  await expect(page.getByTestId('toast')).toHaveText(
    'Expansion locked — upgrade the Shrine in the shop',
    WAIT,
  );
  await expect(page.getByTestId('hud-lock')).toBeVisible();
  const s = await state(page);
  expect(s.stage).toBe(2);
  expect(s.locked).toBe(true);
  expect(s.runState).toBe('playing');
  expect(errors).toEqual([]);
});

test('a resize and a pause in the middle of an expansion are safe', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 5);
  const size = page.viewportSize();
  if (!size) throw new Error('No viewport');

  await page.evaluate(() => window.__game?.setScore(500));
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

test('the debug jump plays every expansion, past a locked stage', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page, 6);
  await page.evaluate(() => window.__game?.setStage(3));
  await expect.poll(async () => (await state(page)).stage, { timeout: 80_000 }).toBe(3);
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await expect(page.getByTestId('hud-stage')).toHaveText('Stage 3');
  expect(errors).toEqual([]);
});
