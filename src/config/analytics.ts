/**
 * Play statistics (TECH_SPEC §17, GAME_DESIGN §2.8): GameAnalytics (both builds), Firebase
 * Analytics (the web app and the Android app) and Firebase Crashlytics (the Android app). Nothing
 * is sent before the player says yes on the statistics card or in Settings.
 */

/** The one currency GameAnalytics' resource events name. */
export const ANALYTICS_CURRENCY = 'coins';

/**
 * Where a run's coins come from (GameAnalytics' resource item types): merges and Jackpots, single
 * cats popping into coins (a stage clear, a Lucky Save, a hanabi, lightning, a katana, a frog), a
 * Lucky gift, and Game Over's Double coins ad.
 */
export const COIN_SOURCES = ['merge', 'pop', 'gift', 'ad'] as const;
export type CoinSource = (typeof COIN_SOURCES)[number];

/** Every item type GameAnalytics is told about: the sources, and the shop's upgrades (the sink). */
export const ANALYTICS_ITEM_TYPES = [...COIN_SOURCES, 'upgrade'] as const;

/**
 * Events kept while the player hasn't answered the statistics card yet (errors at boot, the first
 * screen): sent if the answer is yes, dropped if it is no. The oldest go first past this many.
 */
export const ANALYTICS_PENDING_MAX = 50;

/** Errors sent per launch at most; the same message is sent once. */
export const ANALYTICS_ERRORS_PER_LAUNCH = 10;

/** An error's message is cut to this many characters. */
export const ANALYTICS_ERROR_MESSAGE_MAX = 300;

/** Stack frames sent with an error at most. */
export const ANALYTICS_STACK_FRAMES_MAX = 20;

/** How often the frame rate is sampled while a stage is played (only while it runs and shows). */
export const FPS_SAMPLE_MS = 2000;

/** Progression names pad the stage number to this many digits (`stage01`), so they sort. */
export const STAGE_LABEL_DIGITS = 2;
