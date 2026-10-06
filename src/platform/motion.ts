/**
 * Reduced motion (GAME_DESIGN §12): the phone's `prefers-reduced-motion` or the game's own
 * "Reduce motion" setting. With either: no camera shake, fewer particles, one flying coin, and the
 * `reduce-motion` class on <html> so CSS stops its decorative animations. Read live.
 */
let query: MediaQueryList | null | undefined;
let setting = false;

function systemPrefers(): boolean {
  if (query === undefined) {
    query =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    query?.addEventListener('change', applyClass);
  }
  return query?.matches ?? false;
}

export function reducedMotion(): boolean {
  return setting || systemPrefers();
}

/** The in-game setting; the phone's preference still applies when it is off. */
export function setReduceMotion(on: boolean): void {
  setting = on;
  applyClass();
}

function applyClass(): void {
  document.documentElement.classList.toggle('reduce-motion', reducedMotion());
}
