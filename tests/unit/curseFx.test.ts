import { describe, expect, it } from 'vitest';
import { FX_ART } from '../../src/config/fxSprites';
import {
  CURSE_BELL_GAP,
  CURSE_BELL_HEIGHT,
  CURSE_SWAY_FROM,
  CURSE_SWAY_RAD,
} from '../../src/config/view';
import { bellPlacement, curseSway } from '../../src/game/fx/CurseFx';
import { diePose } from '../../src/game/fx/DiceFx';

describe("the cursed bell's look (GAME_DESIGN §15.12)", () => {
  it('hangs just above the cat, its tag inside the sprite and under the bell', () => {
    const bell = FX_ART.bell;
    expect(bell.tagX - bell.tagR).toBeGreaterThan(0);
    expect(bell.tagX + bell.tagR).toBeLessThan(bell.width);
    expect(bell.tagY + bell.tagR).toBeLessThanOrEqual(bell.height);
    expect(bell.tagY).toBeGreaterThan(bell.height / 2);
    const place = bellPlacement(100, -200, 58, 0);
    // From its cord's top down to the cat's top, less the gap.
    expect(place.y + CURSE_BELL_HEIGHT).toBeCloseTo(-200 - 58 - CURSE_BELL_GAP, 9);
    expect(place.scale * bell.height).toBeCloseTo(CURSE_BELL_HEIGHT, 9);
    expect(place.tagX).toBeCloseTo(100 + (bell.tagX - bell.width / 2) * place.scale, 9);
    expect(place.tagY).toBeGreaterThan(place.y);
    expect(place.tagY).toBeLessThan(-200 - 58);
    expect(place.tagR).toBeGreaterThan(10);
  });

  it('swings its tag with the bell round the cord', () => {
    const still = bellPlacement(0, 0, 41, 0);
    const swung = bellPlacement(0, 0, 41, 0.2);
    // The pivot stays; the tag keeps its distance from it.
    expect(swung.y).toBe(still.y);
    const d = (p: typeof still) => Math.hypot(p.tagX - p.x, p.tagY - p.y);
    expect(d(swung)).toBeCloseTo(d(still), 9);
    expect(swung.tagX).toBeLessThan(still.tagX);
  });

  it('sways only near the end, and never with reduced motion', () => {
    expect(curseSway(CURSE_SWAY_FROM + 1, 175, false)).toBe(0);
    expect(Math.abs(curseSway(CURSE_SWAY_FROM, 175, false))).toBeGreaterThan(0);
    expect(Math.abs(curseSway(0, 175, false))).toBeLessThanOrEqual(CURSE_SWAY_RAD);
    expect(curseSway(0, 175, true)).toBe(0);
  });

  it('has a ring whose hole holds the cat', () => {
    const ring = FX_ART.ring;
    expect(ring.inner).toBeGreaterThan(0);
    expect(ring.outer).toBeGreaterThan(ring.inner);
    expect(2 * ring.outer).toBeLessThanOrEqual(ring.side);
  });
});

describe("a die's look (GAME_DESIGN §15.14)", () => {
  it('pops in, rises and fades out', () => {
    expect(diePose(0, false)).toMatchObject({ rise: 0, alpha: 1 });
    expect(diePose(0, false).pop).toBeCloseTo(0.6, 9);
    expect(diePose(0.5, false).rise).toBeGreaterThan(0.5);
    expect(diePose(1, false)).toMatchObject({ rise: 1, alpha: 0 });
  });

  it('only fades in and out with reduced motion', () => {
    for (const t of [0, 0.3, 0.7, 1]) {
      expect(diePose(t, true)).toMatchObject({ pop: 1, rise: 0 });
    }
    expect(diePose(0, true).alpha).toBe(0);
    expect(diePose(0.5, true).alpha).toBe(1);
  });

  it('has a lucky and an unlucky die', () => {
    expect(FX_ART.dice.map((d) => d.file)).toEqual(['die-lucky.webp', 'die-unlucky.webp']);
  });
});
