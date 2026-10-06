import { describe, expect, it } from 'vitest';
import {
  coinPayout,
  ComboCounter,
  jackpotBaseCoins,
  jackpotScore,
  mergeScore,
  popCoins,
  RunEconomy,
} from '../../src/core/economy';
import { roundStable } from '../../src/core/math';

describe('coinPayout (GAME_DESIGN §5)', () => {
  it('is round(base × multiplier × (1 + combo bonus) × golden)', () => {
    expect(coinPayout(24, 1, 0, false)).toBe(24);
    expect(coinPayout(24, 1.45, 0, false)).toBe(35); // 34.8
    expect(coinPayout(24, 1.45, 0.4, false)).toBe(49); // 48.72
    expect(coinPayout(24, 1.45, 0.4, true)).toBe(146); // 146.16
    expect(coinPayout(1684, 2.5, 2, true)).toBe(37_890);
  });

  it('pays at least 1', () => {
    expect(coinPayout(0, 1, 0, false)).toBe(1);
    expect(coinPayout(0.2, 1, 0, false)).toBe(1);
  });

  it('rounds halves up despite floating-point noise', () => {
    // A stage-2 Jackpot (350 base coins) at Lucky Paw 1 is 402.5, but 402.49999999999994 in
    // floating point.
    const luckyPaw1 = 1 + 0.15 * 1;
    expect(350 * luckyPaw1).toBeLessThan(402.5);
    expect(coinPayout(350, luckyPaw1, 0, false)).toBe(403);
    expect(coinPayout(50, luckyPaw1, 0, false)).toBe(58); // 57.5
    expect(coinPayout(5, 1.3, 0, false)).toBe(7); // 6.5
    expect(roundStable(2.4999)).toBe(2);
    expect(roundStable(-1.5)).toBe(-1);
  });
});

describe('score and Jackpot (GAME_DESIGN §5, §9)', () => {
  it('scores S(t) per merge', () => {
    expect(mergeScore(1)).toBe(2);
    expect(mergeScore(7)).toBe(128);
    expect(mergeScore(15)).toBe(32_768);
  });

  it('pays 2 × S(cap) score and 5 × C(cap) base coins for a Jackpot', () => {
    // A Jackpot is two of a stage's last cat: tiers 12 and 23 (stages 1 and 2).
    expect([12, 23].map(jackpotScore)).toEqual([8192, 16_777_216]);
    expect([12, 23].map(jackpotBaseCoins)).toEqual([1715, 587_280]);
  });
});

describe('a cat’s value (GAME_DESIGN §5, §7)', () => {
  it('pays half of C(t) per popping cat, with multipliers and golden, without combo', () => {
    // Merging two tier-5 cats pays C(5) = 8, so each one is worth 4.
    expect(popCoins(5, false, 1)).toBe(4);
    expect(popCoins(5, false, 1) * 2).toBe(coinPayout(8, 1, 0, false));
    expect(popCoins(1, false, 1)).toBe(1); // 0.5, but every payout pays at least 1
    expect(popCoins(3, false, 1)).toBe(2); // 1.5, halves round up
    expect(popCoins(3, true, 1)).toBe(5); // 4.5
    expect(popCoins(4, false, 2.5)).toBe(6); // 2.5 × 2.5 = 6.25
    expect(popCoins(23, false, 1)).toBe(58_728);
  });
});

describe('ComboCounter', () => {
  it('raises the combo for merges within 1 s and resets to 1 after', () => {
    const c = new ComboCounter();
    expect(c.combo).toBe(0);
    expect(c.register(0)).toBe(1);
    expect(c.register(400)).toBe(2);
    expect(c.register(1400)).toBe(3); // exactly 1.0 s later still counts
    expect(c.register(2401)).toBe(1);
    expect(c.activeAt(3000)).toBe(1);
    expect(c.activeAt(3402)).toBe(0);
    c.reset();
    expect(c.combo).toBe(0);
    expect(c.register(3500)).toBe(1);
  });

  it('accepts a custom window', () => {
    const c = new ComboCounter(100);
    c.register(0);
    expect(c.register(150)).toBe(1);
  });
});

describe('RunEconomy', () => {
  it('adds score and coins per merge and tracks run stats', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    expect(e.merge(4, false, 0)).toEqual({ score: 16, coins: 5, combo: 1 });
    expect(e.merge(5, false, 5000)).toEqual({ score: 32, coins: 8, combo: 1 });
    expect(e.score).toBe(48);
    expect(e.coins).toBe(13);
    expect(e.merges).toBe(2);
    expect(e.highestTier).toBe(6);
  });

  it('pays combo bonuses only with Combo Charm, capped at 5 steps', () => {
    const plain = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    const charmed = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 5 });
    const coins = (e: RunEconomy): number[] =>
      Array.from({ length: 8 }, (_, i) => e.merge(10, false, i * 500).coins);
    expect(coins(plain)).toEqual(Array(8).fill(119));
    // Bonus 0.4 × min(combo − 1, 5): 0, 0.4, 0.8, 1.2, 1.6, 2, 2, 2.
    expect(coins(charmed)).toEqual([119, 167, 214, 262, 309, 357, 357, 357]);
    expect(charmed.combo).toBe(8);
  });

  it('pays ×3 when a golden cat merges', () => {
    const e = new RunEconomy({ coinMultiplier: 1.15, comboCharmLevel: 0 });
    expect(e.merge(6, true, 0).coins).toBe(48); // 14 × 1.15 × 3 = 48.3
  });

  it('pays Jackpots with combo and counts them, without raising the highest tier', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 1 });
    e.merge(6, false, 0);
    const p = e.jackpot(7, false, 500);
    expect(p).toEqual({ score: 256, coins: 130, combo: 2 }); // 120 × 1.08 = 129.6
    expect(e.jackpots).toBe(1);
    expect(e.merges).toBe(1);
    expect(e.highestTier).toBe(7);
    expect(e.score).toBe(64 + 256);
  });

  it('pays pops in coins only, leaving score and combo alone', () => {
    const e = new RunEconomy({ coinMultiplier: 2, comboCharmLevel: 5 });
    e.merge(1, false, 0);
    expect(e.pop(2, true)).toEqual({ score: 0, coins: 6, combo: 0 });
    expect(e.score).toBe(2);
    expect(e.combo).toBe(1);
    expect(e.coins).toBe(2 + 6);
  });

  it('reports the combo as it stands at a time', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    expect(e.comboAt(0)).toBe(0);
    e.merge(1, false, 100);
    e.merge(1, false, 600);
    expect(e.comboAt(1500)).toBe(2);
    expect(e.comboAt(1601)).toBe(0);
    expect(e.combo).toBe(2);
  });

  it('lets debug tools set the score', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    e.setScore(2_999);
    expect(e.score).toBe(2_999);
    e.merge(1, false, 0);
    expect(e.score).toBe(3_001);
    expect(() => e.setScore(-1)).toThrow(RangeError);
    expect(() => e.setScore(1.5)).toThrow(RangeError);
    expect(e.coins).toBe(1);
  });
});
