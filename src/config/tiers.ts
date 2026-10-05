/** Cat tiers (GAME_DESIGN §4). The table there is generated from these formulas. */

export const TIER_COUNT = 15;
export const MIN_TIER = 1;
export const MAX_TIER = TIER_COUNT;

/** r(t) = round(BASE × GROWTH^(t−1)) in world units. */
export const TIER_BASE_RADIUS = 27;
export const TIER_RADIUS_GROWTH = 1.22;

/** S(t) = SCORE_BASE^t. */
export const TIER_SCORE_BASE = 2;

/** C(t) = round(COIN_BASE^(t−1)). */
export const TIER_COIN_BASE = 1.7;

export interface TierInfo {
  readonly tier: number;
  /** World units (the stage-1 jar is 600 wide). */
  readonly radius: number;
  /** Score paid when two cats of this tier merge. */
  readonly score: number;
  /** Base coins paid when two cats of this tier merge (before multipliers). */
  readonly coins: number;
}

export function isTier(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_TIER && value <= MAX_TIER;
}

export function tierRadius(tier: number): number {
  return Math.round(TIER_BASE_RADIUS * TIER_RADIUS_GROWTH ** (tier - 1));
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
  return { tier, radius: tierRadius(tier), score: tierScore(tier), coins: tierCoins(tier) };
});

export function tierInfo(tier: number): TierInfo {
  const info = isTier(tier) ? TIERS[tier - 1] : undefined;
  if (!info) throw new RangeError(`Unknown tier: ${tier}`);
  return info;
}
