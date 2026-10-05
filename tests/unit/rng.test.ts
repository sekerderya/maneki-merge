import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';

const draw = (rng: Rng, n: number): number[] => Array.from({ length: n }, () => rng.nextUint32());

describe('Rng', () => {
  it('replays the same sequence for the same seed', () => {
    expect(draw(new Rng(42), 100)).toEqual(draw(new Rng(42), 100));
  });

  it('gives different sequences for nearby seeds', () => {
    const a = draw(new Rng(1), 8);
    const b = draw(new Rng(2), 8);
    expect(a).not.toEqual(b);
    expect(a.filter((v, i) => v === b[i])).toHaveLength(0);
  });

  it('pins the sequence for seed 12345, so saves and replays stay stable across versions', () => {
    // If this changes, every seeded run changes: only do it deliberately.
    expect(draw(new Rng(12345), 4)).toMatchInlineSnapshot(`
      [
        2345461488,
        1344865159,
        2974739204,
        3448212715,
      ]
    `);
  });

  it('reduces seeds to 32 bits and accepts 0', () => {
    expect(draw(new Rng(2 ** 32 + 7), 5)).toEqual(draw(new Rng(7), 5));
    expect(draw(new Rng(-1), 5)).toEqual(draw(new Rng(0xffffffff), 5));
    expect(() => new Rng(0)).not.toThrow();
    expect(() => new Rng(Number.NaN)).toThrow(RangeError);
    expect(() => new Rng(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('serializes its state and resumes exactly', () => {
    const rng = new Rng(99);
    draw(rng, 37);
    const state = rng.state();
    const json = JSON.parse(JSON.stringify(state)) as typeof state;
    const resumed = Rng.fromState(json);
    expect(draw(resumed, 50)).toEqual(draw(rng, 50));
  });

  it('rejects invalid states', () => {
    expect(() => Rng.fromState([1, 2, 3] as unknown as [number, number, number, number])).toThrow(
      TypeError,
    );
    expect(() => Rng.fromState([1, 2, 3, -1])).toThrow(TypeError);
    expect(() => Rng.fromState([1, 2, 3, 2 ** 32])).toThrow(TypeError);
    expect(() => Rng.fromState([1, 2, 3, 0.5])).toThrow(TypeError);
  });

  it('returns floats in [0, 1) with a sensible mean', () => {
    const rng = new Rng(7);
    let sum = 0;
    for (let i = 0; i < 100_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 100_000).toBeCloseTo(0.5, 2);
  });

  it('returns integers in an inclusive range, hitting both ends', () => {
    const rng = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(-2, 2);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([-1, -2, 0, 1, 2].sort());
    expect(rng.int(5, 5)).toBe(5);
    expect(() => rng.int(3, 2)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });

  it('rolls chances at the right rate and always consumes one draw', () => {
    const rng = new Rng(11);
    let hits = 0;
    for (let i = 0; i < 100_000; i++) if (rng.chance(0.03)) hits++;
    expect(hits / 100_000).toBeCloseTo(0.03, 2);

    const a = new Rng(5);
    const b = new Rng(5);
    expect(a.chance(0)).toBe(false);
    expect(a.chance(1)).toBe(true);
    b.next();
    b.next();
    expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('picks weighted indexes in proportion and skips zero weights', () => {
    const rng = new Rng(21);
    const counts = [0, 0, 0, 0];
    const n = 200_000;
    for (let i = 0; i < n; i++) counts[rng.weightedIndex([1, 0, 3, 6])]!++;
    expect(counts[1]).toBe(0);
    expect(counts[0]! / n).toBeCloseTo(0.1, 2);
    expect(counts[2]! / n).toBeCloseTo(0.3, 2);
    expect(counts[3]! / n).toBeCloseTo(0.6, 2);
    expect(rng.weightedIndex([0, 0, 5])).toBe(2);
  });

  it('rejects invalid weights', () => {
    const rng = new Rng(1);
    expect(() => rng.weightedIndex([])).toThrow(RangeError);
    expect(() => rng.weightedIndex([0, 0])).toThrow(RangeError);
    expect(() => rng.weightedIndex([1, -1])).toThrow(RangeError);
    expect(() => rng.weightedIndex([1, Number.NaN])).toThrow(RangeError);
  });
});
