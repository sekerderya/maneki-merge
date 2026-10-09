import { describe, expect, it } from 'vitest';
import { HANABI_FREE_DROPS, MAGNET_FREE_DROPS } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { DropQueue, dropWeights, PLAIN_ODDS } from '../../src/core/dropQueue';
import type { Drop, DropOdds, DropQueueOptions } from '../../src/core/dropQueue';
import { Rng } from '../../src/core/rng';

const percent = (weights: number[]): number[] => weights.map((w) => Math.round(w * 1000) / 10);

/** Big Catch alone: no special balls. */
const tilt = (tiltLevel: number): DropOdds => ({ ...PLAIN_ODDS, tiltLevel });

const makeQueue = (overrides: Partial<DropQueueOptions> = {}): DropQueue =>
  new DropQueue({
    rng: new Rng(1),
    specialRng: new Rng(101),
    stage: 1,
    ...overrides,
  });

const takeMany = (queue: DropQueue, n: number): Drop[] =>
  Array.from({ length: n }, () => queue.take());

describe('dropWeights (GAME_DESIGN §8)', () => {
  it('uses the base weights without Big Catch', () => {
    expect(percent(dropWeights(0))).toEqual([40, 30, 20, 10]);
  });

  it('matches the §8 table: 3 points per level from the smallest to the biggest', () => {
    expect(percent(dropWeights(1))).toEqual([37, 29, 21, 13]);
    expect(percent(dropWeights(2))).toEqual([34, 28, 22, 16]);
    expect(percent(dropWeights(3))).toEqual([31, 27, 23, 19]);
    expect(percent(dropWeights(4))).toEqual([28, 26, 24, 22]);
    expect(percent(dropWeights(5))).toEqual([25, 25, 25, 25]);
  });

  it('applies share_i = base_i + 0.03 × L × (2i − 3) / 3 for every level', () => {
    for (let level = 0; level <= 5; level++) {
      const expected = [0.4, 0.3, 0.2, 0.1].map((w, i) => w + (0.03 * level * (2 * i - 3)) / 3);
      dropWeights(level).forEach((w, i) => expect(w).toBeCloseTo(expected[i]!, 12));
    }
  });

  it('sums to 1 and shifts weight toward bigger tiers as Big Catch rises', () => {
    let previousSmallest = 1;
    let previousBiggest = 0;
    for (let level = 0; level <= 5; level++) {
      const w = dropWeights(level);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(w.every((share) => share > 0)).toBe(true);
      expect(w[0]!).toBeLessThan(previousSmallest);
      expect(w[3]!).toBeGreaterThan(previousBiggest);
      previousSmallest = w[0]!;
      previousBiggest = w[3]!;
    }
  });
});

