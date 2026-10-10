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
 * settles, then pops), then, when the jar grows, a hold in the empty jar while "Stage clear!"
 * finishes and slides away (it shows 1.5 + 0.5 s, config/view.ts), the growth clouds (the phase
 * is still called `zoom`; the camera zoomed until v0.33.3), and the reveal; the picks come after it (v0.33.2, the owner's call: the shrine grows
 * right after the clear, before the doors). The whole sequence lasts EXPANSION_DURATION_MS. A
 * clear that doesn't grow the jar ends with the picks after EXPANSION_CLEAR_MS.
 */
export const EXPANSION_CLEAR_MS = 500;
export const EXPANSION_HOLD_MS = 1500;
/** The growth clouds' whole transition (config/view.ts, CLOUD_*): they come and part. */
export const EXPANSION_ZOOM_MS = 2050;
/**
 * After the clouds the new place shows on its own this long before the doors come for the picks
 * (v0.33.4, the owner's call: 1.5 s more than v0.33.3).
 */
export const EXPANSION_REVEAL_MS = 1500;
/** The zoom starts this long after the last cat is made. */
export const EXPANSION_ZOOM_START_MS = EXPANSION_CLEAR_MS + EXPANSION_HOLD_MS;
export const EXPANSION_DURATION_MS =
  EXPANSION_ZOOM_START_MS + EXPANSION_ZOOM_MS + EXPANSION_REVEAL_MS;

/**
 * The magnet's catch (GAME_DESIGN §15.2): the taken ball flies up into the paw, and can be dropped
 * this long after.
 */
export const MAGNET_TAKE_MS = 250;
