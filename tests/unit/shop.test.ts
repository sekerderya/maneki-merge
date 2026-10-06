import { describe, expect, it } from 'vitest';
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import { shopCard, shopCards, upgradeValue } from '../../src/core/shop';
import { defaultUpgradeLevels } from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';

const levels = (overrides: Partial<Record<UpgradeId, number>> = {}): UpgradeLevels => ({
  ...defaultUpgradeLevels(),
  ...overrides,
});

describe('shop cards (GAME_DESIGN §2.2)', () => {
  it('lists all 5 upgrades in shop order', () => {
    const cards = shopCards(levels(), 0);
    expect(cards.map((c) => c.id)).toEqual([...UPGRADE_IDS]);
    for (const card of cards) {
      expect(card.name).toBe(UPGRADES[card.id].name);
      expect(card.description).toBe(UPGRADES[card.id].description);
      expect(card.statLabel.length).toBeGreaterThan(0);
    }
  });

  it('shows an affordable price', () => {
    expect(shopCard('luckyPaw', levels({ luckyPaw: 3 }), 200)).toEqual({
      id: 'luckyPaw',
      name: 'Lucky Paw',
      description: '+15% coins from everything',
      statLabel: 'Coins',
      level: 3,
      maxLevel: 10,
      price: 200,
      state: 'affordable',
      shortfall: null,
      current: '+45%',
      next: '+60%',
    });
  });

  it('disables the price when coins are short', () => {
    const card = shopCard('goldenMerge', levels(), 119);
    expect(card).toMatchObject({ price: 120, state: 'insufficient', current: '0%', next: '3%' });
    // "Need 1 more" under the price.
    expect(card.shortfall).toBe(1);
  });

  it('shows MAX with no next value at the max level', () => {
    const card = shopCard('secondChance', levels({ secondChance: 2 }), 1e9);
    expect(card).toMatchObject({ level: 2, price: null, state: 'max', current: '2', next: null });
    expect(card.shortfall).toBeNull();
  });

  it.each<[UpgradeId, number, string]>([
    ['luckyPaw', 0, '+0%'],
    ['luckyPaw', 10, '+150%'],
    // The biggest drop of a stage: 10%, then 3 points more per level (GAME_DESIGN §8).
    ['bigCatch', 0, '10%'],
    ['bigCatch', 1, '13%'],
    ['bigCatch', 2, '16%'],
    ['bigCatch', 3, '19%'],
    ['bigCatch', 4, '22%'],
    ['bigCatch', 5, '25%'],
    ['goldenMerge', 1, '3%'],
    ['goldenMerge', 3, '9%'],
    ['goldenMerge', 5, '15%'],
    ['comboCharm', 2, '+16%'],
    ['secondChance', 2, '2'],
  ])('%s at level %i shows %s', (id, level, text) => {
    expect(upgradeValue(id, level)).toBe(text);
  });

  it('gives every level of every upgrade its own value', () => {
    for (const id of UPGRADE_IDS) {
      const values = Array.from({ length: UPGRADES[id].maxLevel + 1 }, (_, l) =>
        upgradeValue(id, l),
      );
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
