import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Headless browsers run the game slowly (see game.spec.ts), so waits are generous.
test.describe.configure({ timeout: 90_000 });
const WAIT = { timeout: 20_000 };

// Playwright's WebKit builds have no reliable Web Audio (none at all on Windows), so the audio
// checks run in Chromium. The WebKit project still plays through every other spec without audio.
test.skip(({ browserName }) => browserName !== 'chromium', 'Web Audio is checked in Chromium');

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const audio = (page: Page) => page.evaluate(() => window.__game!.audio());
const balls = (page: Page) => page.evaluate(() => window.__game!.state().balls);

test('audio unlocks on the first tap and follows the sound setting', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1&seed=5');
  // Wait for boot without page.evaluate: Chromium counts an evaluate as a user gesture, and boot
  // (fonts and cat art) would then unlock audio when it reads the sound setting.
  await expect(page.getByTestId('play')).toBeVisible(WAIT);
  // No AudioContext before a gesture (it would start blocked and warn).
  expect((await audio(page)).state).toBe('none');

  await page.getByTestId('play').click();
  await expect.poll(async () => (await audio(page)).state, WAIT).toBe('running');

  await page.getByTestId('pause').click();
  await page.getByTestId('pause-sound').click();
  await expect.poll(async () => (await audio(page)).state, WAIT).toBe('suspended');
  await page.getByTestId('pause-sound').click();
  await expect.poll(async () => (await audio(page)).state, WAIT).toBe('running');
  expect(errors).toEqual([]);
});

test('a dozen simultaneous merges play without clipping', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1&seed=5');
  await page.getByTestId('play').click();
  await expect.poll(() => page.evaluate(() => window.__game!.state().canDrop), WAIT).toBe(true);

  // The sounds of 12 merges at once plus a Jackpot and an expansion, rendered offline through
  // the real throttle, mixer and limiter: audible, never clipping.
  const peak = await page.evaluate(() => window.__game!.renderPeak(12));
  expect(peak).toBeGreaterThan(0.1);
  expect(peak).toBeLessThan(1);

  // The same burst in the running game: each pair touches, so all 12 merge on the next step.
  await page.evaluate(() => window.__game!.mergeBurst(12, 1));
  await expect.poll(() => balls(page), WAIT).toBeLessThanOrEqual(12);
  await expect.poll(() => balls(page), WAIT).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
