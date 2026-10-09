/**
 * Cat tiers and sizes (GAME_DESIGN §4). The tables there are generated from these formulas.
 *
 * A cat's tier is its number: it only ever goes up, and it sets the score and coins a merge pays.
 * A cat's size is its place in the current stage, 1–SIZE_COUNT: it sets the radius. Every stage
 * holds the same 9 sizes and starts where the previous one ended (STAGE_TIER_STEP), so stage 1
 * has tiers 1–9, stage 2 tiers 10–18, and so on (config/stages.ts). Until v0.24 a stage held 10
 * sizes and its last cat was the next stage's first.
 */

/** Every stage holds this many cat sizes (tiers): two 8s make the last one and clear the stage. */
export const SIZE_COUNT = 9;
/** A stage's tiers start this many tiers after the previous stage's: right after its last cat. */
export const STAGE_TIER_STEP = SIZE_COUNT;

/** Tiers 1–45: stage 5's last cat is tier 5 × 9 (a config test checks it against STAGE_COUNT). */
export const TIER_COUNT = 45;
export const MIN_TIER = 1;
export const MAX_TIER = TIER_COUNT;

/**
 * r(size) = round(BASE × GROWTH^(size−1)) in world units; the jar is 600 wide. v0.24: every cat is
 * 20% bigger (base 41 instead of 34, same step), because a stage now ends at size 9 and needs half
 * the cats: sizes 1–8 together cover as much of the jar as sizes 1–9 did, and size 9 (165) is as
 * big as the old size 10 (163). v0.19.3: base 34, × 1.19; before that 28, × 1.22.
 */
export const SIZE_BASE_RADIUS = 41;
export const SIZE_RADIUS_GROWTH = 1.19;

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

/** The radius of a cat of `size` (1–9) in world units. */
export function sizeRadius(size: number): number {
  return Math.round(SIZE_BASE_RADIUS * SIZE_RADIUS_GROWTH ** (size - 1));
}

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
