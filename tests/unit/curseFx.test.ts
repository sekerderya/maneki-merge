import { describe, expect, it } from 'vitest';
import { FX_ART } from '../../src/config/fxSprites';
import { CURSE_SWAY_FROM, CURSE_SWAY_RAD } from '../../src/config/view';
import { curseSway, stoneStage } from '../../src/game/fx/CurseFx';
import { diePose } from '../../src/game/fx/DiceFx';

describe("a cursed cat's look (GAME_DESIGN §15.12)", () => {
  it('shows the first stone pattern for the first half of its count, then the second', () => {
    // 10 drops: 10 to 6, then 5 to 0 (the owner's call).
    expect([10, 9, 8, 7, 6].map((d) => stoneStage(d, 10))).toEqual([0, 0, 0, 0, 0]);
    expect([5, 4, 3, 2, 1, 0].map((d) => stoneStage(d, 10))).toEqual([1, 1, 1, 1, 1, 1]);
    expect([7, 4, 3].map((d) => stoneStage(d, 7))).toEqual([0, 0, 1]);
    expect([6, 4, 3].map((d) => stoneStage(d, 6))).toEqual([0, 0, 1]);
    expect(FX_ART.stones.map((s) => s.file)).toEqual(['stone-0.webp', 'stone-1.webp']);
  });

  it('sways only near the end, and never with reduced motion', () => {
    expect(curseSway(CURSE_SWAY_FROM + 1, 175, false)).toBe(0);
    expect(Math.abs(curseSway(CURSE_SWAY_FROM, 175, false))).toBeGreaterThan(0);
    expect(Math.abs(curseSway(0, 175, false))).toBeLessThanOrEqual(CURSE_SWAY_RAD);
    expect(curseSway(0, 175, true)).toBe(0);
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
