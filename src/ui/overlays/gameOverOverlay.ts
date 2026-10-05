import { formatNumber } from '../../core/format';
import { button, el } from '../dom';
import { ICON_COIN } from '../icons';

export interface GameOverActions {
  onPlayAgain(): void;
  onMenu(): void;
}

export interface GameOverSummary {
  readonly score: number;
  readonly bestScore: number;
  readonly stage: number;
  readonly coins: number;
  readonly newBestScore: boolean;
}

export interface GameOverView {
  readonly visible: boolean;
  show(summary: GameOverSummary): void;
  hide(): void;
}

/** Game Over overlay (GAME_DESIGN §2.3). The full record badges arrive with the save in M7. */
export function createGameOverOverlay(root: HTMLElement, actions: GameOverActions): GameOverView {
  const overlay = el('div', 'overlay game-overlay game-over-overlay');
  overlay.dataset['testid'] = 'game-over';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Game over');
  overlay.hidden = true;

  const panel = el('div', 'overlay-panel');
  const title = el('h2', 'overlay-title', 'Game Over');

  const score = el('p', 'go-score', '0');
  score.dataset['testid'] = 'go-score';
  const badge = el('span', 'record-badge', 'New best!');
  badge.dataset['testid'] = 'go-new-best';

  const stats = el('dl', 'go-stats');
  const row = (label: string, testid: string): HTMLElement => {
    const value = el('dd', '', '0');
    value.dataset['testid'] = testid;
    stats.append(el('dt', '', label), value);
    return value;
  };
  const best = row('Best', 'go-best');
  const stage = row('Stage', 'go-stage');
  const coins = row('Coins', 'go-coins');
  coins.textContent = '';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);

  const again = button('btn btn-primary overlay-main-btn', 'Play Again');
  again.dataset['testid'] = 'play-again';
  again.addEventListener('click', actions.onPlayAgain);
  const menu = button('btn btn-secondary', 'Menu');
  menu.dataset['testid'] = 'go-menu';
  menu.addEventListener('click', actions.onMenu);

  panel.append(title, score, badge, stats, again, menu);
  overlay.append(panel);
  root.append(overlay);

  return {
    get visible() {
      return !overlay.hidden;
    },
    show(summary) {
      score.textContent = formatNumber(summary.score);
      badge.hidden = !summary.newBestScore;
      best.textContent = formatNumber(summary.bestScore);
      stage.textContent = String(summary.stage);
      coinValue.textContent = formatNumber(summary.coins);
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
  };
}
