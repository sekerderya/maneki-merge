/** Game timings in milliseconds (GAME_DESIGN §3, §5, §6, §7.1). */

/** After a drop, the next cat appears after this; releases in between are ignored. */
export const DROP_COOLDOWN_MS = 450;

/** A merge within this time of the previous one raises the combo. */
export const COMBO_WINDOW_MS = 1000;

/** A merged cat grows from the old size to the new one over this time. */
export const MERGE_GROW_MS = 120;

/** A cat is ignored by the danger check until this long after it first touches something. */
export const LANDING_GRACE_MS = 500;

/** A cat over the line for this long, continuously, ends the run. */
export const DANGER_TIMEOUT_MS = 2500;

/** After a Lucky Save the danger check is off for this long. */
export const LUCKY_SAVE_GRACE_MS = 2000;

/**
 * The expansion sequence (GAME_DESIGN §7.1): the stage clear (the other cats pop and the last cat
 * settles), then the camera zoom with the wall slide, then the reveal. The whole sequence lasts
 * EXPANSION_DURATION_MS.
 */
export const EXPANSION_CLEAR_MS = 500;
export const EXPANSION_ZOOM_MS = 1200;
export const EXPANSION_REVEAL_MS = 400;
export const EXPANSION_DURATION_MS = EXPANSION_CLEAR_MS + EXPANSION_ZOOM_MS + EXPANSION_REVEAL_MS;

/**
 * The magnet's catch (GAME_DESIGN §15.2): the taken ball flies up into the paw, and can be dropped
 * this long after.
 */
export const MAGNET_TAKE_MS = 250;
