import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameStateSnapshot } from '../../src/debug';

test.describe.configure({ timeout: 90_000 });
const WAIT = { timeout: 30_000 };

async function state(page: Page): Promise<GameStateSnapshot> {
  const snapshot = await page.evaluate(() => window.__game?.state());
  if (!snapshot) throw new Error('Debug hooks missing');
  return snapshot;
}

test('XP fills the bar, and a level up offers a blessing (GAME_DESIGN §15.6)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./?debug=1&seed=5');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await state(page)).canDrop, WAIT).toBe(true);

  // The HUD: the stage in words, the level in the XP card.
  await expect(page.getByTestId('hud-stage')).toHaveText(/stage 1/i);
  const level = page.getByTestId('hud-level');
  await expect(level).toHaveText('Lv 1');
  await page.evaluate(() => window.__game?.addXp(50));
  await expect.poll(async () => (await state(page)).xp, WAIT).toBe(50);
  const clip = await page
    .getByTestId('hud-xp-fill')
    .evaluate((node) => (node as HTMLElement).style.clipPath);
  expect(clip).toMatch(/^inset\(0(px)? [\d.]+% 0(px)? 0(px)?\)$/);

  // A level up: time stops and the blessing panel opens.
  await page.evaluate(() => {
    const s = window.__game?.state();
    if (s) window.__game?.addXp(s.xpToNext - s.xp);
  });
  const overlay = page.getByTestId('pick-overlay');
  await expect(overlay).toHaveAttribute('data-kind', 'blessing', WAIT);
  await expect(overlay).toContainText('Level up!');
  expect((await state(page)).runState).toBe('choosing');
  await expect(level).toHaveText('Lv 2');
  // The cards ignore taps for their first 0.4 s.
  await page.waitForTimeout(500);
  await overlay.locator('.pick-card').first().click();
  await page.getByTestId('pick-choose').click();
  await expect(overlay).toBeHidden();
  const after = await state(page);
  expect(after.runState).toBe('playing');
  expect(after.level).toBe(2);
  expect(Object.values(after.pickLevels ?? {}).reduce((a, b) => a + b, 0)).toBe(1);
  expect(errors).toEqual([]);
});
