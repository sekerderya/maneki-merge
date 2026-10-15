/**
 * The debug panel's choices that outlive a reload (the ads to use, the EEA consent test), kept on
 * the device as a query string under `DEBUG_FLAGS_KEY`. The app has no address bar to type flags
 * into; `core/urlFlags.ts` `bootFlags` reads them, only with debug on.
 */
import { DEBUG_FLAGS_KEY } from '../config/app';
import { withFlag } from '../core/urlFlags';

/** The stored flags, or none when storage is blocked. */
export function readStoredFlags(): string {
  try {
    return window.localStorage.getItem(DEBUG_FLAGS_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Sets one stored flag, or removes it with null. */
export function storeFlag(key: string, value: string | null): void {
  try {
    const flags = withFlag(readStoredFlags(), key, value);
    if (flags) window.localStorage.setItem(DEBUG_FLAGS_KEY, flags);
    else window.localStorage.removeItem(DEBUG_FLAGS_KEY);
  } catch {
    // Blocked storage: the choice lasts until the reload only.
  }
}
