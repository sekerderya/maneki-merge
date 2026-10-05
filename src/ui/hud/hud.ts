import { formatNumber } from '../../core/format';
import { catIcon, paintCatIcon } from '../catIcon';
import { button, el } from '../dom';
import { ICON_COIN, ICON_LOCK, ICON_PAUSE } from '../icons';

export interface HudActions {
  onPause(): void;
}

export interface HudCat {
  readonly tier: number;
  readonly golden: boolean;
}

export interface HudView {
  setScore(score: number): void;
  setCoins(coins: number): void;
  /** The next one or two cats (Fortune Teller), next first. */
  setPreview(cats: readonly HudCat[]): void;
  /** Stage label and the bar towards the next expansion (a lock when it isn't unlocked). */
  setStage(stage: number, fraction: number, locked: boolean, final: boolean): void;
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
  const score = el('span', 'hud-score', '0');
  score.dataset['testid'] = 'hud-score';
  const coins = el('span', 'hud-coins');
  coins.dataset['testid'] = 'hud-coins';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);
  top.append(score, coins);

  const stage = el('div', 'hud-stage');
  const stageLabel = el('span', 'hud-stage-label', 'Stage 1');
  stageLabel.dataset['testid'] = 'hud-stage';
  const bar = el('div', 'hud-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Progress to the next stage');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = el('div', 'hud-bar-fill');
  bar.append(fill);
  const lock = el('span', 'hud-lock');
  lock.insertAdjacentHTML('beforeend', ICON_LOCK);
  lock.setAttribute('aria-label', 'Next stage locked');
  lock.dataset['testid'] = 'hud-lock';
  lock.hidden = true;
  stage.append(stageLabel, bar, lock);
  main.append(top, stage);

  const next = el('div', 'hud-next');
  next.dataset['testid'] = 'hud-next';
  next.append(el('span', 'hud-next-label', 'Next'));
  const nextCats = el('div', 'hud-next-cats');
  next.append(nextCats);

  root.append(pause, main, next);

  return {
    setScore(value) {
      score.textContent = formatNumber(value);
    },
    setCoins(value) {
      coinValue.textContent = formatNumber(value);
    },
    setPreview(cats) {
      while (nextCats.children.length > cats.length) nextCats.lastElementChild?.remove();
      cats.forEach((cat, i) => {
        const existing = nextCats.children[i] as HTMLElement | undefined;
        if (existing) paintCatIcon(existing, cat.tier, cat.golden);
        else nextCats.append(catIcon(cat.tier, cat.golden));
      });
      next.classList.toggle('has-two', cats.length > 1);
    },
    setStage(value, fraction, locked, final) {
      stageLabel.textContent = `Stage ${value}`;
      const percent = Math.round(fraction * 100);
      fill.style.transform = `scaleX(${fraction})`;
      bar.setAttribute('aria-valuenow', String(percent));
      bar.classList.toggle('is-locked', locked);
      bar.classList.toggle('is-final', final);
      lock.hidden = !locked;
    },
  };
}
