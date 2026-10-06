/** Score and coin rules (GAME_DESIGN §5, §6, §9). */

/** A Jackpot (two of a stage's last cat) pays these multiples of that tier's S(t) and C(t). */
export const JACKPOT_SCORE_MULTIPLIER = 2;
export const JACKPOT_COIN_MULTIPLIER = 5;

/**
 * A cat's value: what it pays when it pops (stage clear, Lucky Save) is this share of what
 * merging two of its tier pays, C(t). Two cats that pop pay as much as their merge would.
 */
export const POP_VALUE_SHARE = 0.5;

/** A golden merge (Golden Merge upgrade, GAME_DESIGN §5) pays this many times the coins. */
export const GOLDEN_COIN_MULTIPLIER = 3;

/** Every payout pays at least this much. */
export const MIN_COIN_PAYOUT = 1;

/** Combo Charm counts at most this many combo steps (combo − 1). */
export const COMBO_BONUS_MAX_STEPS = 5;

/** "Combo ×N" shows from this N. */
export const COMBO_BANNER_MIN = 2;

/** A Lucky Save pops every cat over the line plus this many of the smallest cats. */
export const LUCKY_SAVE_SMALLEST_POPS = 6;

/** Numbers from this value up use the short format (12.5K, 3.2M). */
export const SHORT_NUMBER_FROM = 10_000;
