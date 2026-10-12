import { describe, expect, it } from 'vitest';
import {
  coinPayout,
  ComboCounter,
  comboScoreMultiplier,
  jackpotBaseCoins,
  jackpotScore,
  jarCoinMultiplier,
  mergeScore,
  popCoins,
  RunEconomy,
  tierCoins,
  tierScore,
} from '../../src/core/economy';
import { roundStable } from '../../src/core/math';

describe('coinPayout (GAME_DESIGN §5)', () => {
  it('is round(base × multiplier × (1 + combo bonus))', () => {
    expect(coinPayout(24, 1, 0)).toBe(24);
    expect(coinPayout(24, 1.45, 0)).toBe(35); // 34.8
    expect(coinPayout(24, 1.45, 0.4)).toBe(49); // 48.72
    expect(coinPayout(1684, 2.5, 2)).toBe(12_630);
  });

  it('pays at least 1', () => {
    expect(coinPayout(0, 1, 0)).toBe(1);
    expect(coinPayout(0.2, 1, 0)).toBe(1);
  });

  it('rounds halves up despite floating-point noise', () => {
    // A stage-2 Jackpot (350 base coins) at Lucky Paw 1 is 402.5, but 402.49999999999994 in
    // floating point.
    const luckyPaw1 = 1 + 0.15 * 1;
    expect(350 * luckyPaw1).toBeLessThan(402.5);
    expect(coinPayout(350, luckyPaw1, 0)).toBe(403);
    expect(coinPayout(50, luckyPaw1, 0)).toBe(58); // 57.5
    expect(coinPayout(5, 1.3, 0)).toBe(7); // 6.5
    expect(roundStable(2.4999)).toBe(2);
    expect(roundStable(-1.5)).toBe(-1);
  });
});

describe('S(t) and C(t) (GAME_DESIGN §4)', () => {
  // Tier, its stage's merge score S(t) and base coins C(t).
  const TABLE: readonly [number, number, number][] = [
    [1, 2, 1], // stage 1, size 1
    [8, 256, 41], // stage 1, size 8: the last cat's merge
    [10, 2 * 1.225, 1], // stage 2, size 1
    [15, 64 * 1.225, 14], // stage 2, size 6
    [46, 2 * 1.225 ** 5, 2], // stage 6 (jar 2), size 1
    [53, 256 * 1.225 ** 5, 82], // stage 6, size 8
    [107, 256 * 1.225 ** 11, 123], // stage 12 (jar 3), size 8
    [269, 256 * 1.225 ** 29, 246], // stage 30 (jar 6), size 8
  ];

  it.each(TABLE)('tier %i: score %f, coins %i', (tier, score, coins) => {
    expect(tierScore(tier)).toBeCloseTo(score, 6);
    expect(tierCoins(tier)).toBe(coins);
  });

  it('pays coins by size times the jar: ×1 in stages 1–5, ×2 in 6–10, …', () => {
    expect([1, 5, 6, 10, 11, 30].map(jarCoinMultiplier)).toEqual([1, 1, 2, 2, 3, 6]);
  });

  it('rejects unknown tiers', () => {
    expect(() => tierScore(0)).toThrow(RangeError);
    expect(() => tierCoins(-1)).toThrow(RangeError);
  });
});

describe('score and Jackpot (GAME_DESIGN §5, §9)', () => {
  it('scores S(t) per merge', () => {
    expect(mergeScore(1)).toBe(2);
    expect(mergeScore(7)).toBe(128);
    expect(mergeScore(15)).toBeCloseTo(78.4, 9); // 64 × 1.225
  });

  it('pays 2 × S(cap) score and 5 × C(cap) base coins for a Jackpot', () => {
    // A Jackpot is two of a stage's last cat: tiers 9 and 54 (stages 1 and 6).
    expect(jackpotScore(9)).toBe(1024);
    expect(jackpotScore(54)).toBeCloseTo(1024 * 1.225 ** 5, 6);
    expect([9, 54].map(jackpotBaseCoins)).toEqual([350, 700]);
  });

  it('gives every combo step 10% more score, up to 5 steps', () => {
    expect([0, 1, 2, 4, 6, 9].map(comboScoreMultiplier)).toEqual([1, 1, 1.1, 1.3, 1.5, 1.5]);
  });
});

