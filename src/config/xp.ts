/**
 * The run's XP and levels (GAME_DESIGN §15.6). Merges give XP by the size of the cat they make, a
 * combo adds to it, and every level up offers a blessing. Each level needs more XP than the last.
 * Derived values: core/xp.ts.
 */

/** A run starts at this level, with no XP. */
export const XP_START_LEVEL = 1;
/** XP from the first level to the second; each later level needs XP_LEVEL_GROWTH times more. */
export const XP_FIRST_LEVEL = 100;
export const XP_LEVEL_GROWTH = 1.4;

/** Each combo step past the first adds this share of a merge's XP, for up to XP_COMBO_MAX_STEPS. */
export const XP_COMBO_STEP = 0.25;
export const XP_COMBO_MAX_STEPS = 4;

/** A Jackpot gives the XP of this many merges into the stage's last cat. */
export const XP_JACKPOT_MERGES = 2;