describe('DropQueue', () => {
  it('always starts a run with two of the smallest tier', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const stage of [1, 3, 5]) {
        const q = makeQueue({ rng: new Rng(seed), stage, odds: tilt(5) });
        const smallest = stageInfo(stage).dropPool[0];
        expect(q.current.tier).toBe(smallest);
        expect(q.next.tier).toBe(smallest);
        expect(q.take().tier).toBe(smallest);
        expect(q.take().tier).toBe(smallest);
      }
    }
  });

  it('only drops tiers from the stage pool', () => {
    for (let stage = 1; stage <= 5; stage++) {
      const q = makeQueue({ rng: new Rng(stage), stage, odds: tilt(3) });
      const pool = stageInfo(stage).dropPool;
      for (const drop of takeMany(q, 500)) expect(pool).toContain(drop.tier);
    }
  });

  it('drops tiers at the configured rates', () => {
    const n = 100_000;
    const check = (stage: number, bigCatchLevel: number): void => {
      const q = makeQueue({ rng: new Rng(77), stage, odds: tilt(bigCatchLevel) });
      const pool = stageInfo(stage).dropPool;
      const counts = new Map<number, number>();
      takeMany(q, 2); // the fixed opening drops
      for (const d of takeMany(q, n)) counts.set(d.tier, (counts.get(d.tier) ?? 0) + 1);
      const expected = dropWeights(bigCatchLevel);
      pool.forEach((tier, i) => expect((counts.get(tier) ?? 0) / n).toBeCloseTo(expected[i]!, 2));
    };
    check(1, 0);
    check(3, 5);
  });

  it('hands out exactly what the dropper and the preview showed', () => {
    const q = makeQueue({ rng: new Rng(5) });
    for (let i = 0; i < 50; i++) {
      const shown = [q.current, q.next];
      expect(q.take()).toEqual(shown[0]);
      expect(q.current).toEqual(shown[1]);
    }
  });

  it('is deterministic for a seed', () => {
    const a = takeMany(makeQueue({ rng: new Rng(9), odds: tilt(2) }), 300);
    const b = takeMany(makeQueue({ rng: new Rng(9), odds: tilt(2) }), 300);
    expect(a).toEqual(b);
  });

  it('rolls once per cat, the fixed opening drops included', () => {
    const rng = new Rng(12);
    const specialRng = new Rng(13);
    const q = makeQueue({ rng, specialRng });
    const twin = new Rng(12);
    const specialTwin = new Rng(13);
    // The dropper and the preview: two rolls each (kind and golden on the special generator),
    // both forced to the smallest.
    for (let i = 0; i < 2; i++) {
      twin.next();
      specialTwin.next();
      specialTwin.next();
    }
    expect(rng.state()).toEqual(twin.state());
    expect(specialRng.state()).toEqual(specialTwin.state());
    q.take();
    twin.next();
    specialTwin.next();
    specialTwin.next();
    expect(rng.state()).toEqual(twin.state());
    expect(specialRng.state()).toEqual(specialTwin.state());
  });

  it('keeps each queued cat size when the stage changes', () => {
    // Stage 2 drops tiers 10–13, stage 3 tiers 19–22: a queued 11 becomes a 20.
    for (let seed = 0; seed < 50; seed++) {
      const rng = new Rng(seed);
      const q = makeQueue({ rng, stage: 2 });
      takeMany(q, 3);
      const before = [q.current, q.next];
      const state = rng.state();
      q.setStage(3);
      const after = [q.current, q.next];
      const pool = stageInfo(3).dropPool;
      after.forEach((drop, i) => {
        expect(drop).toEqual({ ...before[i]!, tier: before[i]!.tier + 9 });
      });
      // No rolls: the seed's sequence goes on unchanged.
      expect(rng.state()).toEqual(state);
      for (const d of takeMany(q, 100)) expect(pool).toContain(d.tier);
    }
  });
});

