import { formatNumber } from '../../core/format';
import type { NewRecords } from '../../core/profile';
import { catIcon, paintCatIcon } from '../catIcon';
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
  /** Coins earned this run (already in the wallet). */
  readonly coins: number;
  /** The highest tier a merge made this run; 0 before the first merge. */
  readonly highestTier: number;
  readonly records: NewRecords;
}

export interface GameOverView {
  readonly visible: boolean;
  show(summary: GameOverSummary): void;
  hide(): void;
}

/**
 * Game Over overlay (GAME_DESIGN §2.3): score, best score, stage reached, the biggest cat made,
 * coins earned this run, and a badge for every record the run broke.
 */
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
  const chip = (testid: string): HTMLElement => {
    const node = el('span', 'record-chip', 'New');
    node.dataset['testid'] = testid;
    return node;
  };
  const best = row('Best', 'go-best');
  const stageRow = row('Stage', 'go-stage-row');
  const stage = el('span', '', '1');
  stage.dataset['testid'] = 'go-stage';
  const stageChip = chip('go-new-stage');
  stageRow.replaceChildren(stageChip, stage);
  const tierRow = row('Biggest cat', 'go-tier');
  const tierIcon = catIcon(1);
  const tierNone = el('span', '', '–');
  const tierChip = chip('go-new-tier');
  tierRow.replaceChildren(tierChip, tierIcon, tierNone);
  const coins = row('Coins earned', 'go-coins');
  coins.textContent = '';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coinValue.dataset['testid'] = 'go-coins-value';
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
      const { records } = summary;
      score.textContent = formatNumber(summary.score);
      badge.hidden = !records.score;
      best.textContent = formatNumber(summary.bestScore);
      stage.textContent = String(summary.stage);
      stageChip.hidden = !records.stage;
      const tier = summary.highestTier;
      tierIcon.hidden = tier < 1;
      tierNone.hidden = tier >= 1;
      if (tier >= 1) paintCatIcon(tierIcon, tier);
      tierChip.hidden = !records.highestTier;
      coinValue.textContent = formatNumber(summary.coins);
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
  };
}
