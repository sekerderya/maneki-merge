/**
 * The camera cutout at launch (TECH_SPEC §10). The installed app runs in display-mode fullscreen
 * with `viewport-fit=cover`, so Chrome should lay it out into the cutout at the top of the screen.
 * On the owner's phone (v0.42.15) it didn't at launch: a black band the cutout's height stayed over
 * the top until the system bars were swiped in and out once. Chrome's `DisplayCutoutController`
 * chooses the window's cutout mode when the page reports its viewport-fit, and forces the default
 * mode (no cutout: the band) while the tab isn't interactable yet; it only chooses again when the
 * page reports a viewport-fit, the page enters fullscreen or the browser asks (the bars' swipe).
 * So once the app is up and the band is there, the viewport meta takes `viewport-fit=cover` off
 * and puts it back two frames later: Chrome hears cover again and lays the app into the cutout.
 * Only on Android in display-mode fullscreen, only while the app is shorter than the screen, and at
 * most CUTOUT_NUDGE_ATTEMPTS times per launch.
 */
import { CUTOUT_BAND_MIN_PX, CUTOUT_NUDGE_ATTEMPTS } from '../config/platform';

export interface CutoutEnvironment {
  readonly android: boolean;
  /** `(display-mode: fullscreen)` matches: the installed app with the bars hidden. */
  readonly fullscreen: boolean;
  /** `screen.height` and `window.innerHeight`, CSS px. */
  readonly screenHeight: number;
  readonly viewportHeight: number;
}

/** Whether the app is likely kept out of the cutout: full screen, yet shorter than the screen. */
export function cutoutBandLikely(env: CutoutEnvironment): boolean {
  return (
    env.android && env.fullscreen && env.screenHeight - env.viewportHeight > CUTOUT_BAND_MIN_PX
  );
}

/**
 * Watches for the band after the page has loaded and whenever the app comes back to the screen.
 * Returns a check to run again once boot is done (the loading screen gone).
 */
export function watchDisplayCutout(): () => void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const android = /android/i.test(navigator.userAgent);
  const fullscreen = window.matchMedia('(display-mode: fullscreen)');
  let attempts = 0;

  const check = (): void => {
    if (!meta || attempts >= CUTOUT_NUDGE_ATTEMPTS) return;
    const env: CutoutEnvironment = {
      android,
      fullscreen: fullscreen.matches,
      screenHeight: window.screen.height,
      viewportHeight: window.innerHeight,
    };
    if (!cutoutBandLikely(env)) return;
    const content = meta.content;
    const without = content.replace(/,?\s*viewport-fit=cover/, '');
    if (without === content) return;
    attempts++;
    meta.content = without;
    afterFrames(2, () => {
      meta.content = content;
    });
  };
  const soon = (): void => afterFrames(2, check);

  if (document.readyState === 'complete') soon();
  else window.addEventListener('load', soon, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') soon();
  });
  return soon;
}

function afterFrames(count: number, run: () => void): void {
  if (count <= 0) {
    run();
    return;
  }
  requestAnimationFrame(() => afterFrames(count - 1, run));
}