describe('special balls in the queue (GAME_DESIGN §15.1)', () => {
  const odds = (o: Partial<DropOdds>): DropOdds => ({ ...PLAIN_ODDS, ...o });
  const count = (drops: Drop[], test: (d: Drop) => boolean): number => drops.filter(test).length;

  it('hands out plain cats without odds, and never a special ball as an opening drop', () => {
    const plain = takeMany(makeQueue({ rng: new Rng(3) }), 2000);
    expect(plain.every((d) => d.kind === 'cat' && !d.golden && d.hits === 0)).toBe(true);
    const all = odds({ magnetChance: 0.5, boulderChance: 0.5 });
    for (let seed = 0; seed < 50; seed++) {
      const q = makeQueue({ specialRng: new Rng(seed), odds: all });
      expect([q.take(), q.take()].map((d) => d.kind)).toEqual(['cat', 'cat']);
    }
  });

  it('rolls magnets, boulders and golden cats at their chances', () => {
    const n = 60_000;
    const q = makeQueue({
      stage: 2,
      odds: odds({ magnetChance: 0.05, boulderChance: 0.1, goldenChance: 0.2 }),
    });
    takeMany(q, 2);
    const drops = takeMany(q, n);
    expect(count(drops, (d) => d.kind === 'magnet') / n).toBeCloseTo(0.05, 2);
    expect(count(drops, (d) => d.kind === 'boulder') / n).toBeCloseTo(0.1, 2);
    const cats = drops.filter((d) => d.kind === 'cat');
    expect(count(cats, (d) => d.golden) / cats.length).toBeCloseTo(0.2, 2);
    // Only cats are golden; only boulders need hits.
    expect(drops.every((d) => d.kind === 'cat' || !d.golden)).toBe(true);
    expect(drops.every((d) => (d.kind === 'boulder') === d.hits > 0)).toBe(true);
  });

  it('gives magnets size 3 and boulders the odds’ size and hits, as tiers of the stage', () => {
    const q = makeQueue({
      stage: 2,
      odds: odds({ magnetChance: 0.5, boulderChance: 0.5, boulderSize: 5, boulderHits: 3 }),
    });
    // Past the magnet-free drops and the two items queued meanwhile.
    takeMany(q, MAGNET_FREE_DROPS + 2);
    const first = stageInfo(2).firstTier;
    for (const d of takeMany(q, 200)) {
      if (d.kind === 'magnet') expect(d.tier).toBe(first + 2);
      else expect(d).toEqual({ kind: 'boulder', tier: first + 4, golden: false, hits: 3 });
    }
  });

  it('never changes the tiers of a seed, whatever the odds', () => {
    const tiers = (o: DropOdds): number[] =>
      takeMany(makeQueue({ rng: new Rng(21), odds: o }), 300).map((d) => d.tier);
    const plain = tiers(PLAIN_ODDS);
    const special = tiers(odds({ goldenChance: 0.3 }));
    expect(special).toEqual(plain);
    // The kinds change, the rolled tiers underneath don't: cats keep theirs.
    const mixed = takeMany(
      makeQueue({ rng: new Rng(21), odds: odds({ magnetChance: 0.2, boulderChance: 0.2 }) }),
      300,
    );
    mixed.forEach((d, i) => {
      if (d.kind === 'cat') expect(d.tier).toBe(plain[i]);
    });
  });

  it('applies new odds to the items rolled after them only', () => {
    const q = makeQueue({ rng: new Rng(4) });
    takeMany(q, MAGNET_FREE_DROPS);
    const queued = [q.current, q.next];
    q.setOdds(odds({ magnetChance: 1 }));
    expect([q.take(), q.take()]).toEqual(queued);
    expect(takeMany(q, 20).every((d) => d.kind === 'magnet')).toBe(true);
  });

  it('queues no magnet before the stage’s 20th drop', () => {
    expect(MAGNET_FREE_DROPS).toBe(20);
    const q = makeQueue({ odds: odds({ magnetChance: 1 }) });
    // The two queued at the start and the ones queued by the first 19 drops are cats.
    const early = takeMany(q, MAGNET_FREE_DROPS + 1);
    expect(early.every((d) => d.kind === 'cat')).toBe(true);
    expect(q.dropsThisStage).toBe(MAGNET_FREE_DROPS + 1);
    // The 20th drop queued the 22nd ball, the first that can be a magnet.
    expect(q.current.kind).toBe('magnet');
    expect(q.next.kind).toBe('magnet');
  });

  it('keeps the boulder chance while magnets are held back', () => {
    const q = makeQueue({ odds: odds({ magnetChance: 0.5, boulderChance: 0.5 }) });
    const early = takeMany(q, MAGNET_FREE_DROPS).slice(2);
    expect(early.some((d) => d.kind === 'boulder')).toBe(true);
    expect(early.some((d) => d.kind === 'cat')).toBe(true);
    expect(early.some((d) => d.kind === 'magnet')).toBe(false);
  });

  it('starts the count again at a new stage and turns queued magnets into small cats', () => {
    const q = makeQueue({ odds: odds({ magnetChance: 1 }) });
    takeMany(q, MAGNET_FREE_DROPS + 1);
    expect([q.current.kind, q.next.kind]).toEqual(['magnet', 'magnet']);
    q.newStage();
    expect(q.dropsThisStage).toBe(0);
    const small: Drop = { kind: 'cat', tier: 1, golden: false, hits: 0 };
    expect([q.current, q.next]).toEqual([small, small]);
    q.setStage(2);
    expect(q.current).toEqual({ ...small, tier: stageInfo(2).firstTier });
    expect(takeMany(q, MAGNET_FREE_DROPS + 1).every((d) => d.kind === 'cat')).toBe(true);
    expect(q.current.kind).toBe('magnet');
  });

  it('leaves queued cats and boulders alone at a new stage', () => {
    const q = makeQueue({ odds: odds({ boulderChance: 0.5, goldenChance: 0.5 }) });
    takeMany(q, 5);
    const queued = [q.current, q.next];
    q.newStage();
    expect([q.current, q.next]).toEqual(queued);
  });

  it('puts a taken ball in the dropper, leaving NEXT alone', () => {
    const q = makeQueue();
    const next = q.next;
    const taken: Drop = { kind: 'boulder', tier: 3, golden: false, hits: 2 };
    q.replaceCurrent(taken);
    expect(q.current).toEqual(taken);
    expect(q.next).toEqual(next);
    expect(q.take()).toEqual(taken);
    expect(q.current).toEqual(next);
  });

  it('keeps a queued boulder’s size and hits through an expansion', () => {
    const q = makeQueue({ stage: 2 });
    q.replaceCurrent({ kind: 'boulder', tier: 11, golden: false, hits: 2 });
    q.setStage(3);
    expect(q.current).toEqual({ kind: 'boulder', tier: 20, golden: false, hits: 2 });
  });

  it('rolls hanabi and jokers at their chances, at size 2, never golden', () => {
    const n = 60_000;
    const q = makeQueue({
      stage: 3,
      odds: odds({ hanabiChance: 0.05, jokerChance: 0.1, goldenChance: 0.5 }),
    });
    takeMany(q, HANABI_FREE_DROPS + 2);
    const drops = takeMany(q, n);
    const hanabi = drops.filter((d) => d.kind === 'hanabi');
    const jokers = drops.filter((d) => d.kind === 'joker');
    expect(hanabi.length / n).toBeCloseTo(0.05, 2);
    expect(jokers.length / n).toBeCloseTo(0.1, 2);
    const tier = stageInfo(3).firstTier + 1;
    for (const d of [...hanabi, ...jokers])
      expect(d).toMatchObject({ tier, golden: false, hits: 0 });
  });

  it('queues no hanabi before the stage’s 20th drop, and none into an empty jar', () => {
    expect(HANABI_FREE_DROPS).toBe(20);
    const q = makeQueue({ odds: odds({ hanabiChance: 1 }) });
    expect(takeMany(q, HANABI_FREE_DROPS + 1).every((d) => d.kind === 'cat')).toBe(true);
    expect([q.current.kind, q.next.kind]).toEqual(['hanabi', 'hanabi']);
    q.newStage();
    expect([q.current.kind, q.next.kind]).toEqual(['cat', 'cat']);
  });

  it('queues jokers from the start and keeps them at a new stage', () => {
    const q = makeQueue({ odds: odds({ jokerChance: 1 }) });
    takeMany(q, 2);
    expect(q.take().kind).toBe('joker');
    q.newStage();
    expect([q.current.kind, q.next.kind]).toEqual(['joker', 'joker']);
  });

  it('rolls the kinds in order on one roll: magnet, boulder, hanabi, joker, cat', () => {
    const shares = { magnetChance: 0.2, boulderChance: 0.2, hanabiChance: 0.2, jokerChance: 0.2 };
    const q = makeQueue({ stage: 2, odds: odds(shares) });
    takeMany(q, MAGNET_FREE_DROPS + 2);
    const drops = takeMany(q, 20_000);
    for (const kind of ['magnet', 'boulder', 'hanabi', 'joker', 'cat'] as const) {
      expect(count(drops, (d) => d.kind === kind) / drops.length).toBeCloseTo(0.2, 1);
    }
  });
});
