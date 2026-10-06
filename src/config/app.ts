/** App-wide constants. Rename the game here (the PWA manifest reads these too). */
export const APP_NAME = 'Maneki Merge';
export const APP_SHORT_NAME = 'Maneki';
export const APP_DESCRIPTION =
  'Lucky-cat merge game with a growing jar. Offline PWA for iOS and Android.';

/** Prefix for every storage key; the github.io origin is shared with other Pages sites. */
export const STORAGE_PREFIX = 'maneki-merge:';

/** The save lives under one key as `{ version, data }` (TECH_SPEC §8). */
export const SAVE_KEY = `${STORAGE_PREFIX}save`;
/** Unreadable or repaired saves are copied to `<prefix><timestamp>` before being replaced. */
export const SAVE_BACKUP_PREFIX = `${STORAGE_PREFIX}save:corrupt:`;
/** Only the newest backups are kept, so a save that keeps breaking can't fill the storage. */
export const SAVE_BACKUP_LIMIT = 3;

/** First-run hints (GAME_DESIGN §2.3); the save remembers which ones were seen. */
export const HINT_IDS = ['aim', 'merge'] as const;
export type HintId = (typeof HINT_IDS)[number];

/** Browser chrome and splash colors (manifest, theme-color meta). Match --color-bg in CSS. */
export const THEME_COLOR = '#fcefdf';
export const BACKGROUND_COLOR = '#fcefdf';

/** Coin and record changes are written to storage at most once per this interval (TECH_SPEC §8). */
export const SAVE_THROTTLE_MS = 1000;
