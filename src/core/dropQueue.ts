/** The queue of cats the dropper hands out (GAME_DESIGN §8). */
import { DROP_POOL_WEIGHTS, FIRST_DROPS_SMALLEST_COUNT, stageInfo } from '../config/stages';
import { UPGRADES } from '../config/upgrades';
import type { Rng } from './rng';

export interface Drop {
  readonly tier: number;
  readonly golden: boolean;
}

/**
 * Normalized drop probabilities for a pool, smallest tier first.
 * Big Catch at level L: weight_i = base_i × (1 + 0.12 × L × i), then normalize.
 */
export function dropWeights(poolSize: number, bigCatchLevel: number): number[] {
  const base = DROP_POOL_WEIGHTS[poolSize];
  if (!base) throw new RangeError(`No drop weights for a pool of ${poolSize} tiers`);
  const step = UPGRADES.bigCatch.perLevel * bigCatchLevel;
  const weights = base.map((w, i) => w * (1 + step * i));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => w / total);
}

export interface DropQueueOptions {
  readonly rng: Rng;
  readonly stage: number;
  readonly bigCatchLevel: number;
  readonly goldenChance: number;
  /** Upcoming cats shown in the HUD (1, or 2 with Fortune Teller). */
  readonly previewCount: number;
}

/**
 * `current` is the cat in the dropper; `preview` holds the next one or two. Every generated cat
 * rolls its tier, then its golden flag (always both draws, so the tier sequence for a seed
 * doesn't depend on Golden Touch). The first two cats of a run are the pool's smallest tier.
 */
export class DropQueue {
  private readonly rng: Rng;
  private readonly bigCatchLevel: number;
  private readonly goldenChance: number;
  private readonly items: Drop[] = [];
  private pool: readonly number[] = [];
  private weights: readonly number[] = [];
  private generated = 0;

  constructor(options: DropQueueOptions) {
    if (!Number.isInteger(options.previewCount) || options.previewCount < 0) {
      throw new RangeError(`Invalid preview count: ${options.previewCount}`);
    }
    this.rng = options.rng;
    this.bigCatchLevel = options.bigCatchLevel;
    this.goldenChance = options.goldenChance;
    this.usePool(options.stage);
    for (let i = 0; i <= options.previewCount; i++) this.items.push(this.generate());
  }

  /** The cat in the dropper. */
  get current(): Drop {
    return this.items[0] as Drop;
  }

  /** The upcoming cats after `current`, next first. */
  get preview(): readonly Drop[] {
    return this.items.slice(1);
  }

  /** Hands out the current cat and moves the queue forward. */
  take(): Drop {
    const drop = this.items.shift() as Drop;
    this.items.push(this.generate());
    return drop;
  }

  /**
   * Switches to a new stage's pool (after an expansion). Queued cats whose tier isn't in the new
   * pool are rolled again from it; they keep their golden flag.
   */
  setStage(stage: number): void {
    this.usePool(stage);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i] as Drop;
      if (!this.pool.includes(item.tier)) {
        this.items[i] = { tier: this.rollTier(), golden: item.golden };
      }
    }
  }

  private usePool(stage: number): void {
    this.pool = stageInfo(stage).dropPool;
    this.weights = dropWeights(this.pool.length, this.bigCatchLevel);
  }

  private generate(): Drop {
    const forceSmallest = this.generated < FIRST_DROPS_SMALLEST_COUNT;
    this.generated++;
    const rolled = this.rollTier();
    const tier = forceSmallest ? (this.pool[0] as number) : rolled;
    const golden = this.rng.chance(this.goldenChance);
    return { tier, golden };
  }

  private rollTier(): number {
    return this.pool[this.rng.weightedIndex(this.weights)] as number;
  }
}
