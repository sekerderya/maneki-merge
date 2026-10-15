import { ICON_SPRITE_DIR, iconSprite } from '../../config/iconSprites';
import { formatNumber } from '../../core/format';
import type { NewRecords } from '../../core/profile';
import { coinIcon } from '../coinIcon';
import { button, el } from '../dom';
import { ICON_PLAY } from '../icons';
import { artImage, setUiArtProperties } from '../uiArt';

export interface GameOverActions {
  onPlayAgain(): void;
  onMenu(): void;
  /** Double coins (GAME_DESIGN §2.7): the rewarded ad that pays the run's coins once more. */
  onDoubleCoins(): void;
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
  /** Double coins shows only while its ad is ready and the run's coins can still be doubled. */
  setDoubleCoins(available: boolean): void;
  /** The ad paid: the coins earned now read `coins`, with a pop. */
  coinsDoubled(coins: number): void;
}

/**
 * Game Over overlay (GAME_DESIGN §2.3): score, best score, stage reached, coins earned this run,
 * and a badge for a new best score or best stage (v0.39.1, the owner's call: the biggest cat made
 * and the shop cards a run opened are gone).
 * With `art` (the art skin) it is the owner's approved mockup (docs/ART_ASSETS.md §4.14), built
 * from the Upgrades and menu pieces (panel-art.css), with the HUD coin.
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
  coins.append(coinIcon('go-coin'));
  const coinValue = el('span', '', '0');
  coinValue.dataset['testid'] = 'go-coins-value';
  coins.append(coinValue);

  // Double coins (GAME_DESIGN §2.7): the rewarded ad, with the play medallion.
  const double = button('btn btn-secondary go-double', '');
  double.dataset['testid'] = 'go-double';
  const play = el('span', 'ad-offer-play');
  const playArt = art ? iconSprite('clip') : null;
  if (playArt) play.append(artImage(`${ICON_SPRITE_DIR}${playArt.file}`, 'ad-offer-play-art'));
  else play.insertAdjacentHTML('beforeend', ICON_PLAY);
  double.append(play, el('span', 'btn-label', 'Double coins'));
  double.hidden = true;
  double.addEventListener('click', actions.onDoubleCoins);

  const again = button('btn btn-primary overlay-main-btn', 'Play Again');
  again.dataset['testid'] = 'play-again';
  again.addEventListener('click', actions.onPlayAgain);
  const menu = button('btn btn-secondary', 'Menu');
  menu.dataset['testid'] = 'go-menu';
  menu.addEventListener('click', actions.onMenu);

  panel.append(title, score, badge, stats, double, again, menu);
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
      coins.classList.remove('is-doubled');
      double.hidden = true;
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
    setDoubleCoins(available) {
      double.hidden = !available;
    },
    coinsDoubled(value) {
      coinValue.textContent = formatNumber(value);
      double.hidden = true;
      coins.classList.add('is-doubled');
    },
  };
}
