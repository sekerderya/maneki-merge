/** Platform and shell tunables (no game rules here). */

/**
 * In the installed app, the viewport getting at most this much shorter (CSS px) is Android's
 * system bars swiped in over the game: the app keeps its full height meanwhile (platform/appHeight.ts).
 * The status and navigation bars together are about 100 px; a split screen takes far more.
 */
export const TRANSIENT_BARS_MAX_PX = 200;

/**
 * The camera cutout at launch (platform/displayCutout.ts): the installed app being more than this
 * (CSS px) shorter than the screen in display-mode fullscreen means Chrome kept it out of the
 * cutout. It then reports its viewport-fit again, at most this many times per launch, once more
 * this long after boot.
 */
export const CUTOUT_BAND_MIN_PX = 8;
export const CUTOUT_NUDGE_ATTEMPTS = 3;
export const CUTOUT_RECHECK_MS = 2000;

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
 * How long the menu must stay idle before a waiting update is applied. Leaving a run calls
 * `history.back()`; Chromium never activates a worker told to skip waiting while that traversal
 * is pending, so the update would hang until the next launch.
 */
export const UPDATE_APPLY_DELAY_MS = 1000;

/**
 * The loading screen (TECH_SPEC §9) asks the server for a new version and waits at most this long
 * for the answer (it runs beside the art's loading, so usually it adds nothing).
 */
export const UPDATE_LAUNCH_CHECK_MS = 3000;
/** How long the loading screen lets a new version found at launch install ("Updating…"). */
export const UPDATE_LAUNCH_INSTALL_MS = 20_000;
/**
 * How long the loading screen waits for an installed version to take over and reload the app;
 * past this the game opens and the menu applies it as before.
 */
export const UPDATE_LAUNCH_APPLY_MS = 5000;

/** The loading screen fades out over this long once the game is ready. */
export const LOADING_FADE_MS = 300;
/** Every image is loaded and decoded on the loading screen; one that takes longer is skipped. */
export const PRELOAD_TIMEOUT_MS = 10_000;

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
