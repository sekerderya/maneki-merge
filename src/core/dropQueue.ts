/** The queue of balls the dropper hands out (GAME_DESIGN §8, §15.1). */
import {
  BOULDER_BASE_HITS,
  BOULDER_BASE_SIZE,
  FROG_FREE_DROPS,
  FROG_MEALS,
  FROG_SIZE,
  HANABI_FREE_DROPS,
  HANABI_SIZE,
  JOKER_SIZE,
  KATANA_FREE_DROPS,
  KATANA_SIZE,
  LIGHTNING_FREE_DROPS,
  LIGHTNING_SIZE,
  MAGNET_FREE_DROPS,
  MAGNET_SIZE,
} from '../config/picks';
import {
  DROP_TILT_STEP,
  DROP_WEIGHTS,
  FIRST_DROPS_SMALLEST_COUNT,
  MATCH_HELP_FACTOR,
  stageInfo,
} from '../config/stages';
import type { Rng } from './rng';
import type { QueueSnapshot } from './runSave';

/**
 * A cat, a magnet (takes a ball out of the jar, GAME_DESIGN §15.2), a boulder (§15.3), a hanabi
 * (pops the small cats around it, §15.6), a joker cat (merges with any cat, §15.7) or a lightning
 * ball (strikes every cat of the size it touches, §15.15), a katana (cuts every small cat in a
 * line, §15.16; it never goes into the jar as a ball) or a frog (swallows a small cat at every
 * drop, §15.17).
 */
export type DropKind =
  'cat' | 'magnet' | 'boulder' | 'hanabi' | 'joker' | 'lightning' | 'katana' | 'frog';

export interface Drop {
  readonly kind: DropKind;
  /**
   * The tier at the current stage: a cat's tier, a boulder's size as the tier of that size (so its
   * size survives an expansion like a cat's), a magnet's, hanabi's, joker's, lightning ball's or
   * katana's size as a tier.
   */
  readonly tier: number;
  /** A golden cat skips a tier when it merges (GAME_DESIGN §15.4). Only cats are golden. */
  readonly golden: boolean;
  /** The merges a boulder still needs to break, a frog's meals; 0 for the others. */
  readonly hits: number;
}

/** What the queue rolls: the drop weights and the special balls' chances (core/picks.ts). */
export interface DropOdds {
  /** Big Catch's tilt of the drop weights, Big Drops included (0–10). */
  readonly tiltLevel: number;
  readonly magnetChance: number;
  readonly boulderChance: number;
  readonly goldenChance: number;
  readonly hanabiChance: number;
  readonly jokerChance: number;
  readonly lightningChance: number;
  readonly katanaChance: number;
  readonly frogChance: number;
  /** The meals a frog queued now makes before it leaves (Long Stay). */
  readonly frogMeals: number;
  /** A boulder's size (1–9) and the merges it needs to break. */
  readonly boulderSize: number;
  readonly boulderHits: number;
}

/** The kinds a stage clear turns into a cat (`newStage`): they would have nothing to work on. */
const EMPTY_JAR_TURNS: ReadonlySet<DropKind> = new Set([
  'magnet',
  'hanabi',
  'lightning',
  'katana',
  'frog',
]);

/** No special balls, no tilt: a plain stage-1 queue. */
export const PLAIN_ODDS: DropOdds = {
  tiltLevel: 0,
  magnetChance: 0,
  boulderChance: 0,
  goldenChance: 0,
  hanabiChance: 0,
  jokerChance: 0,
  lightningChance: 0,
  katanaChance: 0,
  frogChance: 0,
  frogMeals: FROG_MEALS[0],
  boulderSize: BOULDER_BASE_SIZE,
  boulderHits: BOULDER_BASE_HITS,
};

/**
 * Drop probabilities for a stage's pool, smallest tier first. The base weights are normalized,
 * then the tilt (Big Catch and Big Drops, core/picks.ts) moves them towards the bigger cats: each
 * tilt level moves 0.03 of the chances from the smallest to the biggest, and a third of that from
 * size 2 to size 3 (L = 5: 25% each; L = 10, the most: 10, 20, 30, 40%). L needn't be whole.
 */
