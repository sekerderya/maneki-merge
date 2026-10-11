/**
 * Cat tiers and sizes (GAME_DESIGN §4). The tables there are generated from these formulas.
 *
 * A cat's tier is its number: it only ever goes up. A cat's size is its place in its stage,
 * 1–SIZE_COUNT: it sets the radius. The size and the stage set the score and coins a merge pays
 * (core/economy.ts, v0.36; until then the tier alone did, so later stages paid ~118× more each). Every stage
 * holds the same 9 sizes and starts where the previous one ended (STAGE_TIER_STEP), so stage 1
 * has tiers 1–9, stage 2 tiers 10–18, and so on (config/stages.ts). Until v0.24 a stage held 10
 * sizes and its last cat was the next stage's first.
 */

/** Every stage holds this many cat sizes (tiers): two 8s make the last one and clear the stage. */
export const SIZE_COUNT = 9;
/** A stage's tiers start this many tiers after the previous stage's: right after its last cat. */
export const STAGE_TIER_STEP = SIZE_COUNT;

/** Tiers start at 1 and have no end, like the stages (v0.33; until then 1–45, five stages). */
export const MIN_TIER = 1;

/**
 * r(size) = round(BASE × GROWTH^(size−1)) in world units; the jar is 600 wide. v0.24: every cat is
 * 20% bigger (base 41 instead of 34, same step), because a stage now ends at size 9 and needs half
 * the cats: sizes 1–8 together cover as much of the jar as sizes 1–9 did, and size 9 (165) is as
 * big as the old size 10 (163). v0.19.3: base 34, × 1.19; before that 28, × 1.22.
 */
export const SIZE_BASE_RADIUS = 41;
export const SIZE_RADIUS_GROWTH = 1.19;

/** Merging two size-s cats scores SIZE_SCORE_BASE^s at stage 1 (core/economy.ts adds the stage). */
export const SIZE_SCORE_BASE = 2;

/** Merging two size-s cats pays round(SIZE_COIN_BASE^(s−1)) coins in the first jar. */
export const SIZE_COIN_BASE = 1.7;

export function isTier(value: number): boolean {
  return Number.isSafeInteger(value) && value >= MIN_TIER;
}

export function isSize(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= SIZE_COUNT;
}

/** The radius of a cat of `size` (1–9) in world units. */
export function sizeRadius(size: number): number {
  return Math.round(SIZE_BASE_RADIUS * SIZE_RADIUS_GROWTH ** (size - 1));
}

/** The score for merging two cats of `size` at stage 1: 2, 4, 8, … 256 (two 8s). */
export function sizeScore(size: number): number {
  return SIZE_SCORE_BASE ** size;
}

/** The base coins for merging two cats of `size` in the first jar: 1, 2, 3, 5, … 41 (two 8s). */
export function sizeCoins(size: number): number {
  return Math.round(SIZE_COIN_BASE ** (size - 1));
}
