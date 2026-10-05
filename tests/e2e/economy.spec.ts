import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameStateSnapshot } from '../../src/debug';

// Headless browsers run the game slowly (see game.spec.ts), so waits are generous.
test.describe.configure({ timeout: 90_000 });
const WAIT = { timeout: 20_000 };
const SAVE_KEY = 'maneki-merge:save';

async function state(page: Page): Promise<GameStateSnapshot> {
  const snapshot = await page.evaluate(() => window.__game?.state());
  if (!snapshot) throw new Error('Debug hooks missing');
  return snapshot;
}

/** The wallet as written to localStorage right now. */
async function storedWallet(page: Page): Promise<number | null> {
  return page.evaluate((key) => {
    const text = localStorage.getItem(key);
    return text
      ? (JSON.parse(text) as { data: { wallet: { coins: number } } }).data.wallet.coins
      : null;
  }, SAVE_KEY);
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function startRun(page: Page, query = '?debug=1&seed=42'): Promise<void> {
  await page.goto(`./${query}`);
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
}

/** Two cats of a tier dropped onto the same spot: they merge on landing. */
async function mergePair(page: Page, tier: number, x: number, golden = false): Promise<void> {
  await page.evaluate(
    ([t, at, g]) => {
      window.__game?.spawnTier(t, at, g);
      window.__game?.spawnTier(t, at);
    },
    [tier, x, golden] as const,
  );
}

test('coins earned in a run survive a reload in the middle of it', async ({ page }) => {
  const errors = watchConsole(page);
  await startRun(page);
  await mergePair(page, 4, -150);
  await mergePair(page, 3, 150, true);
  await expect.poll(async () => (await state(page)).wallet, WAIT).toBeGreaterThan(5);
  const { wallet, runCoins } = await state(page);
  expect(wallet).toBe(runCoins);
  await expect(page.getByTestId('hud-coins')).toHaveText(String(runCoins));

  // Reload at once, well inside the write throttle: the page-hide flush keeps every coin.
  await page.reload();
  await expect(page.getByTestId('play')).toBeVisible();
  expect((await state(page)).wallet).toBe(wallet);
  await expect(page.getByTestId('coin-balance')).toHaveText(String(wallet));
  expect(await storedWallet(page)).toBe(wallet);
  expect(errors).toEqual([]);
});

test('backgrounding writes the save and pauses the run', async ({ page }) => {
  await startRun(page);
  // The run start was written at once; this merge lands inside the throttle window.
  await mergePair(page, 4, 0);
  await expect.poll(async () => (await state(page)).wallet, WAIT).toBeGreaterThan(0);
  const { wallet } = await state(page);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await storedWallet(page)).toBe(wallet);
  expect((await state(page)).runState).toBe('paused');
});

test('settings, records, stats and hints persist', async ({ page }) => {
  await startRun(page);
  await expect(page.getByTestId('hint')).toHaveText('Drag to aim, release to drop');
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);
  await page.evaluate(() => window.__game?.dropAt(0));

  await page.getByTestId('pause').click();
  await page.getByTestId('pause-sound').click();
  await page.getByTestId('pause-haptics').click();
  await page.getByTestId('resume').click();
  await mergePair(page, 5, 100);
  await expect.poll(async () => (await state(page)).score, WAIT).toBeGreaterThan(0);
  const { score } = await state(page);
  await page.evaluate(() => window.__game?.forceGameOver());
  await expect(page.getByTestId('game-over')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('records')).toHaveText(`Best ${score} · Stage 1`);
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    SAVE_KEY,
  );
  expect(saved.data.settings).toEqual({ sound: false, haptics: false });
  expect(saved.data.stats.runsPlayed).toBe(1);
  expect(saved.data.records.highestTier).toBe(6);
  expect(saved.data.flags.hintsSeen.aim).toBe(true);

  // The aim hint doesn't come back.
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await expect(page.getByTestId('hint')).toBeHidden();
});

test('game over shows coins earned and new-record badges', async ({ page }) => {
  await startRun(page);
  await mergePair(page, 4, 0);
  await expect.poll(async () => (await state(page)).runCoins, WAIT).toBeGreaterThan(0);
  await page.evaluate(() => window.__game?.forceGameOver());
  await expect(page.getByTestId('game-over')).toBeVisible();
  const first = await state(page);
  await expect(page.getByTestId('go-coins-value')).toHaveText(String(first.runCoins));
  await expect(page.getByTestId('go-new-best')).toBeVisible();
  await expect(page.getByTestId('go-new-tier')).toBeVisible();
  await expect(page.getByTestId('go-new-stage')).toBeHidden();
  await expect(page.getByTestId('go-tier')).toContainText('5');

  // A smaller second run breaks no record.
  await page.getByTestId('play-again').click();
  await expect.poll(async () => (await state(page)).runState, WAIT).toBe('playing');
  await mergePair(page, 1, 0);
  await expect.poll(async () => (await state(page)).runCoins, WAIT).toBeGreaterThan(0);
  await page.evaluate(() => window.__game?.forceGameOver());
  await expect(page.getByTestId('game-over')).toBeVisible();
  await expect(page.getByTestId('go-new-best')).toBeHidden();
  await expect(page.getByTestId('go-new-tier')).toBeHidden();
  await expect(page.getByTestId('go-best')).toHaveText(String(first.score));
  expect((await state(page)).wallet).toBe(first.runCoins + (await state(page)).runCoins);
});

test('a Lucky Save pops cats into coins instead of ending the run', async ({ page }) => {
  await page.goto('./?debug=1&seed=42');
  await page.evaluate(() => window.__game?.setUpgrade('secondChance', 1));
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).luckySaves, WAIT).toBe(1);
  const start = (await state(page)).ticks;
  for (const x of [-200, -70, 70, 200]) {
    await page.evaluate((at) => window.__game?.spawnTier(2, at), x);
  }
  // The cats must have landed (a 1.3 s fall) and passed the 0.5 s landing grace to count.
  // WebKit renders in software here, so the run can take a while to get there.
  await expect
    .poll(async () => (await state(page)).ticks, { timeout: 60_000 })
    .toBeGreaterThan(start + 270);
  await page.evaluate(() => window.__game?.forceDangerTimeout());
  await expect(page.getByTestId('banner')).toContainText('Lucky Save!');
  const s = await state(page);
  expect(s.runState).toBe('playing');
  expect(s.luckySaves).toBe(0);
  expect(s.runCoins).toBe(8);
  expect(s.balls).toBe(0);

  // Without a save left, the timeout ends the run.
  await page.evaluate(() => window.__game?.forceDangerTimeout());
  await expect(page.getByTestId('game-over')).toBeVisible();
});

test('combos and Jackpots show their banners', async ({ page }) => {
  await startRun(page);
  await mergePair(page, 2, -200);
  await mergePair(page, 2, 0);
  await mergePair(page, 2, 200);
  await expect(page.getByTestId('combo')).toContainText('Combo ×');
  await expect(page.getByTestId('combo')).toBeHidden(WAIT);

  await mergePair(page, 7, 0);
  await expect(page.getByTestId('banner')).toContainText('Jackpot!', WAIT);
  await expect(page.getByTestId('banner-coins')).toHaveText('+120');
});
