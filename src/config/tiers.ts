/**
 * Cat tiers and sizes (GAME_DESIGN §4). The tables there are generated from these formulas.
 *
 * A cat's tier is its number: it only ever goes up, and it sets the score and coins a merge pays.
 * A cat's size is its place in the current stage, 1–SIZE_COUNT: it sets the radius. Every stage
 * holds the same 12 sizes, and the last one becomes the next stage's first (STAGE_TIER_STEP), so
 * stage 1 has tiers 1–12, stage 2 tiers 12–23, and so on (config/stages.ts).
 */

/** Every stage holds this many cat sizes (tiers). */
export const SIZE_COUNT = 12;
/** A stage's tiers start this many tiers after the previous stage's: its last cat is the next first. */
export const STAGE_TIER_STEP = SIZE_COUNT - 1;

/** Tiers 1–56: stage 5's last cat is tier 1 + 5 × 11 (a config test checks it against STAGE_COUNT). */
export const TIER_COUNT = 56;
export const MIN_TIER = 1;
export const MAX_TIER = TIER_COUNT;

/**
 * r(size) = round(BASE × GROWTH^(size−1)) in world units; the jar is 600 wide. Chosen so that
 * sizes 11, 9, 8, 7, 6 and 5 cover about as much of the jar (55%) as the same six fruits do in
 * Suika Game's box.
 */
export const SIZE_BASE_RADIUS = 28;
export const SIZE_RADIUS_GROWTH = 1.22;

/** S(t) = SCORE_BASE^t. */
export const TIER_SCORE_BASE = 2;

/** C(t) = round(COIN_BASE^(t−1)). */
export const TIER_COIN_BASE = 1.7;

export interface TierInfo {
  readonly tier: number;
  /** Score paid when two cats of this tier merge. */
  readonly score: number;
  /** Base coins paid when two cats of this tier merge (before multipliers). */
  readonly coins: number;
}

export function isTier(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_TIER && value <= MAX_TIER;
}

export function isSize(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= SIZE_COUNT;
}

/** The radius of a cat of `size` (1–12) in world units. */
export function sizeRadius(size: number): number {
  return Math.round(SIZE_BASE_RADIUS * SIZE_RADIUS_GROWTH ** (size - 1));
}

/**
 * How much the jar grows (and the camera zooms out) from one stage to the next: the stage's last
 * cat shrinks on screen to exactly the size of the first one (GAME_DESIGN §7).
 */
export const STAGE_ZOOM = sizeRadius(SIZE_COUNT) / sizeRadius(1);

export function tierScore(tier: number): number {
  return TIER_SCORE_BASE ** tier;
}

export function tierCoins(tier: number): number {
  return Math.round(TIER_COIN_BASE ** (tier - 1));
}

/** Index 0 is tier 1. */
export const TIERS: readonly TierInfo[] = Array.from({ length: TIER_COUNT }, (_, i) => {
  const tier = i + 1;
  return { tier, score: tierScore(tier), coins: tierCoins(tier) };
});

export function tierInfo(tier: number): TierInfo {
  const info = isTier(tier) ? TIERS[tier - 1] : undefined;
  if (!info) throw new RangeError(`Unknown tier: ${tier}`);
  return info;
}
