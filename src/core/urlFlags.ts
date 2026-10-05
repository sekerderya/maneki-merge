/** Skins that `?skin=` may force. `art` arrives with the final art in M13. */
export const SKIN_IDS = ['placeholder', 'art'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export interface UrlFlags {
  /** `?debug=1` (or `true`): debug panel and `window.__game` hooks. */
  readonly debug: boolean;
  /** `?seed=<n>`: a deterministic run. An unsigned 32-bit integer, or null when absent/invalid. */
  readonly seed: number | null;
  /** `?skin=<id>`: forces a ball skin, or null for the default. */
  readonly skin: SkinId | null;
}

const MAX_SEED = 0xffffffff;

/** Parses the query string (with or without the leading `?`). Unknown or malformed values are ignored. */
export function parseUrlFlags(search: string): UrlFlags {
  const params = new URLSearchParams(search);
  return {
    debug: parseBoolean(params.get('debug')),
    seed: parseSeed(params.get('seed')),
    skin: parseSkin(params.get('skin')),
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

function parseSkin(value: string | null): SkinId | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return (SKIN_IDS as readonly string[]).includes(normalized) ? (normalized as SkinId) : null;
}
