/** `prefers-reduced-motion` (GAME_DESIGN §12): no shake and fewer particles. Read live. */
let query: MediaQueryList | null | undefined;

export function reducedMotion(): boolean {
  if (query === undefined) {
    query =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
  }
  return query?.matches ?? false;
}
