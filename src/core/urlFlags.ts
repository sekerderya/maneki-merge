import { DEV_APP_FLAGS } from '../config/ads';
import { TIMES_OF_DAY } from '../config/timeOfDay';
import type { TimeOfDay } from '../config/timeOfDay';
import { MAX_RENDER_RESOLUTION } from '../config/view';

/** Skins that `?skin=` may force: `art` is the default, `vector` the code-drawn cats of v0.11–v0.15. */
export const SKIN_IDS = ['placeholder', 'vector', 'art'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

/**
 * What `?ads=` may force (TECH_SPEC §16): `fake`, a test ad the page draws itself (any build);
 * `admob`, Google's test ads through AdMob (the Android app only, its default).
 */
export const AD_MODES = ['fake', 'admob'] as const;
export type AdMode = (typeof AD_MODES)[number];

export interface UrlFlags {
  /** `?debug=1` (or `true`): debug panel and `window.__game` hooks. */
  readonly debug: boolean;
  /** `?seed=<n>`: a deterministic run. An unsigned 32-bit integer, or null when absent/invalid. */
  readonly seed: number | null;
  /** `?skin=<id>`: forces a ball skin, or null for the default. */
  readonly skin: SkinId | null;
  /**
   * `?res=<n>`: renders the canvas at most n device pixels per CSS pixel (0.5 to
   * MAX_RENDER_RESOLUTION) and turns the adaptive resolution off, to see what a slow phone gets.
   * Null when absent or invalid.
   */
  readonly resolution: number | null;
  /**
   * `?gravity=<n>`: every run's gravity is n times GRAVITY_BASE (MIN_GRAVITY_SCALE to
   * MAX_GRAVITY_SCALE), to try fall speeds on a phone. Null when absent or invalid.
   */
  readonly gravity: number | null;
  /**
   * `?interp=0` (or `false`) draws the balls where the latest physics step left them instead
   * of between the last two (TECH_SPEC §5), to compare the two on a phone. True by default.
   */
  readonly interpolate: boolean;
  /**
   * `?scenes=1` turns the menu's Scenes button on (GAME_DESIGN §2.6) and `?scenes=0` off; the
   * device remembers it. Null when absent or malformed.
   */
  readonly scenes: boolean | null;
  /**
   * `?time=day|sunset|night` shows the gardens at that time of day whatever the clock and the
   * setting say (GAME_DESIGN §7.3). Null when absent or unknown.
   */
  readonly time: TimeOfDay | null;
  /** `?ads=fake|admob` (TECH_SPEC §16). Null when absent or unknown: the build's own ads. */
  readonly ads: AdMode | null;
  /**
   * `?consent=eea`: AdMob's consent check answers as in the EEA, so the form shows (on a test
   * device). Null when absent or unknown.
   */
  readonly consent: 'eea' | null;
  /**
   * `?analytics=fake` (TECH_SPEC §17): the play statistics keep their events on the page instead
   * of sending them (the debug panel, Playwright), and the statistics card asks as with keys. Null
   * when absent or unknown: the build's own services.
   */
  readonly analytics: 'fake' | null;
}

const MAX_SEED = 0xffffffff;

/** Parses the query string (with or without the leading `?`). Unknown or malformed values are ignored. */
export function parseUrlFlags(search: string): UrlFlags {
  const params = new URLSearchParams(search);
  return {
    debug: parseBoolean(params.get('debug')),
    seed: parseSeed(params.get('seed')),
    skin: parseSkin(params.get('skin')),
    resolution: parseResolution(params.get('res')),
    gravity: parseGravity(params.get('gravity')),
    interpolate: !parseOff(params.get('interp')),
    scenes: parseSwitch(params.get('scenes')),
    time: parseTime(params.get('time')),
    ads: parseChoice(params.get('ads'), AD_MODES),
    consent: parseChoice(params.get('consent'), ['eea'] as const),
    analytics: parseChoice(params.get('analytics'), ['fake'] as const),
  };
}

/**
 * The flags the game boots with, the one place they are read (TECH_SPEC §11): the page's query
 * string, then the dev app's `DEV_APP_FLAGS` (it has no address bar). With debug on, the debug
 * panel's choices stored on the device (`stored`, a query string) come between the two. An
 * earlier source wins a flag.
 */
export function bootFlags(search: string, stored: string, devApp: boolean): UrlFlags {
  const dev = devApp ? DEV_APP_FLAGS : '';
  const plain = mergeSearch(search, dev);
  return parseUrlFlags(parseUrlFlags(plain).debug ? mergeSearch(search, stored, dev) : plain);
}

/** One query string from several; the first one that has a flag gives its value. */
export function mergeSearch(...searches: readonly string[]): string {
  const merged = new URLSearchParams();
  for (const search of searches) {
    for (const [key, value] of new URLSearchParams(search)) {
      if (!merged.has(key)) merged.set(key, value);
    }
  }
  return merged.toString();
}

/** `search` with `key` set to `value`, or removed when `value` is null. */
export function withFlag(search: string, key: string, value: string | null): string {
  const params = new URLSearchParams(search);
  if (value === null) params.delete(key);
  else params.set(key, value);
  return params.toString();
}

function parseBoolean(value: string | null): boolean {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === '';
}

function parseOff(value: string | null): boolean {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '0' || normalized === 'false';
}

/** `1`/`true` (or a bare flag) is on, `0`/`false` off; anything else, or absent, null. */
function parseSwitch(value: string | null): boolean | null {
  if (value === null) return null;
  if (parseBoolean(value)) return true;
  return parseOff(value) ? false : null;
}

function parseSeed(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value.trim())) return null;
  const seed = Number(value.trim());
  return Number.isSafeInteger(seed) && seed <= MAX_SEED ? seed : null;
}

const MIN_RESOLUTION = 0.5;

function parseResolution(value: string | null): number | null {
  if (value === null || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const resolution = Number(value.trim());
  return resolution >= MIN_RESOLUTION && resolution <= MAX_RENDER_RESOLUTION ? resolution : null;
}

/** How far `?gravity=` may scale the gravity, to try fall speeds on a phone. */
const MIN_GRAVITY_SCALE = 0.5;
const MAX_GRAVITY_SCALE = 2;

function parseGravity(value: string | null): number | null {
  if (value === null || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const scale = Number(value.trim());
  return scale >= MIN_GRAVITY_SCALE && scale <= MAX_GRAVITY_SCALE ? scale : null;
}

function parseSkin(value: string | null): SkinId | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return (SKIN_IDS as readonly string[]).includes(normalized) ? (normalized as SkinId) : null;
}

function parseChoice<T extends string>(value: string | null, choices: readonly T[]): T | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return (choices as readonly string[]).includes(normalized) ? (normalized as T) : null;
}

function parseTime(value: string | null): TimeOfDay | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return (TIMES_OF_DAY as readonly string[]).includes(normalized)
    ? (normalized as TimeOfDay)
    : null;
}
