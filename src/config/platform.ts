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
