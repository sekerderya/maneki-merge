import { MENU_ART, MENU_SPRITE_DIR } from '../../config/menuSprites';
import { formatNumber } from '../../core/format';
import type { NewRecords } from '../../core/profile';
import { button, el } from '../dom';
import { ICON_COIN } from '../icons';
import { artImage, setUiArtProperties } from '../uiArt';

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
  readonly records: NewRecords;
}

export interface GameOverView {
  readonly visible: boolean;
  show(summary: GameOverSummary): void;
  hide(): void;
}

/**
 * Game Over overlay (GAME_DESIGN §2.3): score, best score, stage reached, coins earned this run,
 * and a badge for a new best score or best stage (v0.39.1, the owner's call: the biggest cat made
 * and the shop cards a run opened are gone).
 * With `art` (the art skin) it is the owner's approved mockup (docs/ART_ASSETS.md §4.14), built
 * from the Upgrades and menu pieces (panel-art.css), with the menu's coin.
 */
export function createGameOverOverlay(
  root: HTMLElement,
  actions: GameOverActions,
  art = false,
): GameOverView {
  const overlay = el('div', 'overlay game-overlay game-over-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
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
  const coins = row('Coins earned', 'go-coins');
  coins.textContent = '';
  if (art) coins.append(artImage(`${MENU_SPRITE_DIR}${MENU_ART.coin.file}`, 'go-coin'));
  else coins.insertAdjacentHTML('beforeend', ICON_COIN);
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
      coinValue.textContent = formatNumber(summary.coins);
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
  };
}
