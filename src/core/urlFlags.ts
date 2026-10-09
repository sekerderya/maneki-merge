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
  };
}

function parseBoolean(value: string | null): boolean {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === '';
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

function parseSkin(value: string | null): SkinId | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return (SKIN_IDS as readonly string[]).includes(normalized) ? (normalized as SkinId) : null;
}
