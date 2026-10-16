import { describe, expect, it } from 'vitest';
import { BLESSING_CARD_IDS, UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import {
  anyAffordable,
  buy,
  canBuy,
  comboBonus,
  defaultUpgradeLevels,
  deriveStats,
  isUpgradeId,
  maxUpgradeLevels,
  nextPrice,
  upgradeUnlocked,
} from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';

const levels = (overrides: Partial<Record<UpgradeId, number>> = {}): UpgradeLevels => ({
  ...defaultUpgradeLevels(),
  ...overrides,
});

const maxed = (): UpgradeLevels => maxUpgradeLevels();

/** A best stage that has opened every card. */
const ANY_STAGE = 1000;

describe('deriveStats (GAME_DESIGN §10)', () => {
  it('starts with no bonuses, Golden Cats and Big Drops open at level 1', () => {
    expect(deriveStats(levels())).toEqual({
      coinMultiplier: 1,
      bigCatchTilt: 0,
      comboCharmLevel: 0,
      luckySaves: 0,
      blessingCaps: {
        goldenCats: 1,
        bigDrops: 1,
        moreMagnets: 0,
        hanabi: 0,
        joker: 0,
        lightning: 0,
      },
      pickCaps: {
        goldenCats: 1,
        bigDrops: 1,
        moreMagnets: 0,
        hanabi: 0,
        joker: 0,
        lightning: 0,
        katana: 0,
        quickKatana: 0,
        wideBlade: 0,
        moreBlades: 0,
      },
    });
  });

  it("opens the Katana's picks one by one with its card's levels (GAME_DESIGN §15.16)", () => {
    const caps = (katana: number) => deriveStats(levels({ katana })).pickCaps;
    expect(caps(1)).toMatchObject({ katana: 1, quickKatana: 0, wideBlade: 0, moreBlades: 0 });
    expect(caps(2)).toMatchObject({ katana: 1, quickKatana: 2, wideBlade: 0, moreBlades: 0 });
    expect(caps(3)).toMatchObject({ katana: 1, quickKatana: 2, wideBlade: 2, moreBlades: 0 });
    expect(caps(4)).toMatchObject({ katana: 1, quickKatana: 2, wideBlade: 2, moreBlades: 3 });
  });

  it('applies every formula at max level', () => {
    const s = deriveStats(maxed());
    expect(s.coinMultiplier).toBeCloseTo(3.25, 10); // 1 + 0.225 × 10
    expect(s.bigCatchTilt).toBeCloseTo(12, 10); // 1.2 × 10
    expect(s.comboCharmLevel).toBe(5);
    expect(s.luckySaves).toBe(2);
    expect(s.blessingCaps).toEqual({
      goldenCats: 5,
      bigDrops: 3,
      moreMagnets: 5,
      hanabi: 5,
      joker: 5,
      lightning: 5,
    });
  });

  it.each([
    [0, 1],
    [1, 1.225],
    [4, 1.9],
    [10, 3.25],
  ])('Lucky Paw %i gives a ×%f coin multiplier', (level, multiplier) => {
    expect(deriveStats(levels({ luckyPaw: level })).coinMultiplier).toBeCloseTo(multiplier, 10);
  });
});

describe('comboBonus', () => {
  it('is 0.12 × comboCharm × min(combo − 1, 5)', () => {
    expect(comboBonus(0, 6)).toBe(0);
    expect(comboBonus(3, 0)).toBe(0);
    expect(comboBonus(3, 1)).toBe(0);
    expect(comboBonus(3, 2)).toBeCloseTo(0.36, 10);
    expect(comboBonus(5, 6)).toBeCloseTo(3, 10);
    expect(comboBonus(5, 40)).toBeCloseTo(3, 10);
    expect(comboBonus(1, 4)).toBeCloseTo(0.36, 10);
  });
});

describe('the cards (GAME_DESIGN §10)', () => {
  it('has one rising price per level above the start level, and a gate', () => {
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      expect(def.prices).toHaveLength(def.maxLevel - def.startLevel);
      expect([...def.prices].sort((a, b) => a - b)).toEqual(def.prices);
      expect(def.gate).toBeGreaterThanOrEqual(1);
    }
  });

  it('sells a card for every blessing after the upgrades, then the weapons', () => {
    expect(UPGRADE_IDS.filter((id) => UPGRADES[id].section === 'blessing')).toEqual([
      ...BLESSING_CARD_IDS,
    ]);
    expect(UPGRADE_IDS.slice(-BLESSING_CARD_IDS.length - 1, -1)).toEqual([...BLESSING_CARD_IDS]);
    expect(UPGRADE_IDS.filter((id) => UPGRADES[id].section === 'weapon')).toEqual(['katana']);
  });

  it('costs about 1M coins in all (the 8-hour pacing model), plus the late Lightning and Katana', () => {
    const cost = (id: UpgradeId): number => UPGRADES[id].prices.reduce((a, b) => a + b, 0);
    const total = UPGRADE_IDS.reduce((sum, id) => sum + cost(id), 0);
    expect(total - cost('lightning') - cost('katana')).toBe(1_021_200);
    expect(cost('lightning')).toBe(225_000);
    expect(cost('katana')).toBe(177_000);
  });
});

