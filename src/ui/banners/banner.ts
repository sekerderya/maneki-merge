import { BANNER_MS, TOAST_MS } from '../../config/view';
import { catIcon } from '../catIcon';
import { el } from '../dom';

export interface BannerOptions {
  /** Cat icons shown under the text (e.g. the tiers "New cats unlocked!" announces). */
  readonly tiers?: readonly number[];
  readonly durationMs?: number;
  /** Where the banner's centre goes, in CSS pixels from the top of the play area. */
  readonly y?: number | undefined;
}

export interface BannerView {
  /** A big banner over the jar (GAME_DESIGN §2.3). It replaces the one showing. */
  show(text: string, options?: BannerOptions): void;
  /** A smaller message at the top of the play area, e.g. "Expansion locked". */
  toast(text: string, durationMs?: number): void;
  /** Freezes banners where they are while the run is paused, so none ends unseen. */
  setPaused(paused: boolean): void;
  clear(): void;
}

/**
 * Short banners and toasts over the play area. They never block input, and each one runs a single
 * CSS animation (pop in, hold, fade out) and removes itself when it ends, so pausing the
 * animation pauses the banner's whole life.
 */
export function createBanners(root: HTMLElement): BannerView {
  const layer = el('div', 'banners');
  root.append(layer);
  let banner: HTMLElement | null = null;
  let toast: HTMLElement | null = null;

  const mount = (node: HTMLElement, durationMs: number, previous: HTMLElement | null) => {
    previous?.remove();
    node.style.animationDuration = `${durationMs}ms`;
    node.addEventListener('animationend', (event) => {
      if (event.target === node) node.remove();
    });
    layer.append(node);
    return node;
  };

  return {
    show(text, options = {}) {
      const node = el('div', 'banner');
      node.dataset['testid'] = 'banner';
      node.setAttribute('role', 'status');
      node.append(el('p', 'banner-text', text));
      if (options.tiers && options.tiers.length > 0) {
        const cats = el('div', 'banner-cats');
        for (const tier of options.tiers) cats.append(catIcon(tier, false));
        node.append(cats);
      }
      if (options.y !== undefined) node.style.top = `${Math.round(options.y)}px`;
      banner = mount(node, options.durationMs ?? BANNER_MS, banner);
    },
    toast(text, durationMs = TOAST_MS) {
      const node = el('p', 'toast', text);
      node.dataset['testid'] = 'toast';
      node.setAttribute('role', 'status');
      toast = mount(node, durationMs, toast);
    },
    setPaused(paused) {
      layer.classList.toggle('is-paused', paused);
    },
    clear() {
      banner?.remove();
      toast?.remove();
      banner = null;
      toast = null;
      layer.classList.remove('is-paused');
    },
  };
}
