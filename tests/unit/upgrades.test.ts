import { describe, expect, it } from 'vitest';
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import {
  anyAffordable,
  buy,
  canBuy,
  comboBonus,
  defaultUpgradeLevels,
  deriveStats,
  isUpgradeId,
  nextPrice,
} from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';

const levels = (overrides: Partial<Record<UpgradeId, number>> = {}): UpgradeLevels => ({
  ...defaultUpgradeLevels(),
  ...overrides,
});

const maxed = (): UpgradeLevels =>
  Object.fromEntries(UPGRADE_IDS.map((id) => [id, UPGRADES[id].maxLevel])) as UpgradeLevels;

describe('deriveStats (GAME_DESIGN §10)', () => {
  it('starts with no bonuses', () => {
    expect(deriveStats(levels())).toEqual({
      coinMultiplier: 1,
      bigCatchLevel: 0,
      comboCharmLevel: 0,
      luckySaves: 0,
    });
  });

  it('applies every formula at max level', () => {
    const s = deriveStats(maxed());
    expect(s.coinMultiplier).toBeCloseTo(2.5, 10); // 1 + 0.15 × 10
    expect(s.bigCatchLevel).toBe(5);
    expect(s.comboCharmLevel).toBe(5);
    expect(s.luckySaves).toBe(2);
  });

  it.each([
    [0, 1],
    [1, 1.15],
    [4, 1.6],
    [10, 2.5],
  ])('Lucky Paw %i gives a ×%f coin multiplier', (level, multiplier) => {
    expect(deriveStats(levels({ luckyPaw: level })).coinMultiplier).toBeCloseTo(multiplier, 10);
  });
});

describe('comboBonus', () => {
  it('is 0.08 × comboCharm × min(combo − 1, 5)', () => {
    expect(comboBonus(0, 6)).toBe(0);
    expect(comboBonus(3, 0)).toBe(0);
    expect(comboBonus(3, 1)).toBe(0);
    expect(comboBonus(3, 2)).toBeCloseTo(0.24, 10);
    expect(comboBonus(5, 6)).toBeCloseTo(2, 10);
    expect(comboBonus(5, 40)).toBeCloseTo(2, 10);
    expect(comboBonus(1, 4)).toBeCloseTo(0.24, 10);
  });
});

describe('prices and purchases', () => {
  it('prices every level from the table and returns null at max', () => {
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      def.prices.forEach((price, level) => expect(nextPrice(id, level)).toBe(price));
      expect(nextPrice(id, def.maxLevel)).toBeNull();
      expect(nextPrice(id, def.maxLevel + 3)).toBeNull();
    }
    expect(nextPrice('luckyPaw', 0)).toBe(50);
    expect(nextPrice('comboCharm', 4)).toBe(1280);
  });

  it('checks affordability and the max level', () => {
    expect(canBuy('luckyPaw', levels(), 50)).toEqual({ ok: true, price: 50 });
    expect(canBuy('luckyPaw', levels(), 49)).toEqual({
      ok: false,
      reason: 'insufficient',
      price: 50,
    });
    expect(canBuy('secondChance', levels({ secondChance: 2 }), 1e9)).toEqual({
      ok: false,
      reason: 'max',
      price: null,
    });
  });

  it('buys one level, spends the price, and leaves the inputs untouched', () => {
    const before = levels({ luckyPaw: 2 });
    const result = buy('luckyPaw', before, 200);
    expect(result).toEqual({
      ok: true,
      levels: { ...before, luckyPaw: 3 },
      coins: 75,
      price: 125,
    });
    expect(before.luckyPaw).toBe(2);
  });

  it('refuses purchases it can’t make', () => {
    expect(buy('bigCatch', levels(), 99)).toEqual({ ok: false, reason: 'insufficient' });
    expect(buy('secondChance', levels({ secondChance: 2 }), 1e9)).toEqual({
      ok: false,
      reason: 'max',
    });
  });

  it('buys every upgrade to max for the sum of its prices', () => {
    for (const id of UPGRADE_IDS) {
      const total = UPGRADES[id].prices.reduce((a, b) => a + b, 0);
      let state: UpgradeLevels = levels();
      let coins = total;
      for (let i = 0; i < UPGRADES[id].maxLevel; i++) {
        const r = buy(id, state, coins);
        if (!r.ok) throw new Error(`could not buy ${id} level ${i + 1}`);
        state = r.levels;
        coins = r.coins;
      }
      expect(coins).toBe(0);
      expect(state[id]).toBe(UPGRADES[id].maxLevel);
      expect(buy(id, state, 1e9).ok).toBe(false);
    }
  });

  it('knows when anything is affordable (the menu dot)', () => {
    expect(anyAffordable(levels(), 0)).toBe(false);
    expect(anyAffordable(levels(), 49)).toBe(false);
    expect(anyAffordable(levels(), 50)).toBe(true);
    expect(anyAffordable(maxed(), 1e9)).toBe(false);
  });

  it('recognizes upgrade ids', () => {
    expect(isUpgradeId('luckyPaw')).toBe(true);
    expect(isUpgradeId('nope')).toBe(false);
    expect(isUpgradeId(3)).toBe(false);
  });
});
