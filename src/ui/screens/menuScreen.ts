import { APP_NAME } from '../../config/app';
import { formatNumber } from '../../core/format';
import { formatVersionLabel } from '../../core/version';
import { button, el } from '../dom';
import { ICON_COIN, ICON_SHARE, ICON_SOUND_OFF, ICON_SOUND_ON } from '../icons';

/** What the install area shows (GAME_DESIGN §2.1). */
export type InstallHint = 'none' | 'ios-share' | 'install-button';

export interface MenuActions {
  onPlay(): void;
  onUpgrades(): void;
  onToggleSound(): void;
  onApplyUpdate(): void;
  onInstall(): void;
}

export interface MenuView {
  setCoins(coins: number): void;
  setRecords(bestScore: number, bestStage: number): void;
  setSoundOn(on: boolean): void;
  setUpdateReady(ready: boolean): void;
  setInstallHint(hint: InstallHint): void;
  /** The dot on UPGRADES: at least one upgrade is affordable. */
  setUpgradesAffordable(affordable: boolean): void;
}

/** Main menu (GAME_DESIGN §2.1). UPGRADES opens the shop panel. */
export function createMenuScreen(root: HTMLElement, actions: MenuActions): MenuView {
  root.replaceChildren();
  root.classList.add('menu-screen');

  // Top bar: coin balance (left), sound toggle (right).
  const top = el('header', 'menu-top');
  const coins = el('div', 'coin-balance');
  coins.dataset['testid'] = 'coin-balance';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', 'coin-value', '0');
  coins.append(coinValue);

  const sound = button('icon-btn sound-toggle', '');
  sound.dataset['testid'] = 'sound-toggle';
  sound.addEventListener('click', actions.onToggleSound);
  top.append(coins, sound);

  // Center: title, records, PLAY, UPGRADES.
  const center = el('div', 'menu-center');
  const title = el('h1', 'menu-title', APP_NAME);
  // Best score and best stage, each as a labelled chip.
  const records = el('div', 'menu-records');
  records.dataset['testid'] = 'records';
  const record = (label: string, testid: string): HTMLElement => {
    const chip = el('p', 'record');
    const value = el('span', 'record-value', '0');
    value.dataset['testid'] = testid;
    chip.append(el('span', 'record-label', label), value);
    records.append(chip);
    return value;
  };
  const bestScoreValue = record('Best score', 'best-score');
  const bestStageValue = record('Best stage', 'best-stage');

  const play = button('btn btn-primary btn-play', 'PLAY');
  play.dataset['testid'] = 'play';
  play.addEventListener('click', actions.onPlay);

  const upgrades = button('btn btn-secondary btn-upgrades', 'UPGRADES');
  upgrades.dataset['testid'] = 'upgrades';
  upgrades.addEventListener('click', actions.onUpgrades);
  const upgradesDot = el('span', 'notify-dot');
  upgradesDot.dataset['testid'] = 'upgrades-dot';
  upgradesDot.hidden = true;
  upgrades.append(upgradesDot);

  center.append(title, records, play, upgrades);

  // Bottom: update badge, install hint, version.
  const bottom = el('footer', 'menu-bottom');

  const update = button('update-badge', 'Update ready — tap to restart');
  update.dataset['testid'] = 'update-badge';
  update.hidden = true;
  update.addEventListener('click', actions.onApplyUpdate);

  const iosHint = el('p', 'install-hint');
  iosHint.dataset['testid'] = 'install-hint-ios';
  iosHint.append(el('span', '', 'Tap Share'));
  iosHint.insertAdjacentHTML('beforeend', ICON_SHARE);
  iosHint.append(el('span', '', 'then Add to Home Screen'));
  iosHint.hidden = true;

  const install = button('btn btn-small install-btn', 'Install app');
  install.dataset['testid'] = 'install-button';
  install.hidden = true;
  install.addEventListener('click', actions.onInstall);

  const version = el('p', 'version', formatVersionLabel(__APP_VERSION__, __BUILD_HASH__));
  version.dataset['testid'] = 'version';

  bottom.append(update, iosHint, install, version);
  root.append(top, center, bottom);

  const view: MenuView = {
    setCoins(value) {
      coinValue.textContent = formatNumber(value);
    },
    setRecords(bestScore, bestStage) {
      bestScoreValue.textContent = formatNumber(bestScore);
      bestStageValue.textContent = String(bestStage);
    },
    setSoundOn(on) {
      sound.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
      sound.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
      sound.setAttribute('aria-pressed', String(on));
    },
    setUpdateReady(ready) {
      update.hidden = !ready;
    },
    setInstallHint(hint) {
      iosHint.hidden = hint !== 'ios-share';
      install.hidden = hint !== 'install-button';
    },
    setUpgradesAffordable(affordable) {
      upgradesDot.hidden = !affordable;
      upgrades.setAttribute('aria-label', affordable ? 'Upgrades, one is affordable' : 'Upgrades');
    },
  };
  view.setCoins(0);
  view.setRecords(0, 1);
  view.setSoundOn(true);
  return view;
}
