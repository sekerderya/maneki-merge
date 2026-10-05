import { PHONE_LANDSCAPE_MAX_HEIGHT_PX } from '../config/platform';

/** A phone held sideways: touch-first, landscape and short. Tablets and desktops don't match. */
export const PHONE_LANDSCAPE_QUERY = `(orientation: landscape) and (pointer: coarse) and (max-height: ${PHONE_LANDSCAPE_MAX_HEIGHT_PX}px)`;

/**
 * Calls `onChange(true)` while the phone is in landscape (the rotate overlay shows and the run
 * pauses) and `onChange(false)` when it is back in portrait. Fires once immediately.
 */
export function watchPhoneLandscape(onChange: (landscape: boolean) => void): () => void {
  const query = window.matchMedia(PHONE_LANDSCAPE_QUERY);
  const listener = (): void => onChange(query.matches);
  query.addEventListener('change', listener);
  listener();
  return () => query.removeEventListener('change', listener);
}
