import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AdPlacement } from '../../src/config/ads';

// Rewarded ads (TECH_SPEC §16): the web build shows none; `?ads=fake` draws a test ad, so the flows
// the placements plan builds can be tried here. The Android app's AdMob is checked on a phone.

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const ready = (page: Page): Promise<Record<AdPlacement, boolean> | undefined> =>
  page.evaluate(() => window.__game?.adsState().ready);

const ALL_READY = { specialBall: true, luckySave: true, doubleCoins: true };
const NONE_READY = { specialBall: false, luckySave: false, doubleCoins: false };

test('ads: a fake ad gives closed or rewarded, and none is ready offline', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const errors = watchConsole(page);
  await page.goto('./?debug=1&ads=fake');
  await expect(page.getByTestId('play')).toBeVisible();
  expect(await ready(page)).toEqual(ALL_READY);

  // Closing the ad early gives no reward.
  const closed = page.evaluate(() => window.__game?.showAd('luckySave'));
  await expect(page.getByTestId('fake-ad')).toBeVisible();
  await expect(page.getByTestId('fake-ad-reward')).toBeDisabled();
  expect(await page.evaluate(() => window.__game?.adsState().showing)).toBe(true);
  expect(await ready(page)).toEqual(NONE_READY);
  await page.getByTestId('fake-ad-close').click();
  expect(await closed).toBe('closed');
  await expect(page.getByTestId('fake-ad')).toHaveCount(0);

  // Watching it to the end does.
  const rewarded = page.evaluate(() => window.__game?.showAd('specialBall'));
  await expect(page.getByTestId('fake-ad-reward')).toBeEnabled({ timeout: 10_000 });
  await page.getByTestId('fake-ad-reward').click();
  expect(await rewarded).toBe('rewarded');

  // Offline every option goes at once, and comes back with the connection.
  await context.setOffline(true);
  await expect.poll(() => ready(page)).toEqual(NONE_READY);
  expect(await page.evaluate(() => window.__game?.showAd('doubleCoins'))).toBe('failed');
  await expect(page.getByTestId('fake-ad')).toHaveCount(0);
  await context.setOffline(false);
  await expect.poll(() => ready(page)).toEqual(ALL_READY);
  expect(errors).toEqual([]);
});

test('ads: the web build has none, and Settings no Privacy options', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('./?debug=1');
  await expect(page.getByTestId('play')).toBeVisible();
  expect(await page.evaluate(() => window.__game?.adsState().kind)).toBe('none');
  expect(await ready(page)).toEqual(NONE_READY);
  await page.getByTestId('settings').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
  await expect(page.getByTestId('setting-privacy-options')).toBeHidden();
  expect(errors).toEqual([]);
});

test('ads: the run is saved while an ad covers it, and no pause overlay comes back', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors = watchConsole(page);
  await page.goto('./?debug=1&ads=fake&seed=7');
  await page.getByTestId('play').click();
  await expect.poll(() => page.evaluate(() => window.__game?.state().runState)).toBe('playing');
  await page.evaluate(() => localStorage.removeItem('maneki-merge:run'));

  // A real ad is a native screen over the app: the page goes hidden, then visible again.
  const shown = page.evaluate(() => window.__game?.showAd('luckySave'));
  await expect(page.getByTestId('fake-ad')).toBeVisible();
  await page.evaluate(() => {
    for (const state of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  });
  expect(await page.evaluate(() => localStorage.getItem('maneki-merge:run'))).not.toBeNull();
  await page.getByTestId('fake-ad-close').click();
  expect(await shown).toBe('closed');
  await expect(page.getByTestId('pause-overlay')).toBeHidden();
  expect(await page.evaluate(() => window.__game?.state().runState)).toBe('playing');

  // Without an ad, going to the background pauses the run as before.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => window.__game?.state().runState)).toBe('paused');
  expect(errors).toEqual([]);
});
