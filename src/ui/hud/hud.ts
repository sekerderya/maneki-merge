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

/**
 * In-game HUD (GAME_DESIGN §2.3), floating over the top of the play area: on the left the score
 * card (the stage card left in v0.18, until it has art); on the right the pink pause button, the coins card and the
 * next cat in a round glass bubble under it. Only the pause button takes touches; the rest lets
 * them through to the game.
 */
export function createHud(root: HTMLElement, actions: HudActions): HudView {
  root.replaceChildren();
  root.classList.add('game-hud');

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
  bubble.insertAdjacentHTML('beforeend', NEXT_BUBBLE_BACK);
  const nextCats = el('div', 'hud-next-cats');
  const nextCat = catIcon(1);
  nextCats.append(nextCat);
  bubble.append(nextCats);
  bubble.insertAdjacentHTML('beforeend', NEXT_BUBBLE_SHINE);
  next.append(el('span', 'hud-next-label', 'Next'), bubble);

  const pause = button('pause-btn', '', ICON_PAUSE);
  pause.setAttribute('aria-label', 'Pause');
  pause.dataset['testid'] = 'pause';
  pause.addEventListener('click', actions.onPause);

  const coinsCard = el('div', 'hud-card hud-coins-card');
  const coins = el('span', 'hud-coins');
  coins.dataset['testid'] = 'hud-coins';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);
  coinsCard.append(el('span', 'hud-label', 'Coins'), coins);

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
    coinTarget: coins,
  };
}
