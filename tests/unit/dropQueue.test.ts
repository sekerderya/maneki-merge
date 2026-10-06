import { describe, expect, it } from 'vitest';
import { stageInfo } from '../../src/config/stages';
import { DropQueue, dropWeights } from '../../src/core/dropQueue';
import type { Drop, DropQueueOptions } from '../../src/core/dropQueue';
import { Rng } from '../../src/core/rng';

const percent = (weights: number[]): number[] => weights.map((w) => Math.round(w * 1000) / 10);

const makeQueue = (overrides: Partial<DropQueueOptions> = {}): DropQueue =>
  new DropQueue({
    rng: new Rng(1),
    stage: 1,
    bigCatchLevel: 0,
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
        const q = makeQueue({ rng: new Rng(seed), stage, bigCatchLevel: 5 });
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
      const q = makeQueue({ rng: new Rng(stage), stage, bigCatchLevel: 3 });
      const pool = stageInfo(stage).dropPool;
      for (const drop of takeMany(q, 500)) expect(pool).toContain(drop.tier);
    }
  });

  it('drops tiers at the configured rates', () => {
    const n = 100_000;
    const check = (stage: number, bigCatchLevel: number): void => {
      const q = makeQueue({ rng: new Rng(77), stage, bigCatchLevel });
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
    const a = takeMany(makeQueue({ rng: new Rng(9), bigCatchLevel: 2 }), 300);
    const b = takeMany(makeQueue({ rng: new Rng(9), bigCatchLevel: 2 }), 300);
    expect(a).toEqual(b);
  });

  it('rolls once per cat, the fixed opening drops included', () => {
    const rng = new Rng(12);
    const q = makeQueue({ rng });
    const twin = new Rng(12);
    // The dropper and the preview: two rolls, both forced to the smallest.
    twin.next();
    twin.next();
    expect(rng.state()).toEqual(twin.state());
    q.take();
    twin.next();
    expect(rng.state()).toEqual(twin.state());
  });

  it('keeps each queued cat size when the stage changes', () => {
    // Stage 2 drops tiers 11–14, stage 3 tiers 21–24: a queued 12 becomes a 22.
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
        expect(drop).toEqual({ tier: before[i]!.tier + 10 });
      });
      // No rolls: the seed's sequence goes on unchanged.
      expect(rng.state()).toEqual(state);
      for (const d of takeMany(q, 100)) expect(pool).toContain(d.tier);
    }
  });
});
