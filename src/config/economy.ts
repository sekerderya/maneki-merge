/** Score and coin rules (GAME_DESIGN §5, §6, §9). */

/**
 * Score grows this much per stage (GAME_DESIGN §4, v0.36): merging two size-s cats at stage n
 * scores 2^s × SCORE_STAGE_GROWTH^(n−1), about 5 million in all by the time stage 30 is cleared
 * (the owner's target). Until v0.36 a merge scored 2^tier, 512× more every stage. Calibrated with
 * the balance bot: a maxed profile scores ~2,500 by its first clear, ~4.9 million over 30 stages.
 */
export const SCORE_STAGE_GROWTH = 1.225;

/**
 * Every combo step (combo − 1, at most COMBO_BONUS_MAX_STEPS) adds this share of a merge's score,
 * for every player (GAME_DESIGN §5): ×1.5 at most. Combo Charm adds coins on top.
 */
export const SCORE_COMBO_PER_STEP = 0.1;

/*
 * Coins: merging two size-s cats pays round(1.7^(s−1)) times the jar's number (stageJar, config/
 * stages.ts): ×1 in stages 1–5, ×2 in 6–10, and so on (GAME_DESIGN §4, v0.36).
 */

/** A Jackpot (two of a stage's last cat) pays these multiples of that tier's S(t) and C(t). */
export const JACKPOT_SCORE_MULTIPLIER = 2;
export const JACKPOT_COIN_MULTIPLIER = 5;

/**
 * Hubris (GAME_DESIGN §15.11): a three-way merge pays like a merge of its cats' size times this
 * (three cats instead of two; a starting value, the economy comes later).
 */
export const THREE_WAY_PAYOUT = 1.5;

/**
 * A cat's value: what it pays when it pops (stage clear, Lucky Save) is this share of what
 * merging two of its tier pays, C(t). Two cats that pop pay as much as their merge would.
 */
export const POP_VALUE_SHARE = 0.5;

/** Every payout pays at least this much. */
export const MIN_COIN_PAYOUT = 1;

/** Combo Charm and the combo's score bonus count at most this many combo steps (combo − 1). */
export const COMBO_BONUS_MAX_STEPS = 5;

/** "Combo ×N" shows from this N. */
export const COMBO_BANNER_MIN = 2;

/** A Lucky Save pops every cat over the line plus this many of the smallest cats. */
export const LUCKY_SAVE_SMALLEST_POPS = 6;

/** Numbers from this value up use the short format (12.5K, 3.2M). */
export const SHORT_NUMBER_FROM = 10_000;
