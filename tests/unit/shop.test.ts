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
  it('lists every card in shop order: the upgrades, then the blessings', () => {
    const cards = shopCards(levels(), 0, 1);
    expect(cards.map((c) => c.id)).toEqual([...UPGRADE_IDS]);
    expect(cards.map((c) => c.section)).toEqual([
      ...Array<string>(4).fill('upgrade'),
      ...Array<string>(5).fill('blessing'),
    ]);
    for (const card of cards) {
      expect(card.name).toBe(UPGRADES[card.id].name);
      expect(card.description).toBe(UPGRADES[card.id].description);
      expect(card.statLabel.length).toBeGreaterThan(0);
    }
  });

  it('shows an affordable price', () => {
    expect(shopCard('luckyPaw', levels({ luckyPaw: 3 }), 1500, 1)).toEqual({
      id: 'luckyPaw',
      section: 'upgrade',
      gate: 1,
      name: 'Lucky Paw',
      description: '+22.5% coins from everything',
      statLabel: 'Coins',
      level: 3,
      maxLevel: 10,
      price: 1500,
      state: 'affordable',
      shortfall: null,
      current: '+67.5%',
      next: '+90%',
    });
  });

  it('disables the price when coins are short', () => {
    const card = shopCard('bigCatch', levels(), 149, 1);
    expect(card).toMatchObject({ price: 150, state: 'insufficient', current: '10%', next: '14%' });
    // "Need 1 more" under the price.
    expect(card.shortfall).toBe(1);
  });

  it('shows MAX with no next value at the max level', () => {
    const card = shopCard('secondChance', levels({ secondChance: 2 }), 1e9, 10);
    expect(card).toMatchObject({ level: 2, price: null, state: 'max', current: '2', next: null });
    expect(card.shortfall).toBeNull();
  });

  it('locks a card until the best stage reaches its gate', () => {
    const card = shopCard('joker', levels(), 1e9, 4);
    expect(card).toMatchObject({ state: 'locked', gate: 5, price: 10_000, shortfall: null });
    expect(shopCard('joker', levels(), 1e9, 5).state).toBe('affordable');
  });

  it('shows a blessing card at the highest level a run can reach', () => {
    expect(shopCard('goldenCats', levels(), 0, 1)).toMatchObject({
      level: 1,
      maxLevel: 5,
      price: 400,
      current: '6%',
      next: '12%',
    });
  });

  it.each<[UpgradeId, number, string]>([
    ['luckyPaw', 0, '+0%'],
    ['luckyPaw', 1, '+22.5%'],
    ['luckyPaw', 10, '+225%'],
    // The biggest drop of a stage: 10%, then 3.6 points more per level, rounded (GAME_DESIGN §8).
    ['bigCatch', 0, '10%'],
    ['bigCatch', 1, '14%'],
    ['bigCatch', 2, '17%'],
    ['bigCatch', 5, '28%'],
    ['bigCatch', 10, '46%'],
    ['comboCharm', 2, '+24%'],
    ['secondChance', 2, '2'],
    // A blessing card: its blessing at the card's level, without Big Catch.
    ['goldenCats', 5, '30%'],
    ['bigDrops', 1, '19%'],
    ['bigDrops', 3, '37%'],
    ['moreMagnets', 0, '0%'],
    ['moreMagnets', 2, '4.5%'],
    ['hanabi', 0, '0%'],
    ['joker', 5, '11.25%'],
  ])('%s at level %i shows %s', (id, level, text) => {
    expect(upgradeValue(id, level)).toBe(text);
  });

  it('gives every level of every card its own value', () => {
    for (const id of UPGRADE_IDS) {
      const { startLevel, maxLevel } = UPGRADES[id];
      const values = Array.from({ length: maxLevel - startLevel + 1 }, (_, i) =>
        upgradeValue(id, startLevel + i),
      );
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
