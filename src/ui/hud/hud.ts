import { formatNumber } from '../../core/format';
import { catIcon, paintCatIcon } from '../catIcon';
import { button, el } from '../dom';
import {
  ICON_COIN,
  ICON_PAUSE,
  ICON_PAW_PRINT,
  NEXT_BUBBLE_BACK,
  NEXT_BUBBLE_SHINE,
} from '../icons';

export interface HudActions {
  onPause(): void;
}

export interface HudView {
  setScore(score: number): void;
  setCoins(coins: number): void;
  /** The cat after the one in the dropper. */
  setNext(tier: number): void;
  /**
   * Stage label, the bar towards the stage's last cat and that cat (the goal), gold at the last
   * stage. A new stage resets the bar without animating it backwards and makes the label glow.
   */
  setStage(stage: number, fraction: number, goalTier: number, final: boolean): void;
  /** A coin landed on the counter. */
  pulseCoins(): void;
  /** Where flying coins land. */
  readonly coinTarget: HTMLElement;
}

/**
 * In-game HUD (GAME_DESIGN §2.3), floating over the top of the play area: on the left the score
 * card with its paw badge and the stage card under it; on the right the next cat in a glass
 * bubble, the pink pause button and the coins card. Only the pause button takes touches; the
 * rest lets them through to the game.
 */
export function createHud(root: HTMLElement, actions: HudActions): HudView {
  root.replaceChildren();
  root.classList.add('game-hud');

  const scoreCard = el('div', 'hud-card hud-score-card');
  const paw = el('span', 'hud-paw');
  paw.insertAdjacentHTML('beforeend', ICON_PAW_PRINT);
  const score = el('span', 'hud-score', '0');
  score.dataset['testid'] = 'hud-score';
  scoreCard.append(paw, el('span', 'hud-label', 'Score'), score);

  const stage = el('div', 'hud-card hud-stage');
  const stageLabel = el('span', 'hud-stage-label', 'Stage 1');
  stageLabel.dataset['testid'] = 'hud-stage';
  const bar = el('div', 'hud-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', "Progress to the stage's last cat");
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = el('div', 'hud-bar-fill');
  bar.append(fill);
  // The stage's last cat: making it grows the jar.
  const goal = catIcon(1);
  goal.classList.add('hud-goal');
  goal.dataset['testid'] = 'hud-goal';
  stage.append(stageLabel, bar, goal);

  const left = el('div', 'hud-left');
  left.append(scoreCard, stage);

  // The next cat in a glass speech bubble, its tail towards the paw.
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

  // The bubble overlaps the coins card, and the pause button sits above both.
  const right = el('div', 'hud-right');
  right.append(coinsCard, next, pause);

  root.append(left, right);

  let shownStage = 0;
  const restartAnimation = (node: HTMLElement, className: string): void => {
    node.classList.remove(className);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(className);
  };
  stageLabel.addEventListener('animationend', () => stageLabel.classList.remove('is-new'));
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
    setStage(value, fraction, goalTier, final) {
      const percent = Math.round(fraction * 100);
      if (value !== shownStage) {
        // A run start or an expansion: jump to the new fill instead of sliding back.
        fill.classList.add('is-instant');
        fill.style.transform = `scaleX(${fraction})`;
        void fill.offsetWidth;
        fill.classList.remove('is-instant');
        stageLabel.textContent = `Stage ${value}`;
        if (shownStage !== 0 && value > shownStage) restartAnimation(stageLabel, 'is-new');
        shownStage = value;
      } else {
        fill.style.transform = `scaleX(${fraction})`;
      }
      if (goal.dataset['tier'] !== String(goalTier)) paintCatIcon(goal, goalTier);
      goal.setAttribute('aria-label', `Goal: cat ${goalTier}`);
      bar.setAttribute('aria-valuenow', String(percent));
      bar.classList.toggle('is-final', final);
    },
    pulseCoins() {
      restartAnimation(coinsCard, 'is-pulsing');
    },
    coinTarget: coins,
  };
}
