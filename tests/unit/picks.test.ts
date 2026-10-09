import { describe, expect, it } from 'vitest';
import { BLESSING_IDS, PICK_IDS, pickIds, PICKS, TRIAL_IDS } from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { dropWeights } from '../../src/core/dropQueue';
import {
  boulderChance,
  defaultPickLevels,
  drawOffer,
  dropOdds,
  isPickId,
  pickCard,
  pickMaxed,
  pickValue,
  tiltLevel,
} from '../../src/core/picks';
import type { PickLevels } from '../../src/core/picks';
import { Rng } from '../../src/core/rng';

const levels = (overrides: Partial<Record<PickId, number>> = {}): PickLevels => ({
  ...defaultPickLevels(),
  ...overrides,
});

describe('the trials and blessings (GAME_DESIGN §15.5)', () => {
  // Id, kind, name, max level, per level.
  const TABLE: readonly [PickId, string, string, number, number][] = [
    ['moreBoulders', 'trial', 'More Boulders', 5, 0.03],
    ['ironBands', 'trial', 'Iron Bands', 3, 1],
    ['bigBoulders', 'trial', 'Big Boulders', 4, 1],
    ['moreMagnets', 'blessing', 'More Magnets', 5, 0.015],
    ['bigDrops', 'blessing', 'Big Drops', 5, 2],
    ['goldenCats', 'blessing', 'Golden Cats', 5, 0.04],
  ];

  it('lists three trials, then three blessings, in card order', () => {
    expect([...PICK_IDS]).toEqual(TABLE.map(([id]) => id));
    expect(pickIds('trial')).toEqual(TRIAL_IDS);
    expect(pickIds('blessing')).toEqual(BLESSING_IDS);
  });

  it.each(TABLE)('%s: a %s, %s, max %i, %f per level', (id, kind, name, max, perLevel) => {
    expect(PICKS[id]).toMatchObject({ id, kind, name, maxLevel: max, perLevel });
    expect(PICKS[id].description.length).toBeGreaterThan(0);
    expect(PICKS[id].statLabel.length).toBeGreaterThan(0);
  });

  it('knows its ids', () => {
    expect(isPickId('ironBands')).toBe(true);
    expect(isPickId('goldenMerge')).toBe(false);
    expect(isPickId(3)).toBe(false);
  });
});

describe('dropOdds (GAME_DESIGN §15.1)', () => {
  it('starts with 1% magnets, 3% boulders from stage 2, no golden cats', () => {
    expect(dropOdds(levels(), 1, 0)).toEqual({
      tiltLevel: 0,
      magnetChance: 0.01,
      boulderChance: 0,
      goldenChance: 0,
      boulderSize: 2,
      boulderHits: 1,
    });
    expect(dropOdds(levels(), 2, 0).boulderChance).toBeCloseTo(0.03, 12);
    expect(boulderChance(levels({ moreBoulders: 5 }), 1)).toBe(0);
  });

  it('matches every table value at the max level', () => {
    const max = levels(Object.fromEntries(PICK_IDS.map((id) => [id, PICKS[id].maxLevel])));
    const odds = dropOdds(max, 3, 0);
    expect(odds.magnetChance).toBeCloseTo(0.085, 12);
    expect(odds.boulderChance).toBeCloseTo(0.18, 12);
    expect(odds.goldenChance).toBeCloseTo(0.2, 12);
    expect(odds.boulderSize).toBe(6);
    expect(odds.boulderHits).toBe(4);
    expect(odds.tiltLevel).toBe(10);
  });

  it('adds two Big Catch levels per Big Drops level, up to 10', () => {
    expect(tiltLevel(levels({ bigDrops: 1 }), 0)).toBe(2);
    expect(tiltLevel(levels({ bigDrops: 3 }), 2)).toBe(8);
    expect(tiltLevel(levels({ bigDrops: 5 }), 5)).toBe(10);
    // L = 6, 8 and 10 in §8's formula.
    const percent = (w: number[]) => w.map((x) => Math.round(x * 1000) / 10);
    expect(percent(dropWeights(6))).toEqual([22, 24, 26, 28]);
    expect(percent(dropWeights(8))).toEqual([16, 22, 28, 34]);
    expect(percent(dropWeights(10))).toEqual([10, 20, 30, 40]);
  });
});

describe('the cards', () => {
  it('maxes an option at its max level, and Big Drops once the tilt is at its most', () => {
    expect(pickMaxed('ironBands', levels({ ironBands: 3 }), 0)).toBe(true);
    expect(pickMaxed('ironBands', levels({ ironBands: 2 }), 0)).toBe(false);
    expect(pickMaxed('bigDrops', levels({ bigDrops: 2 }), 5)).toBe(false);
    expect(pickMaxed('bigDrops', levels({ bigDrops: 3 }), 5)).toBe(true); // 5 + 6 ≥ 10
  });

  it('offers every open option of a kind once, in random order', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const offer = drawOffer('trial', levels(), 0, new Rng(seed));
      expect([...offer].sort()).toEqual([...TRIAL_IDS].sort());
      seen.add(offer.join());
    }
    // All six orders turn up.
    expect(seen.size).toBe(6);
  });

  it('leaves maxed options out, and offers nothing when every one is maxed', () => {
    const some = drawOffer('blessing', levels({ goldenCats: 5 }), 0, new Rng(1));
    expect([...some].sort()).toEqual(['bigDrops', 'moreMagnets']);
    const none = levels({ moreBoulders: 5, ironBands: 3, bigBoulders: 4 });
    expect(drawOffer('trial', none, 0, new Rng(1))).toEqual([]);
  });

  it('is deterministic for a generator', () => {
    const a = drawOffer('blessing', levels(), 0, new Rng(9));
    const b = drawOffer('blessing', levels(), 0, new Rng(9));
    expect(a).toEqual(b);
  });

  it.each<[PickId, Partial<Record<PickId, number>>, number, string, string]>([
    ['moreBoulders', {}, 0, '3%', '6%'],
    ['moreBoulders', { moreBoulders: 4 }, 0, '15%', '18%'],
    ['ironBands', {}, 0, '1', '2'],
    ['bigBoulders', { bigBoulders: 1 }, 0, 'Size 3', 'Size 4'],
    ['moreMagnets', {}, 0, '1%', '2.5%'],
    ['moreMagnets', { moreMagnets: 4 }, 0, '7%', '8.5%'],
    ['bigDrops', {}, 0, '10%', '16%'],
    ['bigDrops', {}, 3, '19%', '25%'],
    ['goldenCats', { goldenCats: 2 }, 0, '8%', '12%'],
  ])('%s with %j (Big Catch %i) shows %s → %s', (id, over, bigCatch, current, next) => {
    const card = pickCard(id, levels(over), bigCatch);
    expect(card).toMatchObject({ id, current, next, kind: PICKS[id].kind, name: PICKS[id].name });
    expect(card.level).toBe(over[id] ?? 0);
    expect(card.maxLevel).toBe(PICKS[id].maxLevel);
    expect(pickValue(id, levels(over), bigCatch)).toBe(current);
  });
});
