import { MAX_RENDER_RESOLUTION } from '../config/view';

/** Skins that `?skin=` may force: `art` is the default, `vector` the code-drawn cats of v0.11–v0.15. */
export const SKIN_IDS = ['placeholder', 'vector', 'art'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

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
  };
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
