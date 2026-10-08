import { expect, test } from '@playwright/test';

// The main menu in the owner's art (GAME_DESIGN §2.1): every control on screen, apart, and easy
// to tap, on short and tall phones.
for (const [width, height] of [
  [320, 568],
  [375, 667],
  [390, 844],
  [430, 932],
] as const) {
  test(`the art menu fits ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await expect(page.locator('#menu-screen.is-art')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Maneki Merge' })).toBeVisible();

    const issues = await page.evaluate(() => {
      const found: string[] = [];
      const ids = ['settings', 'coin-balance', 'records', 'play', 'upgrades'];
      const boxes = ids.map((id) => {
        const node = document.querySelector(`[data-testid=${id}]`);
        return [id, node!.getBoundingClientRect()] as const;
      });
      for (const [id, r] of boxes) {
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) {
          found.push(`${id} off screen`);
        }
      }
      const overlap = (a: DOMRect, b: DOMRect): boolean =>
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, ra] = boxes[i]!;
          const [b, rb] = boxes[j]!;
          if (overlap(ra, rb)) found.push(`${a} overlaps ${b}`);
        }
      }
      // Touch targets: 48 px.
      for (const id of ['settings', 'play', 'upgrades']) {
        const r = boxes.find(([name]) => name === id)![1];
        if (r.width < 48 || r.height < 48) found.push(`${id} small target`);
      }
      return found;
    });
    expect(issues).toEqual([]);

    // The record numbers sit inside their wells.
    for (const id of ['best-score', 'best-stage']) {
      const value = await page.getByTestId(id).boundingBox();
      const card = await page.getByTestId(id).locator('..').boundingBox();
      expect(
        value && card && value.x >= card.x && value.x + value.width <= card.x + card.width,
      ).toBe(true);
    }
  });
}

test('the vector menu stays behind ?skin=vector', async ({ page }) => {
  await page.goto('./?skin=vector');
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(page.locator('#menu-screen')).not.toHaveClass(/is-art/);
  await expect(page.locator('.menu-title')).toHaveText('Maneki Merge');
});
