/** Jar stages and drop pools (GAME_DESIGN §7 and §8). */
import { isSize, SIZE_COUNT, sizeRadius, STAGE_TIER_STEP } from './tiers';

/** Stages have no end (v0.33): every clear moves the run on to the next stage. */
export const FIRST_STAGE = 1;

/**
 * The jar grows (the camera zooms out and the next background shows) only when a stage that is a
 * multiple of this is cleared (v0.33, the owner's call): stages 1–5 play in the first jar, 6–10 in
 * the second, and so on. The other clears move on to the next stage in the same jar.
 */
export const JAR_GROWTH_STAGES = 5;

/**
 * The jar in world units, the same at every stage: the jar grows on screen, then the new stage
 * plays in the same empty world jar, exactly like the first (GAME_DESIGN §7). Aspect 1 : 1.45.
 */
export const JAR_WIDTH = 600;
export const JAR_HEIGHT = 870;

/**
 * Above the rim the camera keeps this fraction of the jar width free for the dropper
 * (TECH_SPEC §4). A cat waiting in the dropper sits in the middle of that band, which holds the
 * biggest cat the dropper hands out (size 4) clear of the jar art's top rail (0.2 until v0.21.1,
 * when the cat hung in front of the rail; 0.4 until v0.24, when the cats grew by 20%).
 */
export const DROPPER_HEADROOM_RATIO = 0.44;

/**
 * The dropper hands out a stage's smallest DROP_SIZES sizes, with these base weights (smallest
 * first). Big Catch shifts them towards the bigger ones (core/dropQueue.ts).
 */
export const DROP_SIZES = 4;
export const DROP_WEIGHTS: readonly number[] = [40, 30, 20, 10];

/**
 * One level of drop tilt (Big Catch and Big Drops, GAME_DESIGN §8) moves this share of the chances
 * from the smallest drop to the biggest, and a third of it from size 2 to size 3: a tilt of 5 makes
 * them 25% each, the most, 13 (MAX_DROP_TILT_LEVEL), 1, 17, 33 and 49%.
 */
export const DROP_TILT_STEP = 0.03;

/** The first drops of a run are always the pool's smallest tier. */
export const FIRST_DROPS_SMALLEST_COUNT = 2;

/**
 * The first stage's quiet help (v0.52, the owner's call, GAME_DESIGN §8): up to this stage, a cat
 * queued while cats of drop sizes wait on top of the jar for a partner comes in one of their sizes
 * more often, so the stage goes a little quicker.
 */
export const MATCH_HELP_LAST_STAGE = 1;

/** How much more often: a wanted size's drop weight is multiplied by this. */
export const MATCH_HELP_FACTOR = 3;

export interface StageInfo {
  readonly stage: number;
  /** The stage's smallest cat (size 1): the tier after the previous stage's last cat. */
  readonly firstTier: number;
  /** The stage's last cat (size 9). Making it clears the stage and grows the jar. */
  readonly lastTier: number;
  /** Tiers the dropper can produce, smallest first. */
  readonly dropPool: readonly number[];
}

export function isStage(value: number): boolean {
  return Number.isSafeInteger(value) && value >= FIRST_STAGE;
}

const stageCache = new Map<number, StageInfo>();

export function stageInfo(stage: number): StageInfo {
  if (!isStage(stage)) throw new RangeError(`Unknown stage: ${stage}`);
  let info = stageCache.get(stage);
  if (!info) {
    const firstTier = 1 + (stage - 1) * STAGE_TIER_STEP;
    info = Object.freeze({
      stage,
      firstTier,
      lastTier: firstTier + SIZE_COUNT - 1,
      dropPool: Object.freeze(Array.from({ length: DROP_SIZES }, (_, s) => firstTier + s)),
    });
    stageCache.set(stage, info);
  }
  return info;
}

/** True when clearing `stage` grows the jar into the next one (every JAR_GROWTH_STAGES stages). */
export function clearGrowsJar(stage: number): boolean {
  return isStage(stage) && stage % JAR_GROWTH_STAGES === 0;
}

/** The jar a stage plays in, from 1: stages 1–5 are jar 1, 6–10 jar 2, and so on. */
export function stageJar(stage: number): number {
  return Math.floor((stageInfo(stage).stage - 1) / JAR_GROWTH_STAGES) + 1;
}

/** The stage whose cats include `tier`: stage n holds tiers 9n − 8 to 9n. */
export function tierStage(tier: number): number {
  return Math.floor((tier - 1) / STAGE_TIER_STEP) + FIRST_STAGE;
}

/** A tier's size (1–9) at `stage`; outside 1–9 when the stage can't hold that tier. */
export function tierSize(tier: number, stage: number): number {
  return tier - stageInfo(stage).firstTier + 1;
}

/** True when `stage` holds cats of `tier` (its first to its last tier). */
export function stageHoldsTier(stage: number, tier: number): boolean {
  return isSize(tierSize(tier, stage));
}

/** The radius of a `tier` cat at `stage`, in world units. */
export function catRadius(tier: number, stage: number): number {
  const size = tierSize(tier, stage);
  if (!isSize(size)) throw new RangeError(`Stage ${stage} can't hold tier ${tier}`);
  return sizeRadius(size);
}
