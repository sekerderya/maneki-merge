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
    goldenChance: 0,
    previewCount: 1,
    ...overrides,
  });

const takeMany = (queue: DropQueue, n: number): Drop[] =>
  Array.from({ length: n }, () => queue.take());

describe('dropWeights (GAME_DESIGN §8)', () => {
  it('uses the base weights without Big Catch', () => {
    expect(percent(dropWeights(0))).toEqual([40, 30, 20, 10]);
  });

  it('matches the §8 example: Big Catch 5', () => {
    expect(percent(dropWeights(5))).toEqual([25, 30, 27.5, 17.5]);
  });

  it('applies weight_i = base_i × (1 + 0.12 × L × i) for every level', () => {
    for (let level = 0; level <= 5; level++) {
      const raw = [40, 30, 20, 10].map((w, i) => w * (1 + 0.12 * level * i));
      const total = raw.reduce((a, b) => a + b, 0);
      const expected = raw.map((w) => w / total);
      dropWeights(level).forEach((w, i) => expect(w).toBeCloseTo(expected[i]!, 12));
    }
  });

  it('normalizes to 1 and shifts weight toward bigger tiers as Big Catch rises', () => {
    let previousSmallest = 1;
    for (let level = 0; level <= 5; level++) {
      const w = dropWeights(level);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(w[0]!).toBeLessThanOrEqual(previousSmallest);
      previousSmallest = w[0]!;
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
        expect(q.preview[0]!.tier).toBe(smallest);
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

  it('shows one preview by default and two with Fortune Teller', () => {
    expect(makeQueue({ previewCount: 1 }).preview).toHaveLength(1);
    expect(makeQueue({ previewCount: 2 }).preview).toHaveLength(2);
    expect(() => makeQueue({ previewCount: -1 })).toThrow(RangeError);
    expect(() => makeQueue({ previewCount: 1.5 })).toThrow(RangeError);
  });

  it('hands out exactly what the dropper and preview showed', () => {
    const q = makeQueue({ rng: new Rng(5), previewCount: 2 });
    for (let i = 0; i < 50; i++) {
      const shown = [q.current, ...q.preview];
      expect(q.take()).toEqual(shown[0]);
      expect(q.current).toEqual(shown[1]);
      expect(q.preview[0]).toEqual(shown[2]);
    }
  });

  it('is deterministic for a seed', () => {
    const a = takeMany(makeQueue({ rng: new Rng(9), goldenChance: 0.15 }), 300);
    const b = takeMany(makeQueue({ rng: new Rng(9), goldenChance: 0.15 }), 300);
    expect(a).toEqual(b);
  });

  it('rolls golden per drop at the Golden Touch rate', () => {
    expect(takeMany(makeQueue({ goldenChance: 0 }), 2000).some((d) => d.golden)).toBe(false);
    expect(takeMany(makeQueue({ goldenChance: 1 }), 50).every((d) => d.golden)).toBe(true);
    const drops = takeMany(makeQueue({ rng: new Rng(4), goldenChance: 0.15 }), 50_000);
    expect(drops.filter((d) => d.golden).length / drops.length).toBeCloseTo(0.15, 2);
  });

  it('keeps the tier sequence of a seed independent of Golden Touch', () => {
    const tiers = (goldenChance: number): number[] =>
      takeMany(makeQueue({ rng: new Rng(31), goldenChance }), 200).map((d) => d.tier);
    expect(tiers(0.15)).toEqual(tiers(0));
  });

  it('keeps each queued cat size and golden flag when the stage changes', () => {
    // Stage 2 drops tiers 12–15, stage 3 tiers 23–26: a queued 13 becomes a 24.
    for (let seed = 0; seed < 50; seed++) {
      const rng = new Rng(seed);
      const q = makeQueue({ rng, stage: 2, previewCount: 2, goldenChance: 0.5 });
      takeMany(q, 3);
      const before = [q.current, ...q.preview];
      const state = rng.state();
      q.setStage(3);
      const after = [q.current, ...q.preview];
      const pool = stageInfo(3).dropPool;
      after.forEach((drop, i) => {
        expect(drop).toEqual({ tier: before[i]!.tier + 11, golden: before[i]!.golden });
      });
      // No rolls: the seed's sequence goes on unchanged.
      expect(rng.state()).toEqual(state);
      for (const d of takeMany(q, 100)) expect(pool).toContain(d.tier);
    }
  });
});