export function dropWeights(tiltLevel: number): number[] {
  const total = DROP_WEIGHTS.reduce((sum, w) => sum + w, 0);
  const last = DROP_WEIGHTS.length - 1;
  const tilt = DROP_TILT_STEP * tiltLevel;
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
 * smallest tier. No magnet is queued before MAGNET_FREE_DROPS balls were dropped in the stage, no
 * hanabi before HANABI_FREE_DROPS, no lightning ball before LIGHTNING_FREE_DROPS, no katana before
 * KATANA_FREE_DROPS, no frog before FROG_FREE_DROPS. With Copycat
 * (GAME_DESIGN §15.13) a merge turns the cat in NEXT to its size (`copyNext`); the cats queued
 * after it roll as usual.
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
  /**
   * The ball that goes back into the dropper after the current one (`cutIn`), ahead of NEXT, or
   * null.
   */
  private held: Drop | null = null;

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

  /** The ball waiting to come back to the dropper after the current one (`cutIn`), or null. */
  get waiting(): Drop | null {
    return this.held;
  }

  /** Balls handed out since the stage started. */
  get dropsThisStage(): number {
    return this.stageDrops;
  }

  /**
   * Copycat (GAME_DESIGN §15.13): the cat in NEXT takes `tier`; the ball in the dropper stays as it
   * is, and the cats queued after NEXT roll as usual. A golden cat stays golden; magnets, boulders,
   * hanabi, jokers, lightning balls and katanas never change, nor do a run's first two cats. Returns
   * whether NEXT changed.
   */
  copyNext(tier: number): boolean {
    const next = this.upcoming;
    if (next.kind !== 'cat' || next.tier === tier || this.opening) return false;
    this.upcoming = { ...next, tier };
    return true;
  }

  /** NEXT is one of a run's first two items, always the smallest cat. */
  private get opening(): boolean {
    return this.generated <= FIRST_DROPS_SMALLEST_COUNT;
  }

  /**
   * Hands out the current ball and moves the queue forward. A cat queued now comes in a `wanted`
   * tier MATCH_HELP_FACTOR times as often (the first stage's help, GAME_DESIGN §8).
   */
  take(wanted: readonly number[] = []): Drop {
    const drop = this.dropper;
    this.stageDrops++;
    if (this.held) {
      // The ball that waited for a cut-in comes back; NEXT stays where it was, nothing is rolled.
      this.dropper = this.held;
      this.held = null;
      return drop;
    }
    this.dropper = this.upcoming;
    this.upcoming = this.generate(wanted);
    return drop;
  }

  /**
   * Puts `drop` in the dropper ahead of its ball, which waits and comes back after it; NEXT stays
   * as it is (the rewarded ad's bonus ball, GAME_DESIGN §2.7). With a ball already waiting, `drop`
   * only takes the dropper's place.
   */
  cutIn(drop: Drop): void {
    this.held ??= this.dropper;
    this.dropper = drop;
  }

  /**
   * Puts `drop` in the dropper instead of the current ball, leaving `next` alone: a magnet took a
   * ball out of the jar (GAME_DESIGN §15.2).
   */
  replaceCurrent(drop: Drop): void {
    this.dropper = drop;
  }

  /** Puts `drop` in NEXT instead of its ball (the scenes, GAME_DESIGN §2.6). */
  replaceNext(drop: Drop): void {
    this.upcoming = drop;
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
    if (this.held) this.held = { ...this.held, tier: this.held.tier + shift };
  }

  /**
   * A stage was cleared and the jar is empty (GAME_DESIGN §15.1): the drop count starts again, and
   * a queued magnet, hanabi, lightning ball, katana or frog becomes a cat of the pool's smallest
   * tier, since it would have nothing to take, pop, strike, cut or swallow. A cut-in one (the bonus ball,
   * GAME_DESIGN §2.7) isn't lost: it swaps places with the ball waiting behind it, and comes after
   * the stage's first drop.
   */
  newStage(): void {
    this.stageDrops = 0;
    if (this.held && this.forEmptyJar(this.dropper) !== this.dropper) {
      [this.dropper, this.held] = [this.held, this.dropper];
    }
    this.dropper = this.forEmptyJar(this.dropper);
    this.upcoming = this.forEmptyJar(this.upcoming);
  }

  /** The queue as it stands, for a saved run. */
  snapshot(): QueueSnapshot {
    return {
      current: this.dropper,
      next: this.upcoming,
      generated: this.generated,
      stageDrops: this.stageDrops,
      ...(this.held ? { held: this.held } : {}),
    };
  }

  /** Continues a saved run's queue at `stage` (its odds come with `setOdds`). */
  restore(saved: QueueSnapshot, stage: number): void {
    this.usePool(stage);
    this.dropper = { ...saved.current };
    this.upcoming = { ...saved.next };
    this.generated = saved.generated;
    this.stageDrops = saved.stageDrops;
    this.held = saved.held ? { ...saved.held } : null;
  }

  private forEmptyJar(drop: Drop): Drop {
    if (!EMPTY_JAR_TURNS.has(drop.kind)) return drop;
    return { kind: 'cat', tier: this.pool[0] as number, golden: false, hits: 0 };
  }

  private usePool(stage: number): void {
    this.pool = stageInfo(stage).dropPool;
    this.weights = dropWeights(this.odds.tiltLevel);
  }

  private generate(wanted: readonly number[] = []): Drop {
    const forceSmallest = this.generated < FIRST_DROPS_SMALLEST_COUNT;
    this.generated++;
    const first = this.pool[0] as number;
    // Still one draw, so the help only moves where the roll falls.
    const weights =
      wanted.length > 0
        ? this.weights.map((w, i) =>
            wanted.includes(this.pool[i] as number) ? w * MATCH_HELP_FACTOR : w,
          )
        : this.weights;
    const tier = this.pool[this.rng.weightedIndex(weights)] as number;
    const kindRoll = this.specialRng.next();
    const goldenRoll = this.specialRng.next();
    const odds = this.odds;
    if (forceSmallest) return { kind: 'cat', tier: first, golden: false, hits: 0 };
    // Early in a stage no magnet, hanabi, lightning ball or katana comes; the other chances stay.
    const magnetChance = this.stageDrops >= MAGNET_FREE_DROPS ? odds.magnetChance : 0;
    const hanabiChance = this.stageDrops >= HANABI_FREE_DROPS ? odds.hanabiChance : 0;
    const lightningChance = this.stageDrops >= LIGHTNING_FREE_DROPS ? odds.lightningChance : 0;
    const katanaChance = this.stageDrops >= KATANA_FREE_DROPS ? odds.katanaChance : 0;
    const frogChance = this.stageDrops >= FROG_FREE_DROPS ? odds.frogChance : 0;
    // One roll picks the kind: magnet, boulder, hanabi, joker, lightning, katana, frog, then cat, in
    // that order (a new kind goes last, so a seed's other kinds stay where they were).
    let below = magnetChance;
    if (kindRoll < below) {
      return { kind: 'magnet', tier: first + MAGNET_SIZE - 1, golden: false, hits: 0 };
    }
    below += odds.boulderChance;
    if (kindRoll < below) {
      const boulderTier = first + odds.boulderSize - 1;
      return { kind: 'boulder', tier: boulderTier, golden: false, hits: odds.boulderHits };
    }
    below += hanabiChance;
    if (kindRoll < below) {
      return { kind: 'hanabi', tier: first + HANABI_SIZE - 1, golden: false, hits: 0 };
    }
    below += odds.jokerChance;
    if (kindRoll < below) {
      return { kind: 'joker', tier: first + JOKER_SIZE - 1, golden: false, hits: 0 };
    }
    below += lightningChance;
    if (kindRoll < below) {
      return { kind: 'lightning', tier: first + LIGHTNING_SIZE - 1, golden: false, hits: 0 };
    }
    below += katanaChance;
    if (kindRoll < below) {
      return { kind: 'katana', tier: first + KATANA_SIZE - 1, golden: false, hits: 0 };
    }
    below += frogChance;
    if (kindRoll < below) {
      return { kind: 'frog', tier: first + FROG_SIZE - 1, golden: false, hits: odds.frogMeals };
    }
    return { kind: 'cat', tier, golden: goldenRoll < odds.goldenChance, hits: 0 };
  }
}
