/** Jar stages and drop pools (GAME_DESIGN §7 and §8). */
import { isSize, SIZE_COUNT, sizeRadius, STAGE_TIER_STEP } from './tiers';

export const STAGE_COUNT = 5;
export const FIRST_STAGE = 1;

/**
 * The jar in world units, the same at every stage: when the jar grows, the world is rescaled so
 * the new stage plays exactly like the first (GAME_DESIGN §7). Aspect ratio 1 : 1.45.
 */
export const JAR_WIDTH = 600;
export const JAR_HEIGHT = 870;

/**
 * The jar's bottom corners are quarter circles of this radius (GAME_DESIGN §6): the curved
 * bamboo jar the owner chose in v0.14 (0.19 of the jar's width).
 */
export const JAR_CORNER_RADIUS = 112;

/**
 * Above the rim the camera keeps this fraction of the jar width free for the dropper
 * (TECH_SPEC §4). A cat waiting in the dropper sits in the middle of that band.
 */
export const DROPPER_HEADROOM_RATIO = 0.18;

/**
 * The dropper hands out a stage's smallest DROP_SIZES sizes, with these base weights (smallest
 * first). Big Catch shifts them towards the bigger ones (core/dropQueue.ts).
 */
export const DROP_SIZES = 4;
export const DROP_WEIGHTS: readonly number[] = [40, 30, 20, 10];

/** The first drops of a run are always the pool's smallest tier. */
export const FIRST_DROPS_SMALLEST_COUNT = 2;

export interface StageInfo {
  readonly stage: number;
  /** The stage's smallest cat (size 1): the previous stage's last cat. */
  readonly firstTier: number;
  /** The stage's last cat (size 10). Making it clears the stage and grows the jar. */
  readonly lastTier: number;
  /** Tiers the dropper can produce, smallest first. */
  readonly dropPool: readonly number[];
}

export function isStage(value: number): boolean {
  return Number.isInteger(value) && value >= FIRST_STAGE && value <= STAGE_COUNT;
}

/** Index 0 is stage 1. */
export const STAGES: readonly StageInfo[] = Array.from({ length: STAGE_COUNT }, (_, i) => {
  const firstTier = 1 + i * STAGE_TIER_STEP;
  return {
    stage: i + 1,
    firstTier,
    lastTier: firstTier + SIZE_COUNT - 1,
    dropPool: Array.from({ length: DROP_SIZES }, (_, s) => firstTier + s),
  };
});

export function stageInfo(stage: number): StageInfo {
  const info = isStage(stage) ? STAGES[stage - 1] : undefined;
  if (!info) throw new RangeError(`Unknown stage: ${stage}`);
  return info;
}

/** A tier's size (1–10) at `stage`; outside 1–10 when the stage can't hold that tier. */
export function tierSize(tier: number, stage: number): number {
  return tier - stageInfo(stage).firstTier + 1;
}

/** True when `stage` can hold cats of `tier` (its first to its last tier). */
export function stageHoldsTier(stage: number, tier: number): boolean {
  return isSize(tierSize(tier, stage));
}

/** The radius of a `tier` cat at `stage`, in world units. */
export function catRadius(tier: number, stage: number): number {
  const size = tierSize(tier, stage);
  if (!isSize(size)) throw new RangeError(`Stage ${stage} can't hold tier ${tier}`);
  return sizeRadius(size);
}
