import { formatNumber } from '../../core/format';
import { catIcon, paintCatIcon } from '../catIcon';
import { button, el } from '../dom';
import { ICON_COIN, ICON_PAUSE } from '../icons';

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

/** In-game HUD (GAME_DESIGN §2.3): pause, score, run coins, next cat, stage and progress. */
export function createHud(root: HTMLElement, actions: HudActions): HudView {
  root.replaceChildren();
  root.classList.add('game-hud');

  const pause = button('icon-btn pause-btn', '', ICON_PAUSE);
  pause.setAttribute('aria-label', 'Pause');
  pause.dataset['testid'] = 'pause';
  pause.addEventListener('click', actions.onPause);

  const main = el('div', 'hud-main');
  const top = el('div', 'hud-row');
  const scoreBlock = el('div', 'hud-score-block');
  const score = el('span', 'hud-score', '0');
  score.dataset['testid'] = 'hud-score';
  scoreBlock.append(el('span', 'hud-score-label', 'Score'), score);
  const coins = el('span', 'hud-coins');
  coins.dataset['testid'] = 'hud-coins';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);
  top.append(scoreBlock, coins);

  const stage = el('div', 'hud-stage');
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
  main.append(top, stage);

  // The next cat in a bubble, with a "Next" tag under it.
  const next = el('div', 'hud-next');
  next.dataset['testid'] = 'hud-next';
  const nextCats = el('div', 'hud-next-cats');
  const nextCat = catIcon(1);
  nextCats.append(nextCat);
  next.append(nextCats, el('span', 'hud-next-label', 'Next'));

  root.append(pause, main, next);

  let shownStage = 0;
  const restartAnimation = (node: HTMLElement, className: string): void => {
    node.classList.remove(className);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(className);
  };
  stageLabel.addEventListener('animationend', () => stageLabel.classList.remove('is-new'));
  coins.addEventListener('animationend', () => coins.classList.remove('is-pulsing'));

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
      restartAnimation(coins, 'is-pulsing');
    },
    coinTarget: coins,
  };
}
