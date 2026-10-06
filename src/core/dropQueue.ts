/** The queue of cats the dropper hands out (GAME_DESIGN §8). */
import { DROP_WEIGHTS, FIRST_DROPS_SMALLEST_COUNT, stageInfo } from '../config/stages';
import { UPGRADES } from '../config/upgrades';
import type { Rng } from './rng';

export interface Drop {
  readonly tier: number;
}

/**
 * Drop probabilities for a stage's pool, smallest tier first. The base weights are normalized,
 * then Big Catch tilts them towards the bigger cats: each level moves 0.03 of the chances from the
 * smallest to the biggest, and a third of that from size 2 to size 3 (L = 5: 25% each).
 */
export function dropWeights(bigCatchLevel: number): number[] {
  const total = DROP_WEIGHTS.reduce((sum, w) => sum + w, 0);
  const last = DROP_WEIGHTS.length - 1;
  const tilt = UPGRADES.bigCatch.perLevel * bigCatchLevel;
  return DROP_WEIGHTS.map((w, i) => w / total + (tilt * (2 * i - last)) / last);
}

export interface DropQueueOptions {
  readonly rng: Rng;
  readonly stage: number;
  readonly bigCatchLevel: number;
}

/**
 * `current` is the cat in the dropper and `next` the one after it, which the HUD shows. Each cat
 * rolls its tier once; the first two cats of a run are the pool's smallest tier.
 */
export class DropQueue {
  private readonly rng: Rng;
  private readonly bigCatchLevel: number;
  private pool: readonly number[] = [];
  private weights: readonly number[] = [];
  private generated = 0;
  private dropper: Drop;
  private upcoming: Drop;

  constructor(options: DropQueueOptions) {
    this.rng = options.rng;
    this.bigCatchLevel = options.bigCatchLevel;
    this.usePool(options.stage);
    this.dropper = this.generate();
    this.upcoming = this.generate();
  }

  /** The cat in the dropper. */
  get current(): Drop {
    return this.dropper;
  }

  /** The cat after `current`. */
  get next(): Drop {
    return this.upcoming;
  }

  /** Hands out the current cat and moves the queue forward. */
  take(): Drop {
    const drop = this.dropper;
    this.dropper = this.upcoming;
    this.upcoming = this.generate();
    return drop;
  }

  /**
   * Switches to a new stage's pool (after an expansion). Queued cats keep their size: each takes
   * the tier at the same place in the new pool, so the preview the player saw still holds (a 3
   * becomes a 13 of the same size).
   */
  setStage(stage: number): void {
    const shift = stageInfo(stage).firstTier - (this.pool[0] as number);
    this.usePool(stage);
    this.dropper = { tier: this.dropper.tier + shift };
    this.upcoming = { tier: this.upcoming.tier + shift };
  }

  private usePool(stage: number): void {
    this.pool = stageInfo(stage).dropPool;
    this.weights = dropWeights(this.bigCatchLevel);
  }

  private generate(): Drop {
    const forceSmallest = this.generated < FIRST_DROPS_SMALLEST_COUNT;
    this.generated++;
    const rolled = this.pool[this.rng.weightedIndex(this.weights)] as number;
    return { tier: forceSmallest ? (this.pool[0] as number) : rolled };
  }
}
