import { TRANSIENT_BARS_MAX_PX } from '../config/platform';
import { AppHeight } from './appHeight';
import { readInstallEnvironment } from './installContext';

/**
 * Mobile viewport hardening (TECH_SPEC §10):
 * - `--app-height` tracks the visible height (fallback for browsers without `dvh`, and the
 *   iOS toolbar/keyboard dance), and the page is kept scrolled to the top. In the installed app
 *   it keeps the full height while Android's system bars are swiped in (platform/appHeight.ts).
 * - No pinch zoom (iOS ignores `user-scalable=no`), no double-tap zoom, no long-press menu.
 * - No rubber-band scrolling, except inside elements marked `data-scrollable`.
 */
export function setupViewport(): void {
  const root = document.documentElement;
  const installed = readInstallEnvironment().standalone;
  const appHeight = new AppHeight(TRANSIENT_BARS_MAX_PX);

  const syncHeight = (): void => {
    const visible = window.visualViewport?.height ?? window.innerHeight;
    const height = appHeight.update(window.innerWidth, visible, installed);
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
