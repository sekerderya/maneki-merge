import { describe, expect, it } from 'vitest';
import {
  XP_COMBO_MAX_STEPS,
  XP_COMBO_STEP,
  XP_FIRST_LEVEL,
  XP_LEVEL_GROWTH,
  XP_START_LEVEL,
} from '../../src/config/xp';
import { mergeXp, xpComboBonus, XpTracker, xpToNext } from '../../src/core/xp';

describe('XP and levels (GAME_DESIGN §15.6)', () => {
  it('uses the documented numbers', () => {
    expect([XP_START_LEVEL, XP_FIRST_LEVEL, XP_LEVEL_GROWTH]).toEqual([1, 100, 1.4]);
    expect([XP_COMBO_STEP, XP_COMBO_MAX_STEPS]).toEqual([0.25, 4]);
  });

  it('needs 1.4 times more XP for each level', () => {
    expect([1, 2, 3, 4, 5, 6].map(xpToNext)).toEqual([100, 140, 196, 274, 384, 538]);
  });

  it('adds a quarter of a merge per combo step, up to double', () => {
    expect([0, 1, 2, 3, 5, 6, 20].map(xpComboBonus)).toEqual([0, 0, 0.25, 0.5, 1, 1, 1]);
  });

  it('gives a merge its new cat’s size, with the combo, halves rounded up', () => {
    expect(mergeXp(4, 1)).toBe(4);
    expect(mergeXp(4, 2)).toBe(5);
    expect(mergeXp(3, 2)).toBe(4); // 3.75
    expect(mergeXp(2, 3)).toBe(3);
    expect(mergeXp(9, 9)).toBe(18);
  });

  it('tracks the level, carrying the rest over, and several levels at once', () => {
    const xp = new XpTracker();
    expect([xp.level, xp.xp, xp.toNext]).toEqual([1, 0, 100]);
    expect(xp.add(99)).toBe(0);
    expect(xp.add(5)).toBe(1);
    expect([xp.level, xp.xp, xp.toNext]).toEqual([2, 4, 140]);
    expect(xp.add(140 + 196)).toBe(2);
    expect([xp.level, xp.xp]).toEqual([4, 4]);
    expect(xp.add(0)).toBe(0);
    expect(xp.add(-3)).toBe(0);
    expect(xp.add(Number.NaN)).toBe(0);
    expect(xp.xp).toBe(4);
  });
});
