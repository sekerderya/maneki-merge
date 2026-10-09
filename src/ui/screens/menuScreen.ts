import { APP_NAME } from '../../config/app';
import { HUD_BADGE_ART, HUD_SPRITE_DIR } from '../../config/hudSprites';
import { MENU_ART, MENU_SPRITE_DIR } from '../../config/menuSprites';
import type { MenuSprite, MenuStripSprite } from '../../config/menuSprites';
import { formatNumber } from '../../core/format';
import { paintHeroCat } from '../catIcon';
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

/** The pieces every menu layout has; the view updates them. */
interface MenuControls {
  readonly coinValue: HTMLElement;
  readonly bestScoreValue: HTMLElement;
  readonly bestStageValue: HTMLElement;
  readonly upgrades: HTMLButtonElement;
  readonly upgradesDot: HTMLElement;
  readonly bottom: HTMLElement;
  readonly update: HTMLButtonElement;
  readonly iosHint: HTMLElement;
  readonly install: HTMLButtonElement;
}

/**
 * Main menu (GAME_DESIGN §2.1). UPGRADES opens the shop; the gear opens Settings. With `art` it is
 * the owner's mockup (config/menuSprites.ts), else the vector garden.
 */
export function createMenuScreen(root: HTMLElement, actions: MenuActions, art = false): MenuView {
  root.replaceChildren();
  root.classList.add('menu-screen');
  root.classList.toggle('is-art', art);
  const controls = art ? artLayout(root, actions) : vectorLayout(root, actions);
  const { coinValue, bestScoreValue, bestStageValue, upgrades, upgradesDot } = controls;
  const { bottom, update, iosHint, install } = controls;

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
      // The art's wells shrink long numbers to fit (menu.css).
      for (const value of [bestScoreValue, bestStageValue]) {
        value.style.setProperty('--chars', String(Math.max(6, value.textContent.length)));
      }
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

function settingsButton(actions: MenuActions, className: string, icon: string): HTMLButtonElement {
  const settings = button(className, '', icon);
  settings.setAttribute('aria-label', 'Settings');
  settings.dataset['testid'] = 'settings';
  settings.addEventListener('click', actions.onSettings);
  return settings;
}

function playButton(actions: MenuActions, className: string, icon?: string): HTMLButtonElement {
  const play = button(className, 'PLAY', icon);
  play.setAttribute('aria-label', 'Play');
  play.dataset['testid'] = 'play';
  play.addEventListener('click', actions.onPlay);
  return play;
}

function upgradesButton(
  actions: MenuActions,
  className: string,
  icon?: string,
): { upgrades: HTMLButtonElement; upgradesDot: HTMLElement } {
  const upgrades = button(className, 'Upgrades', icon);
  upgrades.dataset['testid'] = 'upgrades';
  upgrades.addEventListener('click', actions.onUpgrades);
  const upgradesDot = el('span', 'notify-dot');
  upgradesDot.dataset['testid'] = 'upgrades-dot';
  upgradesDot.hidden = true;
  upgrades.append(upgradesDot);
  return { upgrades, upgradesDot };
}

function recordValue(testid: string): HTMLElement {
  const value = el('span', 'record-value', '0');
  value.dataset['testid'] = testid;
  return value;
}

/**
 * The "Updating…" badge (a tap retries a stalled update) and the install hint, shown only when
 * they apply.
 */
function footer(
  actions: MenuActions,
): Pick<MenuControls, 'bottom' | 'update' | 'iosHint' | 'install'> {
  const bottom = el('footer', 'menu-bottom');
  const update = button('update-badge', 'Updating…');
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
  return { bottom, update, iosHint, install };
}

/** The vector menu (`?skin=vector`): a code-drawn garden; the hero takes the height that is left. */
function vectorLayout(root: HTMLElement, actions: MenuActions): MenuControls {
  // Top bar: settings (left), coin balance (right).
  const top = el('header', 'menu-top');
  const settings = settingsButton(actions, 'icon-btn menu-settings', ICON_GEAR);
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
  paintHeroCat(cat);
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
  const record = (label: string, value: HTMLElement): void => {
    const chip = el('p', 'record');
    chip.append(el('span', 'record-label', label), value);
    records.append(chip);
  };
  const bestScoreValue = recordValue('best-score');
  const bestStageValue = recordValue('best-stage');
  record('Best score', bestScoreValue);
  record('Best stage', bestStageValue);

  const actionsRow = el('div', 'menu-actions');
  const play = playButton(actions, 'btn-play', ICON_PAW);
  const { upgrades, upgradesDot } = upgradesButton(
    actions,
    'btn btn-secondary btn-upgrades',
    ICON_ARROW_UP,
  );
  actionsRow.append(play, upgrades);

  const foot = footer(actions);
  lower.append(records, actionsRow, foot.bottom);
  root.append(top, title, hero, lower);
  return { coinValue, bestScoreValue, bestStageValue, upgrades, upgradesDot, ...foot };
}

function menuArtPath(sprite: MenuSprite): string {
  return `${import.meta.env.BASE_URL}${MENU_SPRITE_DIR}${sprite.file}`;
}

function menuImage(sprite: MenuSprite, className: string, alt = ''): HTMLImageElement {
  const image = el('img', className);
  image.src = menuArtPath(sprite);
  image.alt = alt;
  image.draggable = false;
  return image;
}

/** The art's images and stretch measurements, as CSS custom properties on the menu. */
function setMenuArtProperties(root: HTMLElement): void {
  const set = (name: string, value: string | number): void =>
    root.style.setProperty(name, String(value));
  set('--menu-sky', MENU_ART.background.sky);
  const strips: [string, MenuStripSprite][] = [
    ['play', MENU_ART.play],
    ['upgrades', MENU_ART.upgrades],
    ['coins', MENU_ART.coinsPill],
    ['well', MENU_ART.well],
  ];
  for (const [name, sprite] of strips) {
    set(`--menu-${name}-art`, `url("${menuArtPath(sprite)}")`);
    set(`--menu-${name}-slice`, sprite.cap);
    set(`--menu-${name}-cap`, sprite.cap / sprite.height);
  }
  const { card } = MENU_ART;
  set('--menu-card-art', `url("${menuArtPath(card)}")`);
  set('--menu-card-slice', card.slice);
  set('--menu-card-cap', card.slice / card.height);
}

/**
 * The owner's mockup (GAME_DESIGN §2.1, docs/ART_ASSETS.md phase 4): the garden fills the screen,
 * and the logo, the cat, the cards and the buttons sit where they are in the mockup, on a stage of
 * its size scaled to the screen (menu.css). The labels and numbers are live text.
 */
function artLayout(root: HTMLElement, actions: MenuActions): MenuControls {
  setMenuArtProperties(root);
  const background = menuImage(MENU_ART.background, 'menu-bg');

  const stage = el('div', 'menu-stage');
  const glow = el('span', 'menu-glow');
  stage.append(glow);
  for (let i = 1; i <= 5; i++) {
    const big = i === 1 || i === 3;
    stage.append(
      menuImage(big ? MENU_ART.sparkle : MENU_ART.sparkleSmall, `menu-sparkle menu-sparkle-${i}`),
    );
  }
  stage.append(menuImage(MENU_ART.hero, 'menu-hero-art'));
  const title = el('h1', 'menu-logo');
  title.append(menuImage(MENU_ART.logo, 'menu-logo-art', APP_NAME));
  stage.append(title);

  const records = el('div', 'menu-art-records');
  records.dataset['testid'] = 'records';
  const card = (label: string, value: HTMLElement, icon: HTMLImageElement): HTMLElement => {
    const node = el('p', 'menu-card');
    node.append(el('span', 'menu-card-label', label), el('span', 'menu-card-well'), icon, value);
    return node;
  };
  const bestScoreValue = recordValue('best-score');
  const bestStageValue = recordValue('best-stage');
  const badge = el('img', 'menu-card-icon is-badge');
  badge.src = `${import.meta.env.BASE_URL}${HUD_SPRITE_DIR}${HUD_BADGE_ART.file}`;
  badge.alt = '';
  badge.draggable = false;
  records.append(
    card('Best score', bestScoreValue, badge),
    card('Best stage', bestStageValue, menuImage(MENU_ART.torii, 'menu-card-icon is-torii')),
  );

  const play = playButton(actions, 'menu-play');
  const { upgrades, upgradesDot } = upgradesButton(actions, 'menu-upgrades');
  upgrades.prepend(menuImage(MENU_ART.arrow, 'menu-upgrades-arrow'));
  stage.append(records, play, upgrades);

  // The top bar stays at the top of the screen, below the safe area.
  const top = el('header', 'menu-art-top');
  const settings = settingsButton(actions, 'menu-gear', '');
  settings.append(menuImage(MENU_ART.gear, 'menu-gear-art'));
  const coins = el('div', 'menu-coins');
  coins.dataset['testid'] = 'coin-balance';
  const coinValue = el('span', 'coin-value', '0');
  coins.append(menuImage(MENU_ART.coin, 'menu-coins-coin'), coinValue);
  const foot = footer(actions);
  top.append(settings, foot.bottom, coins);

  root.append(background, stage, top);
  return { coinValue, bestScoreValue, bestStageValue, upgrades, upgradesDot, ...foot };
}
