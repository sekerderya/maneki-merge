import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameStateSnapshot } from '../../src/debug';

// The rewarded ads in play (GAME_DESIGN §2.7), with `?ads=fake`'s test ad: the bonus ball, one
// more Lucky Save and Game Over's Double coins.

const WAIT = { timeout: 20_000 };

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function state(page: Page): Promise<GameStateSnapshot> {
  const snapshot = await page.evaluate(() => window.__game?.state());
  if (!snapshot) throw new Error('No debug hooks');
  return snapshot;
}

async function startRun(page: Page, seed: number): Promise<void> {
  await page.goto(`./?debug=1&ads=fake&seed=${seed}`);
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
}

/** Drops (or, a magnet, takes) the dropper's ball once the cooldown is over. */
async function playBall(page: Page, x: number): Promise<void> {
  await expect
    .poll(async () => {
      const s = await state(page);
      return s.canDrop || s.canTake;
    }, WAIT)
    .toBe(true);
  const done = await page.evaluate(
    (at) => (window.__game?.state().canTake ? window.__game.take() : window.__game?.dropAt(at)),
    x,
  );
  expect(done).toBe(true);
}

/** Watches the fake ad to its end and takes the reward. */
async function watchFakeAd(page: Page): Promise<void> {
  await expect(page.getByTestId('fake-ad')).toBeVisible();
  await expect(page.getByTestId('fake-ad-reward')).toBeEnabled({ timeout: 10_000 });
  await page.getByTestId('fake-ad-reward').click();
  await expect(page.getByTestId('fake-ad')).toHaveCount(0);
}

test('the bonus ball: from the 8th drop, a card, the ad, then straight into the paw', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = watchConsole(page);
  await startRun(page, 11);
  const bonus = page.getByTestId('hud-bonus');
  for (let i = 0; i < 7; i++) await playBall(page, ((i % 5) - 2) * 60);
  await expect(bonus).toBeHidden();
  await playBall(page, 90);
  await expect(bonus).toBeVisible();
  const before = await state(page);
  expect(before.adBall).not.toBeNull();

  // Not now: nothing happens, the bubble stays.
  await bonus.click();
  const offer = page.getByTestId('ad-offer');
  await expect(offer).toBeVisible();
  expect((await state(page)).runState).toBe('paused');
  await page.getByTestId('ad-offer-decline').click();
  await expect(offer).toBeHidden();
  await expect.poll(async () => (await state(page)).runState).toBe('playing');
  await expect(bonus).toBeVisible();

  // The ad closed early gives nothing either.
  await bonus.click();
  await page.getByTestId('ad-offer-watch').click();
  await expect(page.getByTestId('fake-ad')).toBeVisible();
  await page.getByTestId('fake-ad-close').click();
  await expect.poll(async () => (await state(page)).runState).toBe('playing');
  expect((await state(page)).current).toBe(before.current);
  await expect(bonus).toBeVisible();

  // Watched: the ball is in the paw, NEXT as it was, and no bubble for the rest of the stage.
  await bonus.click();
  await page.getByTestId('ad-offer-watch').click();
  await watchFakeAd(page);
  await expect.poll(async () => (await state(page)).current).toBe(before.adBall);
  const after = await state(page);
  expect(after.runState).toBe('playing');
  expect([after.next, after.nextTier]).toEqual([before.next, before.nextTier]);
  expect(after.adBall).toBeNull();
  await expect(bonus).toBeHidden();
  expect(errors).toEqual([]);
});

test('one more Lucky Save for an ad, once per run; then Double coins at Game Over', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = watchConsole(page);
  await startRun(page, 5);
  // Some coins to double: merges on the floor.
  await page.evaluate(() => window.__game?.mergeBurst(3));
  await expect.poll(async () => (await state(page)).runCoins, WAIT).toBeGreaterThan(0);

  await page.evaluate(() => window.__game?.forceDangerTimeout());
  await expect(page.getByTestId('ad-offer')).toBeVisible();
  await expect(page.getByTestId('ad-offer')).toContainText('Out of room!');
  expect((await state(page)).runState).toBe('lastChance');
  await page.getByTestId('ad-offer-watch').click();
  await watchFakeAd(page);
  await expect.poll(async () => (await state(page)).runState).toBe('playing');
  expect((await state(page)).lastChanceTaken).toBe(true);

  // Once per run: the next time the run ends.
  await page.evaluate(() => window.__game?.forceDangerTimeout());
  await expect(page.getByTestId('game-over')).toBeVisible();
  await expect(page.getByTestId('ad-offer')).toBeHidden();

  const { runCoins, wallet } = await state(page);
  const double = page.getByTestId('go-double');
  await expect(double).toBeVisible();
  await double.click();
  await watchFakeAd(page);
  await expect(page.getByTestId('go-coins-value')).toHaveText(String(runCoins * 2));
  await expect(double).toBeHidden();
  expect((await state(page)).wallet).toBe(wallet + runCoins);
  expect(errors).toEqual([]);
});

test('declining one more Lucky Save ends the run; offline none is asked for', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await startRun(page, 5);
  await page.evaluate(() => window.__game?.forceDangerTimeout());
  await page.getByTestId('ad-offer-decline').click();
  await expect(page.getByTestId('game-over')).toBeVisible();
  // No coins earned: nothing to double.
  await expect(page.getByTestId('go-double')).toBeHidden();

  await page.getByTestId('play-again').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await context.setOffline(true);
  await page.evaluate(() => window.__game?.forceDangerTimeout());
  await expect(page.getByTestId('game-over')).toBeVisible();
  await expect(page.getByTestId('ad-offer')).toBeHidden();
  await context.setOffline(false);
});
