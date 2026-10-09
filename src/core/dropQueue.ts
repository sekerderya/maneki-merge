/** The queue of balls the dropper hands out (GAME_DESIGN §8, §15.1). */
import {
  BOULDER_BASE_HITS,
  BOULDER_BASE_SIZE,
  MAGNET_FREE_DROPS,
  MAGNET_SIZE,
} from '../config/picks';
import { DROP_WEIGHTS, FIRST_DROPS_SMALLEST_COUNT, stageInfo } from '../config/stages';
import { UPGRADES } from '../config/upgrades';
import type { Rng } from './rng';

/** A cat, a magnet (takes a ball out of the jar, GAME_DESIGN §15.2) or a boulder (§15.3). */
export type DropKind = 'cat' | 'magnet' | 'boulder';

export interface Drop {
  readonly kind: DropKind;
  /**
   * The tier at the current stage: a cat's tier, a boulder's size as the tier of that size (so its
   * size survives an expansion like a cat's), the magnet's drawn size as a tier.
   */
  readonly tier: number;
  /** A golden cat skips a tier when it merges (GAME_DESIGN §15.4). Only cats are golden. */
  readonly golden: boolean;
  /** The merges a boulder still needs to break; 0 for cats and magnets. */
  readonly hits: number;
}

/** What the queue rolls: the drop weights and the special balls' chances (core/picks.ts). */
export interface DropOdds {
  /** Big Catch's tilt of the drop weights, Big Drops included (0–10). */
  readonly tiltLevel: number;
  readonly magnetChance: number;
  readonly boulderChance: number;
  readonly goldenChance: number;
  /** A boulder's size (1–9) and the merges it needs to break. */
  readonly boulderSize: number;
  readonly boulderHits: number;
}

/** No special balls, no tilt: a plain stage-1 queue. */
export const PLAIN_ODDS: DropOdds = {
  tiltLevel: 0,
  magnetChance: 0,
  boulderChance: 0,
  goldenChance: 0,
  boulderSize: BOULDER_BASE_SIZE,
  boulderHits: BOULDER_BASE_HITS,
};

/**
 * Drop probabilities for a stage's pool, smallest tier first. The base weights are normalized,
 * then Big Catch tilts them towards the bigger cats: each level moves 0.03 of the chances from the
 * smallest to the biggest, and a third of that from size 2 to size 3 (L = 5: 25% each; L = 10, the
 * most with Big Drops: 10, 20, 30, 40%).
 */
export function dropWeights(bigCatchLevel: number): number[] {
  const total = DROP_WEIGHTS.reduce((sum, w) => sum + w, 0);
  const last = DROP_WEIGHTS.length - 1;
  const tilt = UPGRADES.bigCatch.perLevel * bigCatchLevel;
  return DROP_WEIGHTS.map((w, i) => w / total + (tilt * (2 * i - last)) / last);
}

export interface DropQueueOptions {
  /** Rolls the tiers. */
  readonly rng: Rng;
  /**
   * Rolls each item's kind and golden. Both rolls happen for every item, whatever the chances,
   * and on their own generator, so a seed gives the same tiers whatever the picks.
   */
  readonly specialRng: Rng;
  readonly stage: number;
  readonly odds?: DropOdds;
}

/**
 * `current` is the ball in the dropper and `next` the one after it, which the HUD shows. Each item
 * rolls its tier, kind and golden once; the first two items of a run are cats of the pool's
 * smallest tier. No magnet is queued before MAGNET_FREE_DROPS balls were dropped in the stage.
 */
export class DropQueue {
  private readonly rng: Rng;
  private readonly specialRng: Rng;
  private odds: DropOdds;
  private pool: readonly number[] = [];
  private weights: readonly number[] = [];
  private generated = 0;
  /** Balls handed out since the stage started (`newStage`). */
  private stageDrops = 0;
  private dropper: Drop;
  private upcoming: Drop;

  constructor(options: DropQueueOptions) {
    this.rng = options.rng;
    this.specialRng = options.specialRng;
    this.odds = options.odds ?? PLAIN_ODDS;
    this.usePool(options.stage);
    this.dropper = this.generate();
    this.upcoming = this.generate();
  }

  /** The ball in the dropper. */
  get current(): Drop {
    return this.dropper;
  }

  /** The ball after `current`. */
  get next(): Drop {
    return this.upcoming;
  }

  /** Balls handed out since the stage started. */
  get dropsThisStage(): number {
    return this.stageDrops;
  }

  /** Hands out the current ball and moves the queue forward. */
  take(): Drop {
    const drop = this.dropper;
    this.stageDrops++;
    this.dropper = this.upcoming;
    this.upcoming = this.generate();
    return drop;
  }

  /**
   * Puts `drop` in the dropper instead of the current ball, leaving `next` alone: a magnet took a
   * ball out of the jar (GAME_DESIGN §15.2).
   */
  replaceCurrent(drop: Drop): void {
    this.dropper = drop;
  }

  /** New odds for the items rolled from now on; the two queued items stay as they are. */
  setOdds(odds: DropOdds): void {
    this.odds = odds;
    this.weights = dropWeights(odds.tiltLevel);
  }

  /**
   * Switches to a new stage's pool (after an expansion). Queued items keep their size: each takes
   * the tier at the same place in the new pool, so the preview the player saw still holds (a 3
   * becomes a 13 of the same size).
   */
  setStage(stage: number): void {
    const shift = stageInfo(stage).firstTier - (this.pool[0] as number);
    this.usePool(stage);
    this.dropper = { ...this.dropper, tier: this.dropper.tier + shift };
    this.upcoming = { ...this.upcoming, tier: this.upcoming.tier + shift };
  }

  /**
   * A stage was cleared and the jar is empty (GAME_DESIGN §15.1): the drop count starts again, and
   * a queued magnet becomes a cat of the pool's smallest tier, since it would have nothing to take.
   */
  newStage(): void {
    this.stageDrops = 0;
    this.dropper = this.withoutMagnet(this.dropper);
    this.upcoming = this.withoutMagnet(this.upcoming);
  }

  private withoutMagnet(drop: Drop): Drop {
    if (drop.kind !== 'magnet') return drop;
    return { kind: 'cat', tier: this.pool[0] as number, golden: false, hits: 0 };
  }

  private usePool(stage: number): void {
    this.pool = stageInfo(stage).dropPool;
    this.weights = dropWeights(this.odds.tiltLevel);
  }

  private generate(): Drop {
    const forceSmallest = this.generated < FIRST_DROPS_SMALLEST_COUNT;
    this.generated++;
    const first = this.pool[0] as number;
    const tier = this.pool[this.rng.weightedIndex(this.weights)] as number;
    const kindRoll = this.specialRng.next();
    const goldenRoll = this.specialRng.next();
    const odds = this.odds;
    if (forceSmallest) return { kind: 'cat', tier: first, golden: false, hits: 0 };
    // Before the stage's MAGNET_FREE_DROPS-th drop no magnet comes; the other chances stay.
    const magnetChance = this.stageDrops >= MAGNET_FREE_DROPS ? odds.magnetChance : 0;
    if (kindRoll < magnetChance) {
      return { kind: 'magnet', tier: first + MAGNET_SIZE - 1, golden: false, hits: 0 };
    }
    if (kindRoll < magnetChance + odds.boulderChance) {
      const boulderTier = first + odds.boulderSize - 1;
      return { kind: 'boulder', tier: boulderTier, golden: false, hits: odds.boulderHits };
    }
    return { kind: 'cat', tier, golden: goldenRoll < odds.goldenChance, hits: 0 };
  }
}
