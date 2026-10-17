import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The play statistics (TECH_SPEC §17), with the fake service: `?analytics=fake`. */
const FAKE = './?debug=1&analytics=fake';

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const state = (page: Page) => page.evaluate(() => window.__game?.analyticsState());

test('statistics: asked once, nothing sent before the yes, Settings turns them off', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto(FAKE);
  const card = page.getByTestId('stats-consent');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Play statistics');
  await expect(card.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
    'href',
    /\/privacy\.html$/,
  );
  // The menu's first screen waits for the answer.
  expect(await state(page)).toMatchObject({ mode: 'fake', consent: 'unknown', events: [] });
  expect((await state(page))?.pending).toBeGreaterThan(0);

  await page.getByTestId('stats-consent-yes').click();
  await expect(card).toBeHidden();
  await expect.poll(async () => (await state(page))?.consent).toBe('granted');
  expect((await state(page))?.events[0]).toEqual({ type: 'screen', screen: 'menu' });

  // Answered: not asked again.
  await page.reload();
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(card).toBeHidden();
  await expect.poll(async () => (await state(page))?.consent).toBe('granted');

  // A run: its start, its stage, its end.
  await page.getByTestId('play').click();
  await page.waitForFunction(() => window.__game?.state().runState === 'playing');
  await page.evaluate(() => window.__game?.forceGameOver());
  await expect(page.getByTestId('game-over')).toBeVisible();
  const types = ((await state(page))?.events ?? []).map((e) => e.type);
  expect(types).toEqual(
    expect.arrayContaining(['runStarted', 'stageStarted', 'runEnded', 'screen']),
  );
  const ended = (await state(page))?.events.find((e) => e.type === 'runEnded');
  expect(ended).toMatchObject({ reason: 'gameOver', stage: 1 });

  // Settings: the row shows here, and switching it off stops the statistics.
  await page.getByTestId('go-menu').click();
  await page.getByTestId('settings').click();
  const row = page.getByTestId('setting-statistics');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('aria-checked', 'true');
  await row.click();
  await expect(row).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await state(page))?.consent).toBe('denied');
  const sent = (await state(page))?.events.length ?? 0;
  await page.getByTestId('settings-close').click();
  await page.getByTestId('settings').click();
  expect((await state(page))?.events.length).toBe(sent);
  expect(errors).toEqual([]);
});

test('statistics: a no is kept, and the back button says no', async ({ page }) => {
  await page.goto(FAKE);
  await expect(page.getByTestId('stats-consent')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('stats-consent')).toBeHidden();
  await expect(page.getByTestId('play')).toBeVisible();
  expect(await state(page)).toMatchObject({ consent: 'denied', events: [], pending: 0 });
  await page.reload();
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(page.getByTestId('stats-consent')).toBeHidden();
  expect((await state(page))?.consent).toBe('denied');
});

test('statistics: a build without keys never asks and has no Settings row', async ({ page }) => {
  await page.goto('./?debug=1');
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(page.getByTestId('stats-consent')).toBeHidden();
  expect(await state(page)).toMatchObject({ mode: 'none', consent: 'unknown', sinks: [] });
  await page.getByTestId('settings').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
  await expect(page.getByTestId('setting-statistics')).toBeHidden();
});
