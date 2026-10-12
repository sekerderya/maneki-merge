import { describe, expect, it } from 'vitest';
import {
  BLESSING_IDS,
  PICK_IDS,
  pickIds,
  pickOrder,
  PICKS,
  RULE_IDS,
  TRIAL_IDS,
} from '../../src/config/picks';
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
  pickOpen,
  pickValue,
  tiltLevel,
} from '../../src/core/picks';
import type { PickLevels } from '../../src/core/picks';
import { Rng } from '../../src/core/rng';

const followUps = (id: PickId): boolean => PICKS[id].requires !== undefined;

const levels = (overrides: Partial<Record<PickId, number>> = {}): PickLevels => ({
  ...defaultPickLevels(),
  ...overrides,
});

describe('the trials, rules and blessings (GAME_DESIGN §15.5)', () => {
  // Id, kind, name, max level, per level.
  const TABLE: readonly [PickId, string, string, number, number][] = [
    ['moreBoulders', 'trial', 'More Boulders', 5, 0.03],
    ['ironBands', 'trial', 'Iron Bands', 3, 1],
    ['bigBoulders', 'trial', 'Big Boulders', 4, 1],
    ['wind', 'trial', 'Wind', 5, 135],
    ['porcelain', 'trial', 'Porcelain', 4, 0.1],
    ['cursedBell', 'trial', 'Cursed Bell', 1, 1],
    ['quickCurse', 'trial', 'Quick Curse', 3, 1],
    ['moreCurses', 'trial', 'More Curses', 3, 1],
    ['moreMagnets', 'blessing', 'More Magnets', 5, 0.0225],
    ['bigDrops', 'blessing', 'Big Drops', 5, 3],
    ['goldenCats', 'blessing', 'Golden Cats', 5, 0.06],
    ['hanabi', 'blessing', 'Hanabi', 5, 0.0225],
    ['joker', 'blessing', 'Joker Cat', 5, 0.0225],
    ['hubris', 'rule', 'Hubris', 1, 1],
    ['echo', 'rule', 'Echo', 1, 1],
    ['copycat', 'rule', 'Copycat', 1, 1],
    ['dice', 'rule', 'Dice', 1, 1],
    // A rule since v0.40: the old trial's last level (strength 5) at once.
    ['heavyDrop', 'rule', 'Heavy Drop', 1, 5],
  ];

  it('lists eight trials, five blessings and five rules, in card order', () => {
    expect([...PICK_IDS]).toEqual(TABLE.map(([id]) => id));
    expect(pickIds('trial')).toEqual(TRIAL_IDS);
    expect(pickIds('blessing')).toEqual(BLESSING_IDS);
    expect(pickIds('rule')).toEqual(RULE_IDS);
  });

  it('offers a trial then a blessing, and a rule instead of the trial when the jar grows', () => {
    expect(pickOrder(false)).toEqual(['trial', 'blessing']);
    expect(pickOrder(true)).toEqual(['rule', 'blessing']);
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
  it('starts with 3% boulders from stage 2, no magnets, golden cats, hanabi or jokers', () => {
    expect(dropOdds(levels(), 1, 0)).toEqual({
      tiltLevel: 0,
      magnetChance: 0,
      boulderChance: 0,
      goldenChance: 0,
      hanabiChance: 0,
      jokerChance: 0,
      boulderSize: 2,
      boulderHits: 1,
    });
    expect(dropOdds(levels(), 2, 0).boulderChance).toBeCloseTo(0.03, 12);
    expect(boulderChance(levels({ moreBoulders: 5 }), 1)).toBe(0);
  });

  it('matches every table value at the max level', () => {
    const max = levels(Object.fromEntries(PICK_IDS.map((id) => [id, PICKS[id].maxLevel])));
    const odds = dropOdds(max, 3, 0);
    expect(odds.magnetChance).toBeCloseTo(0.1125, 12);
    expect(odds.boulderChance).toBeCloseTo(0.18, 12);
    expect(odds.goldenChance).toBeCloseTo(0.3, 12);
    expect(odds.hanabiChance).toBeCloseTo(0.1125, 12);
    expect(odds.jokerChance).toBeCloseTo(0.1125, 12);
    expect(odds.boulderSize).toBe(6);
    expect(odds.boulderHits).toBe(4);
    expect(odds.tiltLevel).toBe(13);
  });

  it('adds three tilt levels per Big Drops level, up to 13', () => {
    expect(tiltLevel(levels({ bigDrops: 1 }), 0)).toBe(3);
    expect(tiltLevel(levels({ bigDrops: 3 }), 2)).toBe(11);
    expect(tiltLevel(levels({ bigDrops: 5 }), 5)).toBe(13);
    // L = 6, 8, 10 and 13 in §8's formula.
    const percent = (w: number[]) => w.map((x) => Math.round(x * 1000) / 10);
    expect(percent(dropWeights(6))).toEqual([22, 24, 26, 28]);
    expect(percent(dropWeights(8))).toEqual([16, 22, 28, 34]);
    expect(percent(dropWeights(10))).toEqual([10, 20, 30, 40]);
    expect(percent(dropWeights(13))).toEqual([1, 17, 33, 49]);
  });
});

describe('the cards', () => {
  it('maxes an option at its max level, and Big Drops once the tilt is at its most', () => {
    expect(pickMaxed('ironBands', levels({ ironBands: 3 }), 0)).toBe(true);
    expect(pickMaxed('ironBands', levels({ ironBands: 2 }), 0)).toBe(false);
    expect(pickMaxed('bigDrops', levels({ bigDrops: 2 }), 5)).toBe(false);
    expect(pickMaxed('bigDrops', levels({ bigDrops: 3 }), 5)).toBe(true); // 5 + 9 ≥ 13
  });

  it('offers three of the six trials open at first, each of them at times', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed++) {
      const offer = drawOffer('trial', levels(), 0, new Rng(seed));
      expect(new Set(offer).size).toBe(3);
      for (const id of offer) seen.add(id);
    }
    const followUps = ['quickCurse', 'moreCurses'];
    expect([...seen].sort()).toEqual(TRIAL_IDS.filter((id) => !followUps.includes(id)).sort());
  });

  it("never offers Cursed Bell's follow-ups before it is taken, and offers them after", () => {
    for (const id of ['quickCurse', 'moreCurses'] as const) {
      expect(PICKS[id].requires).toBe('cursedBell');
      expect(pickOpen(id, levels(), 0)).toBe(false);
      expect(pickOpen(id, levels({ cursedBell: 1 }), 0)).toBe(true);
      expect(pickOpen(id, levels({ cursedBell: 1, [id]: 3 }), 0)).toBe(false);
    }
    const seen = new Set<string>();
    for (let seed = 0; seed < 80; seed++) {
      for (const id of drawOffer('trial', levels(), 0, new Rng(seed))) seen.add(id);
    }
    expect(seen.has('quickCurse') || seen.has('moreCurses')).toBe(false);
    const after = new Set<string>();
    for (let seed = 0; seed < 80; seed++) {
      const offer = drawOffer('trial', levels({ cursedBell: 1 }), 0, new Rng(seed));
      expect(offer).not.toContain('cursedBell');
      for (const id of offer) after.add(id);
    }
    expect(after.has('quickCurse') && after.has('moreCurses')).toBe(true);
    // Only the follow-ups left: both of them, then the one not maxed.
    const others = Object.fromEntries(
      TRIAL_IDS.filter((id) => !followUps(id)).map((id) => [id, PICKS[id].maxLevel]),
    );
    expect([...drawOffer('trial', levels(others), 0, new Rng(3))].sort()).toEqual([
      'moreCurses',
      'quickCurse',
    ]);
    expect(drawOffer('trial', levels({ ...others, quickCurse: 3 }), 0, new Rng(3))).toEqual([
      'moreCurses',
    ]);
  });

  it('offers three of the five rules in random order, then fewer, then none', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const offer = drawOffer('rule', levels(), 0, new Rng(seed));
      expect(new Set(offer).size).toBe(3);
      for (const id of offer) seen.add(id);
    }
    expect([...seen].sort()).toEqual([...RULE_IDS].sort());
    const two = levels({ hubris: 1, dice: 1, heavyDrop: 1 });
    expect([...drawOffer('rule', two, 0, new Rng(1))].sort()).toEqual(['copycat', 'echo']);
    const all = { hubris: 1, echo: 1, copycat: 1, dice: 1, heavyDrop: 1 };
    expect(drawOffer('rule', levels(all), 0, new Rng(1))).toEqual([]);
  });

  it('offers three of the five blessings, each of them at times', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const offer = drawOffer('blessing', levels(), 0, new Rng(seed));
      expect(new Set(offer).size).toBe(3);
      for (const id of offer) seen.add(id);
    }
    expect([...seen].sort()).toEqual([...BLESSING_IDS].sort());
  });

  it('leaves maxed options out, and offers nothing when every one is maxed', () => {
    const maxed = { goldenCats: 5, hanabi: 5, joker: 5 };
    const some = drawOffer('blessing', levels(maxed), 0, new Rng(1));
    expect([...some].sort()).toEqual(['bigDrops', 'moreMagnets']);
    const none = levels(Object.fromEntries(TRIAL_IDS.map((id) => [id, PICKS[id].maxLevel])));
    expect(drawOffer('trial', none, 0, new Rng(1))).toEqual([]);
  });

  it('offers a blessing only below its shop card’s level (GAME_DESIGN §10)', () => {
    // A fresh profile: Golden Cats and Big Drops up to 1, the others not at all.
    const fresh = { goldenCats: 1, bigDrops: 1, moreMagnets: 0, hanabi: 0, joker: 0 };
    const first = drawOffer('blessing', levels(), 0, new Rng(1), fresh);
    expect([...first].sort()).toEqual(['bigDrops', 'goldenCats']);
    expect(drawOffer('blessing', levels({ goldenCats: 1 }), 0, new Rng(1), fresh)).toEqual([
      'bigDrops',
    ]);
    expect(
      drawOffer('blessing', levels({ goldenCats: 1, bigDrops: 1 }), 0, new Rng(1), fresh),
    ).toEqual([]);
    expect(pickMaxed('hanabi', levels({ hanabi: 2 }), 0, { hanabi: 2 })).toBe(true);
    expect(pickMaxed('hanabi', levels({ hanabi: 2 }), 0, { hanabi: 3 })).toBe(false);
    // A cap above the pick's own max changes nothing.
    expect(pickMaxed('hanabi', levels({ hanabi: 5 }), 0, { hanabi: 9 })).toBe(true);
    // Trials aren't capped.
    expect(drawOffer('trial', levels(), 0, new Rng(1), fresh)).toHaveLength(3);
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
    ['moreMagnets', {}, 0, '0%', '2.25%'],
    ['moreMagnets', { moreMagnets: 4 }, 0, '9%', '11.25%'],
    ['bigDrops', {}, 0, '10%', '19%'],
    ['bigDrops', {}, 3, '19%', '28%'],
    ['goldenCats', { goldenCats: 2 }, 0, '12%', '18%'],
    ['hanabi', {}, 0, '0%', '2.25%'],
    ['joker', { joker: 4 }, 0, '9%', '11.25%'],
    ['wind', {}, 0, 'Calm', 'Breeze'],
    ['wind', { wind: 4 }, 0, 'Gale', 'Storm'],
    // The rule: the fall of the old trial's last level.
    ['heavyDrop', {}, 0, '0.88 s', '0.24 s'],
    ['porcelain', {}, 0, '0%', '10%'],
    ['porcelain', { porcelain: 3 }, 0, '30%', '40%'],
    ['hubris', {}, 0, 'At once', 'After 0.5 s'],
    ['echo', {}, 0, 'Off', 'On'],
    ['cursedBell', {}, 0, 'Off', 'On'],
    ['quickCurse', {}, 0, '10', '8'],
    ['quickCurse', { quickCurse: 2 }, 0, '7', '6'],
    ['moreCurses', {}, 0, '30', '25'],
    ['moreCurses', { moreCurses: 2 }, 0, '20', '15'],
    ['copycat', {}, 0, 'Random', 'Copied'],
    ['dice', {}, 0, 'Sure', 'Rolled'],
  ])('%s with %j (Big Catch %i) shows %s → %s', (id, over, bigCatch, current, next) => {
    const card = pickCard(id, levels(over), bigCatch);
    expect(card).toMatchObject({ id, current, next, kind: PICKS[id].kind, name: PICKS[id].name });
    expect(card.level).toBe(over[id] ?? 0);
    expect(card.maxLevel).toBe(PICKS[id].maxLevel);
    expect(pickValue(id, levels(over), bigCatch)).toBe(current);
  });
});

describe('the Wind card', () => {
  it("names the way the run's wind blows, and turns its picture with it", () => {
    const right = pickCard('wind', levels(), 0, 1);
    expect(right.description).toBe('The wind blows falling cats to the right');
    expect(right.mirror).toBe(false);
    const left = pickCard('wind', levels(), 0, -1);
    expect(left.description).toBe('The wind blows falling cats to the left');
    expect(left.mirror).toBe(true);
    // Other cards never turn.
    expect(pickCard('heavyDrop', levels(), 0, -1).mirror).toBe(false);
  });
});
