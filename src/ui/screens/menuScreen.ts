import { APP_NAME } from '../../config/app';
import { catLook } from '../../config/catArt';
import { formatNumber } from '../../core/format';
import { catSvg } from '../catIcon';
import { button, el } from '../dom';
import { ICON_ARROW_UP, ICON_COIN, ICON_GEAR, ICON_PAW, ICON_SHARE } from '../icons';

/** What the install area shows (GAME_DESIGN §2.1). */
export type InstallHint = 'none' | 'ios-share' | 'install-button';

export interface MenuActions {
  onPlay(): void;
  onUpgrades(): void;
  onSettings(): void;
  onApplyUpdate(): void;
  onInstall(): void;
}

export interface MenuView {
  setCoins(coins: number): void;
  setRecords(bestScore: number, bestStage: number): void;
  setUpdateReady(ready: boolean): void;
  setInstallHint(hint: InstallHint): void;
  /** The dot on UPGRADES: at least one upgrade is affordable. */
  setUpgradesAffordable(affordable: boolean): void;
}

/** The cat on the menu's cushion: the classic calico maneki-neko. */
const HERO_LOOK = 6;

/**
 * The shrine garden behind the hero (GAME_DESIGN §2.1): sakura trees, clouds, a little shrine and
 * a torii on the hills. Its box is the hero area; it scales to cover it and stays anchored to the
 * ground, which continues below in the menu's ground colour.
 */
const SCENE = `<svg class="menu-scene" viewBox="0 168 390 282" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
<path d="M38 200A14 14 0 0 1 52 186A18 18 0 0 1 86 182A13 13 0 0 1 104 200Z" fill="#fff" opacity="0.85"/>
<path d="M290 182A12 12 0 0 1 302 170A16 16 0 0 1 332 167A12 12 0 0 1 350 182Z" fill="#fff" opacity="0.85"/>
<path d="M-60 410Q80 372 190 392Q300 412 450 372V460H-60Z" fill="#f6dfc9"/>
<path d="M38 368Q71 348 104 368L100 372Q71 356 42 372Z" fill="#b4704f"/>
<rect x="48" y="370" width="46" height="24" fill="#f3e3cc"/>
<rect x="62" y="376" width="18" height="18" fill="#e2c29e"/>
<path d="M282 338Q318 330 354 338L352 346Q318 339 284 346Z" fill="#d98a78"/>
<rect x="290" y="356" width="56" height="6" fill="#d98a78"/>
<rect x="297" y="344" width="7" height="52" fill="#d98a78"/>
<rect x="332" y="344" width="7" height="52" fill="#d98a78"/>
<path d="M-60 452Q195 420 450 452V460H-60Z" fill="#f4d8be"/>
<g fill="none" stroke="#9b6a50" stroke-linecap="round"><path d="M-6 430Q20 370 28 300" stroke-width="9"/><path d="M22 322Q40 302 62 298" stroke-width="5"/><path d="M396 420Q370 360 362 290" stroke-width="9"/><path d="M368 316Q350 298 330 294" stroke-width="5"/></g>
<g fill="#f7c9d2"><circle cx="-10" cy="250" r="40"/><circle cx="30" cy="230" r="32"/><circle cx="52" cy="270" r="24"/><circle cx="10" cy="295" r="30"/><circle cx="400" cy="232" r="40"/><circle cx="360" cy="214" r="30"/><circle cx="340" cy="252" r="24"/><circle cx="382" cy="278" r="30"/></g>
<g fill="#f2afbf"><circle cx="22" cy="248" r="13"/><circle cx="46" cy="262" r="9"/><circle cx="-2" cy="284" r="11"/><circle cx="368" cy="232" r="12"/><circle cx="346" cy="246" r="8"/><circle cx="392" cy="266" r="11"/></g>
<g fill="#f2a7b8"><ellipse cx="124" cy="176" rx="4.5" ry="2.6" transform="rotate(30 124 176)"/><ellipse cx="268" cy="182" rx="4.5" ry="2.6" transform="rotate(-20 268 182)"/><ellipse cx="86" cy="420" rx="4.5" ry="2.6" transform="rotate(50 86 420)"/><ellipse cx="318" cy="430" rx="4.5" ry="2.6" transform="rotate(-35 318 430)"/></g>
</svg>`;

/** The cushion (zabuton) the hero sits on, with gold tassels. */
const CUSHION = `<svg class="hero-cushion" viewBox="0 0 250 72" aria-hidden="true" focusable="false">
<path d="M22 20L14 12M228 20L236 12M22 52L14 60M228 52L236 60" fill="none" stroke="#4a2e25" stroke-width="2"/>
<g fill="#f2b83b" stroke="#4a2e25" stroke-width="2"><circle cx="12" cy="10" r="4.5"/><circle cx="238" cy="10" r="4.5"/><circle cx="12" cy="62" r="4.5"/><circle cx="238" cy="62" r="4.5"/></g>
<path d="M22 20Q125 4 228 20Q244 36 228 52Q125 68 22 52Q6 36 22 20Z" fill="#ee9aae" stroke="#4a2e25" stroke-width="3" stroke-linejoin="round"/>
<path d="M36 26Q125 14 214 26Q225 36 214 46Q125 58 36 46Q25 36 36 26Z" fill="none" stroke="#c9677f" stroke-width="2" stroke-dasharray="5 5"/>
<ellipse cx="125" cy="26" rx="60" ry="8" fill="#c9677f" opacity="0.45"/>
</svg>`;