describe('prices and purchases', () => {
  it('prices every level from the table and returns null at max', () => {
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      def.prices.forEach((price, i) => expect(nextPrice(id, def.startLevel + i)).toBe(price));
      expect(nextPrice(id, def.maxLevel)).toBeNull();
      expect(nextPrice(id, def.maxLevel + 3)).toBeNull();
    }
    expect(nextPrice('luckyPaw', 0)).toBe(150);
    expect(nextPrice('comboCharm', 4)).toBe(40_000);
    // Golden Cats starts at level 1: its first price buys level 2.
    expect(nextPrice('goldenCats', 1)).toBe(400);
  });

  it('checks affordability, the gate and the max level', () => {
    expect(canBuy('luckyPaw', levels(), 150, 1)).toEqual({ ok: true, price: 150 });
    expect(canBuy('luckyPaw', levels(), 149, 1)).toEqual({
      ok: false,
      reason: 'insufficient',
      price: 150,
    });
    expect(canBuy('hanabi', levels(), 1e9, 2)).toEqual({
      ok: false,
      reason: 'locked',
      price: 3000,
    });
    expect(canBuy('hanabi', levels(), 1e9, 3)).toEqual({ ok: true, price: 3000 });
    // Second Chance is open from the start (v0.39).
    expect(canBuy('secondChance', levels(), 1000, 1)).toEqual({ ok: true, price: 1000 });
    expect(canBuy('secondChance', levels({ secondChance: 2 }), 1e9, ANY_STAGE)).toEqual({
      ok: false,
      reason: 'max',
      price: null,
    });
  });

  it('buys one level, spends the price, and leaves the inputs untouched', () => {
    const before = levels({ luckyPaw: 2 });
    const result = buy('luckyPaw', before, 1200, 1);
    expect(result).toEqual({
      ok: true,
      levels: { ...before, luckyPaw: 3 },
      coins: 400,
      price: 800,
    });
    expect(before.luckyPaw).toBe(2);
  });

  it('refuses purchases it can’t make', () => {
    expect(buy('bigCatch', levels(), 149, 1)).toEqual({ ok: false, reason: 'insufficient' });
    expect(buy('joker', levels(), 1e9, 4)).toEqual({ ok: false, reason: 'locked' });
    expect(buy('secondChance', levels({ secondChance: 2 }), 1e9, ANY_STAGE)).toEqual({
      ok: false,
      reason: 'max',
    });
  });

  it('buys every card to max for the sum of its prices', () => {
    for (const id of UPGRADE_IDS) {
      const total = UPGRADES[id].prices.reduce((a, b) => a + b, 0);
      let state: UpgradeLevels = levels();
      let coins = total;
      for (let i = 0; i < UPGRADES[id].prices.length; i++) {
        const r = buy(id, state, coins, ANY_STAGE);
        if (!r.ok) throw new Error(`could not buy ${id} level ${state[id] + 1}`);
        state = r.levels;
        coins = r.coins;
      }
      expect(coins).toBe(0);
      expect(state[id]).toBe(UPGRADES[id].maxLevel);
      expect(buy(id, state, 1e9, ANY_STAGE).ok).toBe(false);
    }
  });

  it('knows when anything is affordable (the menu dot)', () => {
    expect(anyAffordable(levels(), 0, 1)).toBe(false);
    expect(anyAffordable(levels(), 149, 1)).toBe(false);
    expect(anyAffordable(levels(), 150, 1)).toBe(true);
    expect(anyAffordable(maxed(), 1e9, ANY_STAGE)).toBe(false);
    // Only Joker Cat is left, and only stage 5 opens it.
    const allButJoker = { ...maxed(), joker: 0 };
    expect(anyAffordable(allButJoker, 1e9, 4)).toBe(false);
    expect(anyAffordable(allButJoker, 1e9, 5)).toBe(true);
  });

  it('opens cards at their gates', () => {
    expect(upgradeUnlocked('luckyPaw', 1)).toBe(true);
    expect(upgradeUnlocked('secondChance', 1)).toBe(true);
    expect(upgradeUnlocked('comboCharm', 1)).toBe(false);
    expect(upgradeUnlocked('comboCharm', 2)).toBe(true);
  });

  it('recognizes upgrade ids', () => {
    expect(isUpgradeId('luckyPaw')).toBe(true);
    expect(isUpgradeId('hanabi')).toBe(true);
    expect(isUpgradeId('nope')).toBe(false);
    expect(isUpgradeId(3)).toBe(false);
  });
});
