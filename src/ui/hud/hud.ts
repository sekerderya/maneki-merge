import {
  HUD_COINS_ART,
  HUD_NEXT_ART,
  HUD_PAUSE_ART,
  HUD_SCORE_ART,
  HUD_SPRITE_DIR,
} from '../../config/hudSprites';
import type { HudSprite } from '../../config/hudSprites';
import { formatNumber } from '../../core/format';
import { catIcon, paintCatIcon } from '../catIcon';
import { button, el } from '../dom';
import { ICON_COIN, ICON_PAUSE, NEXT_BUBBLE_BACK, NEXT_BUBBLE_SHINE } from '../icons';

export interface HudActions {
  onPause(): void;
}

export interface HudView {
  setScore(score: number): void;
  setCoins(coins: number): void;
  /** The cat after the one in the dropper. */
  setNext(tier: number): void;
  /** A coin landed on the counter. */
  pulseCoins(): void;
  /** Where flying coins land. */
  readonly coinTarget: HTMLElement;
}

/** The CSS `url()` of a HUD sprite. */
function artUrl(sprite: HudSprite): string {
  return `url("${import.meta.env.BASE_URL}${HUD_SPRITE_DIR}${sprite.file}")`;
}

/** The HUD art's images and measurements, as CSS custom properties on the HUD. */
function setArtProperties(root: HTMLElement): void {
  const set = (name: string, value: string | number): void =>
    root.style.setProperty(name, String(value));
  set('--hud-score-art', artUrl(HUD_SCORE_ART));
  set('--hud-coins-art', artUrl(HUD_COINS_ART));
  set('--hud-next-art', artUrl(HUD_NEXT_ART));
  set('--hud-pause-art', artUrl(HUD_PAUSE_ART));
  set('--hud-card-ratio', `${HUD_COINS_ART.width} / ${HUD_COINS_ART.height}`);
  set('--hud-text-left', `${HUD_COINS_ART.textLeft * 100}%`);
  set('--hud-text-right', `${(1 - HUD_COINS_ART.textRight) * 100}%`);
  set('--hud-coin-x', `${HUD_COINS_ART.iconX * 100}%`);
  set('--hud-coin-y', `${HUD_COINS_ART.iconY * 100}%`);
  set('--hud-next-ratio', `${HUD_NEXT_ART.width} / ${HUD_NEXT_ART.height}`);
  set('--hud-next-cy', `${HUD_NEXT_ART.cy * 100}%`);
  set('--hud-next-tag', `${HUD_NEXT_ART.tagY * 100}%`);
}

/**
 * In-game HUD (GAME_DESIGN §2.3), floating over the top of the play area: on the left the score
 * card (the stage card left in v0.18, until it has art); on the right the pink pause button, the
 * coins card and the next cat in a round glass bubble under it. Only the pause button takes
 * touches; the rest lets them through to the game. With `art` the cards, the bubble and the button
 * are the owner's images (config/hudSprites.ts), with the text on top.
 */
export function createHud(root: HTMLElement, actions: HudActions, art = false): HudView {
  root.replaceChildren();
  root.classList.add('game-hud');
  root.classList.toggle('is-art', art);
  if (art) setArtProperties(root);

  const scoreCard = el('div', 'hud-card hud-score-card');
  const score = el('span', 'hud-score', '0');
  score.dataset['testid'] = 'hud-score';
  scoreCard.append(el('span', 'hud-label', 'Score'), score);

  const left = el('div', 'hud-left');
  left.append(scoreCard);

  // The next cat in a round glass bubble under the coins card.
  const next = el('div', 'hud-next');
  next.dataset['testid'] = 'hud-next';
  const bubble = el('div', 'hud-next-bubble');
  if (!art) bubble.insertAdjacentHTML('beforeend', NEXT_BUBBLE_BACK);
  const nextCats = el('div', 'hud-next-cats');
  const nextCat = catIcon(1);
  nextCats.append(nextCat);
  bubble.append(nextCats);
  if (!art) bubble.insertAdjacentHTML('beforeend', NEXT_BUBBLE_SHINE);
  next.append(el('span', 'hud-next-label', 'Next'), bubble);

  // The art's button has its own bars.
  const pause = button('pause-btn', '', art ? undefined : ICON_PAUSE);
  pause.setAttribute('aria-label', 'Pause');
  pause.dataset['testid'] = 'pause';
  pause.addEventListener('click', actions.onPause);

  const coinsCard = el('div', 'hud-card hud-coins-card');
  const coins = el('span', 'hud-coins');
  coins.dataset['testid'] = 'hud-coins';
  if (!art) coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);
  coinsCard.append(el('span', 'hud-label', 'Coins'), coins);
  // With the art the coin is part of the card: flying coins land on it.
  const coinSpot = el('span', 'hud-coin-spot');
  if (art) coinsCard.append(coinSpot);

  // The pause button on top, the coins card under it, the bubble under that.
  const right = el('div', 'hud-right');
  right.append(coinsCard, next, pause);

  root.append(left, right);

  const restartAnimation = (node: HTMLElement, className: string): void => {
    node.classList.remove(className);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(className);
  };
  coinsCard.addEventListener('animationend', () => coinsCard.classList.remove('is-pulsing'));

  return {
    setScore(value) {
      score.textContent = formatNumber(value);
    },
    setCoins(value) {
      coinValue.textContent = formatNumber(value);
    },
    setNext(tier) {
      paintCatIcon(nextCat, tier);
    },
    pulseCoins() {
      restartAnimation(coinsCard, 'is-pulsing');
    },
    coinTarget: art ? coinSpot : coins,
  };
}
