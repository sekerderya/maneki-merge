/** Platform and shell tunables (no game rules here). */

/** How long boot waits for the bundled font before rendering anyway. */
export const FONT_LOAD_TIMEOUT_MS = 1500;

/**
 * A touch device in landscape whose viewport is at most this tall counts as a phone
 * and gets the rotate overlay. Tablets in landscape stay playable.
 */
export const PHONE_LANDSCAPE_MAX_HEIGHT_PX = 540;

/** How often a long-running app session asks the server for a new service worker. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Haptics (Android only, GAME_DESIGN §12): vibration patterns in milliseconds (on, off, on, …).
 * A light tick per merge, at most one every HAPTIC_TICK_INTERVAL_MS; a stronger pattern for
 * Jackpots, expansions and Lucky Saves.
 */
export const HAPTIC_PATTERNS = {
  tick: [12],
  jackpot: [35, 45, 35, 45, 80],
  expansion: [25, 60, 50],
  luckySave: [40, 50, 40],
} as const;
export type HapticPattern = keyof typeof HAPTIC_PATTERNS;
export const HAPTIC_TICK_INTERVAL_MS = 70;
