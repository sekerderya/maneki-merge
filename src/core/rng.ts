/**
 * Seeded pseudo-random number generator: sfc32, seeded through splitmix32.
 * Every random decision in game logic goes through this (never `Math.random()`), so the same
 * seed and the same inputs replay the same run, in the browser and in Node.
 */

/** The full generator state: four unsigned 32-bit integers. Plain data, safe to JSON. */
export type RngState = readonly [number, number, number, number];

const UINT32_RANGE = 0x1_0000_0000;

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  /** `seed` is reduced to an unsigned 32-bit integer; 0 is a valid seed. */
  constructor(seed: number) {
    let s = toUint32(seed);
    const next = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    // Warm up so nearby seeds diverge immediately.
    for (let i = 0; i < 12; i++) this.nextUint32();
  }

  /** Recreates a generator from `state()`. */
  static fromState(state: RngState): Rng {
    const rng = new Rng(0);
    rng.setState(state);
    return rng;
  }

  /** Continues from `state()` (a saved run). */
  setState(state: RngState): void {
    if (
      state.length !== 4 ||
      !state.every((v) => Number.isInteger(v) && v >= 0 && v < UINT32_RANGE)
    ) {
      throw new TypeError('Invalid RNG state');
    }
    [this.a, this.b, this.c, this.d] = state;
  }

  state(): RngState {
    return [this.a, this.b, this.c, this.d];
  }

  /** A uniform unsigned 32-bit integer. */
  nextUint32(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = (this.b ^ (this.b >>> 9)) >>> 0;
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** A uniform float in [0, 1). */
  next(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** A uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Invalid integer range [${min}, ${max}]`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability `p` (never for p ≤ 0, always for p ≥ 1). Always consumes one draw. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /**
   * Picks an index with probability proportional to its weight. Weights must be finite and
   * non-negative with a positive sum. Always consumes one draw.
   */
  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) {
      if (!Number.isFinite(w) || w < 0) throw new RangeError(`Invalid weight: ${w}`);
      total += w;
    }
    if (total <= 0) throw new RangeError('Weights must have a positive sum');

    let roll = this.next() * total;
    let last = 0;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] ?? 0;
      if (w <= 0) continue;
      last = i;
      if (roll < w) return i;
      roll -= w;
    }
    // Floating-point leftovers land on the last non-zero weight.
    return last;
  }
}

function toUint32(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError(`Invalid seed: ${value}`);
  return Math.trunc(value) >>> 0;
}
