import { BANNER_MS, COMBO_HEAT_LEVELS } from '../../config/view';
import { formatNumber } from '../../core/format';
import { catIcon } from '../catIcon';
import { el } from '../dom';
import { ICON_COIN } from '../icons';

export interface BannerOptions {
  /** Cat icons shown under the text (e.g. the tiers "New cats unlocked!" announces). */
  readonly tiers?: readonly number[];
  readonly durationMs?: number;
  /** A smaller line under the text, e.g. "1 left" for a Lucky Save. */
  readonly detail?: string | undefined;
  /** Coins shown under the text with a coin icon, e.g. a Jackpot's payout. */
  readonly coins?: number;
  /** 'jackpot' makes the banner bigger and brighter. */
  readonly tone?: 'jackpot';
  /** Where the banner's centre goes, in CSS pixels from the top of the play area. */
  readonly y?: number | undefined;
}

export interface BannerView {
  /** A big banner over the jar (GAME_DESIGN §2.3). It replaces the one showing. */
  show(text: string, options?: BannerOptions): void;
  /**
   * "Combo ×N" (GAME_DESIGN §5) with the Combo Charm bonus when there is one (0.16 → "+16%").
   * Each step pops it again; a count of 0 fades it out. `y` as for banners.
   */
  combo(count: number, bonus: number, y?: number): void;
  /** Freezes banners where they are while the run is paused, so none ends unseen. */
  setPaused(paused: boolean): void;
  clear(): void;
}

/**
 * Short banners over the play area. They never block input, and each one runs a single
 * CSS animation (pop in, hold, fade out) and removes itself when it ends, so pausing the
 * animation pauses the banner's whole life.
 */
export function createBanners(root: HTMLElement): BannerView {
  const layer = el('div', 'banners');
  root.append(layer);
  let banner: HTMLElement | null = null;

  // The combo label is one node that stays, and pops again with every step.
  const combo = el('div', 'combo');
  combo.dataset['testid'] = 'combo';
  combo.setAttribute('role', 'status');
  const comboText = el('span', 'combo-text');
  const comboBonus = el('span', 'combo-bonus');
  combo.append(comboText, comboBonus);
  combo.hidden = true;
  layer.append(combo);
  combo.addEventListener('animationend', () => {
    if (combo.classList.contains('is-ending')) combo.hidden = true;
  });
  const hideCombo = (): void => {
    combo.hidden = true;
    combo.classList.remove('is-ending', 'is-step');
  };

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
      if (options.tone) node.classList.add(`is-${options.tone}`);
      if (options.coins !== undefined) {
        const coins = el('p', 'banner-coins');
        coins.dataset['testid'] = 'banner-coins';
        coins.insertAdjacentHTML('beforeend', ICON_COIN);
        coins.append(el('span', '', `+${formatNumber(options.coins)}`));
        node.append(coins);
      }
      if (options.detail) node.append(el('p', 'banner-detail', options.detail));
      if (options.tiers && options.tiers.length > 0) {
        const cats = el('div', 'banner-cats');
        for (const tier of options.tiers) cats.append(catIcon(tier));
        node.append(cats);
      }
      if (options.y !== undefined) node.style.top = `${Math.round(options.y)}px`;
      banner = mount(node, options.durationMs ?? BANNER_MS, banner);
    },
    combo(count, bonus, y) {
      if (count <= 0) {
        if (!combo.hidden) {
          combo.classList.remove('is-step');
          combo.classList.add('is-ending');
        }
        return;
      }
      comboText.textContent = `Combo ×${count}`;
      // It heats up as the chain grows (GAME_DESIGN §12).
      combo.dataset['heat'] = String(COMBO_HEAT_LEVELS.filter((level) => count >= level).length);
      const percent = Math.round(bonus * 100);
      comboBonus.textContent = percent > 0 ? `+${percent}%` : '';
      comboBonus.hidden = percent <= 0;
      if (y !== undefined) combo.style.top = `${Math.round(y)}px`;
      combo.hidden = false;
      combo.classList.remove('is-ending', 'is-step');
      void combo.offsetWidth; // restart the pop
      combo.classList.add('is-step');
    },
    setPaused(paused) {
      layer.classList.toggle('is-paused', paused);
    },
    clear() {
      banner?.remove();
      banner = null;
      hideCombo();
      layer.classList.remove('is-paused');
    },
  };
}
