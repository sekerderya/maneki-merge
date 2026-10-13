import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIGHTNING_ART, lightningSprites } from '../../src/config/lightningSprites';
import type { LightningBoltSprite } from '../../src/config/lightningSprites';
import { SPECIAL_ART } from '../../src/config/specialSprites';

describe("the Lightning blessing's art (docs/ART_ASSETS.md §4.16)", () => {
  it('has the ball and every effect sprite, built into public/assets', () => {
    expect(SPECIAL_ART.lightning).not.toBeNull();
    const art = LIGHTNING_ART!;
    expect(art.bolts).toHaveLength(6);
    expect(art.sky).toHaveLength(3);
    expect(art.arcs).toHaveLength(3);
    expect(art.shocks).toHaveLength(4);
    for (const { file } of lightningSprites()) {
      expect(existsSync(`public/assets/fx/${file}`), file).toBe(true);
    }
  });

  it('lists the sprites in the order the game turns them into frames', () => {
    const art = LIGHTNING_ART!;
    expect(lightningSprites().map((s) => s.file)).toEqual(
      [...art.bolts, ...art.sky, art.flash, art.ring, art.sparks, ...art.arcs, ...art.shocks].map(
        (s) => s.file,
      ),
    );
    expect(lightningSprites(null)).toEqual([]);
  });

  const inside = (s: LightningBoltSprite): void => {
    for (const [x, y] of [
      [s.ax, s.ay],
      [s.bx, s.by],
    ] as const) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(s.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(s.height);
    }
  };

  it('measures each chain bolt from its left end to its right end, on its middle', () => {
    for (const bolt of LIGHTNING_ART!.bolts) {
      inside(bolt);
      expect(bolt.ax).toBeLessThan(bolt.width * 0.05);
      expect(bolt.bx).toBeGreaterThan(bolt.width * 0.95);
      expect(Math.abs(bolt.ay - bolt.by)).toBeLessThan(bolt.height * 0.25);
      expect(bolt.band).toBe(bolt.height);
    }
  });

  it('measures each sky bolt from the top down to its tip', () => {
    for (const bolt of LIGHTNING_ART!.sky) {
      inside(bolt);
      expect(bolt.ay).toBeLessThan(bolt.height * 0.05);
      expect(bolt.by).toBeGreaterThan(bolt.height * 0.9);
      expect(bolt.band).toBe(bolt.width);
    }
  });

  it('gives each round piece a radius inside its square', () => {
    const { flash, ring, sparks, shocks } = LIGHTNING_ART!;
    for (const round of [flash, ring, sparks, ...shocks]) {
      expect(round.radius).toBeGreaterThan(round.side * 0.25);
      expect(round.radius).toBeLessThanOrEqual(round.side / 2);
    }
  });
});
