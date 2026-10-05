/**
 * Mobile viewport hardening (TECH_SPEC §10):
 * - `--app-height` tracks the visible height (fallback for browsers without `dvh`, and the
 *   iOS toolbar/keyboard dance), and the page is kept scrolled to the top.
 * - No pinch zoom (iOS ignores `user-scalable=no`), no double-tap zoom, no long-press menu.
 * - No rubber-band scrolling, except inside elements marked `data-scrollable`.
 */
export function setupViewport(): void {
  const root = document.documentElement;

  const syncHeight = (): void => {
    const height = window.visualViewport?.height ?? window.innerHeight;
    root.style.setProperty('--app-height', `${Math.round(height)}px`);
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  };
  syncHeight();
  window.addEventListener('resize', syncHeight);
  window.addEventListener('orientationchange', syncHeight);
  window.visualViewport?.addEventListener('resize', syncHeight);

  const prevent = (event: Event): void => event.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu']) {
    document.addEventListener(type, prevent, { passive: false });
  }

  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('[data-scrollable]')) event.preventDefault();
    },
    { passive: false },
  );
}