/** Sakura bushes in the bottom corners. */
const BUSH = `<svg class="menu-bush" viewBox="0 -90 90 90" aria-hidden="true" focusable="false">
<g fill="#f7c9d2"><circle cx="0" cy="-14" r="40"/><circle cx="42" cy="8" r="34"/><circle cx="-8" cy="-60" r="26"/></g>
<circle cx="16" cy="-30" r="10" fill="#f2afbf"/>
<ellipse cx="62" cy="-62" rx="4.5" ry="2.6" fill="#f2a7b8" transform="rotate(60 62 -62)"/>
</svg>`;

/** Main menu (GAME_DESIGN §2.1). UPGRADES opens the shop; the gear opens Settings. */
export function createMenuScreen(root: HTMLElement, actions: MenuActions): MenuView {
  root.replaceChildren();
  root.classList.add('menu-screen');

  // Top bar: settings (left), coin balance (right).
  const top = el('header', 'menu-top');
  const settings = button('icon-btn menu-settings', '', ICON_GEAR);
  settings.setAttribute('aria-label', 'Settings');
  settings.dataset['testid'] = 'settings';
  settings.addEventListener('click', actions.onSettings);
  const coins = el('div', 'coin-balance');
  coins.dataset['testid'] = 'coin-balance';
  coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', 'coin-value', '0');
  coins.append(coinValue);
  top.append(settings, coins);

  const title = el('h1', 'menu-title', APP_NAME);

  // The hero: the shrine garden, and a lucky cat on its cushion among floating coins.
  const hero = el('div', 'menu-hero');
  hero.setAttribute('aria-hidden', 'true');
  hero.insertAdjacentHTML('beforeend', SCENE);
  const figure = el('div', 'hero-figure');
  figure.append(el('span', 'hero-halo'));
  for (let i = 1; i <= 4; i++) {
    const coin = el('span', `hero-coin hero-coin-${i}`);
    coin.insertAdjacentHTML('beforeend', ICON_COIN);
    figure.append(coin);
  }
  figure.insertAdjacentHTML('beforeend', CUSHION);
  const cat = el('span', 'hero-cat');
  cat.innerHTML = catSvg(catLook(HERO_LOOK));
  figure.append(cat);
  hero.append(figure);

  // Below the hero, on the ground: records, PLAY and UPGRADES.
  const lower = el('div', 'menu-lower');
  lower.insertAdjacentHTML('beforeend', BUSH);
  lower.insertAdjacentHTML(
    'beforeend',
    BUSH.replace('class="menu-bush"', 'class="menu-bush is-right"'),
  );

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

  const actionsRow = el('div', 'menu-actions');
  const play = button('btn-play', 'PLAY', ICON_PAW);
  play.setAttribute('aria-label', 'Play');
  play.dataset['testid'] = 'play';
  play.addEventListener('click', actions.onPlay);

  const upgrades = button('btn btn-secondary btn-upgrades', 'Upgrades', ICON_ARROW_UP);
  upgrades.dataset['testid'] = 'upgrades';
  upgrades.addEventListener('click', actions.onUpgrades);
  const upgradesDot = el('span', 'notify-dot');
  upgradesDot.dataset['testid'] = 'upgrades-dot';
  upgradesDot.hidden = true;
  upgrades.append(upgradesDot);
  actionsRow.append(play, upgrades);

  // Update badge and install hint, only when they apply.
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

  const install = button('btn btn-ghost btn-small install-btn', 'Install app');
  install.dataset['testid'] = 'install-button';
  install.hidden = true;
  install.addEventListener('click', actions.onInstall);

  bottom.append(update, iosHint, install);
  lower.append(records, actionsRow, bottom);
  root.append(top, title, hero, lower);

  const syncBottom = (): void => {
    bottom.hidden = update.hidden && iosHint.hidden && install.hidden;
  };

  const view: MenuView = {
    setCoins(value) {
      coinValue.textContent = formatNumber(value);
    },
    setRecords(bestScore, bestStage) {
      bestScoreValue.textContent = formatNumber(bestScore);
      bestStageValue.textContent = String(bestStage);
    },
    setUpdateReady(ready) {
      update.hidden = !ready;
      syncBottom();
    },
    setInstallHint(hint) {
      iosHint.hidden = hint !== 'ios-share';
      install.hidden = hint !== 'install-button';
      syncBottom();
    },
    setUpgradesAffordable(affordable) {
      upgradesDot.hidden = !affordable;
      upgrades.setAttribute('aria-label', affordable ? 'Upgrades, one is affordable' : 'Upgrades');
    },
  };
  view.setCoins(0);
  view.setRecords(0, 1);
  syncBottom();
  return view;
}
