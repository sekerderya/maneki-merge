/**
 * Coins flying to the HUD counter (GAME_DESIGN §12, TECH_SPEC §7). The scene reports where a
 * payout shows up on screen; a pooled DOM coin arcs from there to the counter, which pulses when
 * it lands. The coins are already in the wallet, so the flight is only decoration: when every
 * coin of the pool is in the air, extra flights are skipped.
 */
import {
  COIN_FLY_ARC,
  COIN_FLY_MS,
  COIN_FLY_POOL,
  COIN_FLY_STAGGER_MS,
  COIN_SHOWER_SPREAD,
} from '../../config/view';
import { el } from '../dom';
import { ICON_COIN } from '../icons';

export interface CoinFlyView {
  /**
   * Sends `count` coins from a point in the play area (CSS pixels from its top-left corner) to
   * the coin counter; `onArrive` runs as each one lands.
   */
  fly(x: number, y: number, count: number, onArrive: () => void): void;
  /** Lands nothing more: every coin in the air disappears (a new run, leaving the game). */
  clear(): void;
}

/** A coin in the pool: its node, and the animation flying it (null while it is free). */
interface Coin {
  readonly node: HTMLElement;
  animation: Animation | null;
}

export function createCoinFly(
  root: HTMLElement,
  playArea: HTMLElement,
  target: HTMLElement,
): CoinFlyView {
  const layer = el('div', 'coin-fly');
  layer.setAttribute('aria-hidden', 'true');
  root.append(layer);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  const pool: Coin[] = [];
  for (let i = 0; i < COIN_FLY_POOL; i++) {
    const node = el('span', 'coin-fly-coin');
    node.insertAdjacentHTML('beforeend', ICON_COIN);
    node.hidden = true;
    layer.append(node);
    pool.push({ node, animation: null });
  }

  const release = (coin: Coin): void => {
    coin.animation = null;
    coin.node.hidden = true;
  };

  return {
    fly(x, y, count, onArrive) {
      const area = playArea.getBoundingClientRect();
      const box = layer.getBoundingClientRect();
      const goal = target.getBoundingClientRect();
      if (goal.width === 0 || area.width === 0) return;
      const x0 = area.left + x - box.left;
      const y0 = area.top + y - box.top;
      const x1 = goal.left + goal.width / 2 - box.left;
      const y1 = goal.top + goal.height / 2 - box.top;
      const lift = Math.hypot(x1 - x0, y1 - y0) * COIN_FLY_ARC;
      const n = reduceMotion?.matches ? Math.min(1, count) : count;

      for (let i = 0; i < n; i++) {
        const coin = pool.find((c) => c.animation === null);
        if (!coin) return;
        // A shower starts from a ring around its origin.
        const angle = (i / n) * Math.PI * 2;
        const spread = n > 1 ? COIN_SHOWER_SPREAD : 0;
        const sx = x0 + Math.cos(angle) * spread;
        const sy = y0 + Math.sin(angle) * spread;
        // The path bows sideways, away from the counter, instead of running straight up.
        const mx = (sx + x1) / 2 + (x1 >= sx ? -lift : lift);
        const my = (sy + y1) / 2;
        coin.node.hidden = false;
        const animation = coin.node.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) scale(0.5)`, opacity: 0.4 },
            { transform: `translate(${sx}px, ${sy - 14}px) scale(1.1)`, opacity: 1, offset: 0.15 },
            { transform: `translate(${mx}px, ${my}px) scale(0.95)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${x1}px, ${y1}px) scale(0.6)`, opacity: 0.9 },
          ],
          {
            duration: COIN_FLY_MS,
            delay: i * COIN_FLY_STAGGER_MS,
            easing: 'cubic-bezier(0.45, 0, 0.75, 0.6)',
            fill: 'both',
          },
        );
        coin.animation = animation;
        animation.onfinish = () => {
          if (coin.animation !== animation) return;
          release(coin);
          onArrive();
        };
      }
    },
    clear() {
      for (const coin of pool) {
        if (!coin.animation) continue;
        const animation = coin.animation;
        release(coin);
        animation.cancel();
      }
    },
  };
}