describe('a cat’s value (GAME_DESIGN §5, §7)', () => {
  it('pays half of C(t) per popping cat, with Lucky Paw, without combo', () => {
    // Merging two tier-5 cats pays C(5) = 8, so each one is worth 4.
    expect(popCoins(5, 1)).toBe(4);
    expect(popCoins(5, 1) * 2).toBe(coinPayout(8, 1, 0));
    expect(popCoins(1, 1)).toBe(1); // 0.5, but every payout pays at least 1
    expect(popCoins(3, 1)).toBe(2); // 1.5, halves round up
    expect(popCoins(4, 2.5)).toBe(6); // 2.5 × 2.5 = 6.25
    expect(popCoins(53, 1)).toBe(41); // stage 6: 41 × 2 / 2
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
    expect(e.merge(4, 0)).toEqual({ score: 16, coins: 5, combo: 1 });
    expect(e.merge(5, 5000)).toEqual({ score: 32, coins: 8, combo: 1 });
    expect(e.score).toBe(48);
    expect(e.coins).toBe(13);
    expect(e.merges).toBe(2);
    expect(e.highestTier).toBe(6);
  });

  it('pays combo bonuses only with Combo Charm, capped at 5 steps', () => {
    const plain = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    const charmed = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 5 });
    const coins = (e: RunEconomy): number[] =>
      Array.from({ length: 8 }, (_, i) => e.merge(8, i * 500).coins);
    expect(coins(plain)).toEqual(Array(8).fill(41));
    // Bonus 0.6 × min(combo − 1, 5): 0, 0.6, 1.2, 1.8, 2.4, 3, 3, 3.
    expect(coins(charmed)).toEqual([41, 66, 90, 115, 139, 164, 164, 164]);
    expect(charmed.combo).toBe(8);
  });

  it('gives every combo more score, with or without Combo Charm, capped at 5 steps', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    const scores = Array.from({ length: 8 }, (_, i) => e.merge(8, i * 500).score);
    // 256 × (1 + 0.1 × min(combo − 1, 5)), rounded.
    expect(scores).toEqual([256, 282, 307, 333, 358, 384, 384, 384]);
    expect(e.score).toBe(scores.reduce((a, b) => a + b, 0));
  });

  it('pays a golden cat’s two-tier merge like a plain one, and counts the new tier', () => {
    const e = new RunEconomy({ coinMultiplier: 1.15, comboCharmLevel: 0 });
    expect(e.merge(6, 0, 8)).toEqual({ score: 64, coins: 16, combo: 1 }); // 14 × 1.15 = 16.1
    expect(e.highestTier).toBe(8);
  });

  it('pays a three-way merge (Hubris) like its size and a half, once for the combo', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    // Three 5s: 1.5 × S(5) = 48 score, 1.5 × C(5) = 12 coins.
    expect(e.merge(5, 0, 7, 3)).toEqual({ score: 48, coins: 12, combo: 1 });
    expect(e.merges).toBe(1);
    expect(e.highestTier).toBe(7);
  });

  it('pays Jackpots with combo and counts them, without raising the highest tier', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 1 });
    e.merge(6, 0);
    const p = e.jackpot(7, 500);
    expect(p).toEqual({ score: 282, coins: 134, combo: 2 }); // 256 × 1.1; 120 × 1.12 = 134.4
    expect(e.jackpots).toBe(1);
    expect(e.merges).toBe(1);
    expect(e.highestTier).toBe(7);
    expect(e.score).toBe(64 + 282);
  });

  it('pays pops in coins only, leaving score and combo alone', () => {
    const e = new RunEconomy({ coinMultiplier: 2, comboCharmLevel: 5 });
    e.merge(1, 0);
    expect(e.pop(3)).toEqual({ score: 0, coins: 3, combo: 0 }); // 1.5 × 2
    expect(e.score).toBe(2);
    expect(e.combo).toBe(1);
    expect(e.coins).toBe(2 + 3);
  });

  it('reports the combo as it stands at a time', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    expect(e.comboAt(0)).toBe(0);
    e.merge(1, 100);
    e.merge(1, 600);
    expect(e.comboAt(1500)).toBe(2);
    expect(e.comboAt(1601)).toBe(0);
    expect(e.combo).toBe(2);
  });

  it('lets debug tools set the score', () => {
    const e = new RunEconomy({ coinMultiplier: 1, comboCharmLevel: 0 });
    e.setScore(2_999);
    expect(e.score).toBe(2_999);
    e.merge(1, 0);
    expect(e.score).toBe(3_001);
    expect(() => e.setScore(-1)).toThrow(RangeError);
    expect(() => e.setScore(1.5)).toThrow(RangeError);
    expect(e.coins).toBe(1);
  });
});
