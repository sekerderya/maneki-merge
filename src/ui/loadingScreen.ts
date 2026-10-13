import { LOADING_BAR_ART, LOADING_FILL_ART, LOADING_SPRITE_DIR } from '../config/loadingSprites';
import { LOADING_FADE_MS } from '../config/platform';
import { reducedMotion } from '../platform';

export type LoadingStatus = 'loading' | 'updating';

const LABELS: Record<LoadingStatus, string> = {
  loading: 'Loading…',
  updating: 'Updating…',
};

export interface LoadingScreen {
  /** Fills the bar to `share` (0–1) of the images loaded. */
  setProgress(share: number): void;
  /** What is going on, written under the bar ("Loading…" until told otherwise). */
  setStatus(status: LoadingStatus): void;
  /** The font is in: the label shows from now on (so it never changes face). */
  fontsReady(): void;
  /** Fades the screen out over the game and removes it. */
  hide(): void;
}

/**
 * The loading screen (GAME_DESIGN §2.0). index.html draws and styles it, so it shows before the
 * scripts arrive; boot fills its bar while every image loads, says when a new version installs
 * (TECH_SPEC §9) and fades it out once the menu (or a saved run) is ready under it.
 */
export function loadingScreen(): LoadingScreen {
  const root = document.getElementById('loading');
  const label = root?.querySelector('.loading-label');
  const bar = root?.querySelector<HTMLElement>('.loading-bar');
  if (bar) setBarArt(bar);
  let shown = 0;
  let status: LoadingStatus = 'loading';
  let fonts = false;
  const write = (): void => {
    if (label && fonts) label.textContent = LABELS[status];
  };
  return {
    setProgress: (share) => {
      // Images settle in any order; the bar only moves forward.
      shown = Math.max(shown, Math.min(1, share));
      root?.style.setProperty('--progress', String(shown));
      root?.setAttribute('aria-valuenow', String(Math.round(shown * 100)));
    },
    setStatus: (next) => {
      status = next;
      write();
    },
    fontsReady: () => {
      fonts = true;
      write();
    },
    hide: () => {
      if (!root) return;
      const fade = reducedMotion() ? 0 : LOADING_FADE_MS;
      root.style.transitionDuration = `${fade}ms`;
      root.classList.add('is-done');
      window.setTimeout(() => root.remove(), fade);
    },
  };
}

/** The bar's art and three-slice caps (index.html lays them out in source pixels). */
function setBarArt(bar: HTMLElement): void {
  const set = (name: string, value: string | number): void =>
    bar.style.setProperty(name, String(value));
  const url = (file: string): string =>
    `url("${import.meta.env.BASE_URL}${LOADING_SPRITE_DIR}${file}")`;
  set('--bar-art', url(LOADING_BAR_ART.file));
  set('--bar-h', LOADING_BAR_ART.height);
  set('--bar-left', LOADING_BAR_ART.left);
  set('--bar-right', LOADING_BAR_ART.right);
  set('--fill-art', url(LOADING_FILL_ART.file));
  set('--fill-x', LOADING_FILL_ART.x);
  set('--fill-y', LOADING_FILL_ART.y);
  set('--fill-h', LOADING_FILL_ART.height);
  set('--fill-left', LOADING_FILL_ART.left);
  set('--fill-right', LOADING_FILL_ART.right);
  bar.classList.add('is-art');
}
