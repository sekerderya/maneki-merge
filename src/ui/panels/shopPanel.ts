import { upgradeClip } from '../../config/clips';
import { ICON_SPRITE_DIR, iconSprite } from '../../config/iconSprites';
import { MENU_ART, MENU_SPRITE_DIR } from '../../config/menuSprites';
import { SHOP_ART, SHOP_SPRITE_DIR } from '../../config/shopSprites';
import { SHOP_BALANCE_COUNT_MS } from '../../config/view';
import { isBlessingCard, UPGRADE_IDS, UPGRADES } from '../../config/upgrades';
import type { ShopSection, UpgradeId } from '../../config/upgrades';
import { formatNumber } from '../../core/format';
import { shopCard } from '../../core/shop';
import type { UpgradeLevels } from '../../core/upgrades';
import type { ClipButtonFactory } from '../clipButtons';
import { coinIcon } from '../coinIcon';
import { button, el } from '../dom';
import { pickArt } from '../pickArt';
import { artImage, setUiArtProperties } from '../uiArt';
import { ICON_CHECK, ICON_CLOSE, pickIcon, UPGRADE_ICONS } from '../icons';

/** The headings over the blessing cards and the weapon cards (GAME_DESIGN §2.2, §10). */
const SECTION_HEADINGS: Readonly<
  Partial<Record<ShopSection, { title: string; desc: string; testid: string }>>
> = {
  blessing: {
    title: 'Blessings',
    desc: 'How far each blessing can go in a run',
    testid: 'shop-blessings',
  },
  weapon: {
    title: 'Weapons',
    desc: 'Each level opens one more of its picks for every run',
    testid: 'shop-weapons',
  },
};

export interface ShopActions {
  onBuy(id: UpgradeId): void;
  onClose(): void;
}

export interface ShopView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
  /**
   * Shows the wallet, the levels and which cards the best stage has opened. A lower balance (a
   * purchase) counts down to it.
   */
  update(levels: UpgradeLevels, coins: number, bestStage: number): void;
  /** Feedback for a purchase that went through: the card pulses. */
  purchased(id: UpgradeId): void;
}

interface CardParts {
  readonly root: HTMLElement;
  readonly level: HTMLElement;
  readonly current: HTMLElement;
  readonly arrow: HTMLElement;
  readonly next: HTMLElement;
  readonly buy: HTMLButtonElement;
  /** "Buy", or "Reach" on a locked card. */
  readonly label: HTMLElement;
  readonly price: HTMLElement;
  readonly need: HTMLElement;
  /** The coin or the check in front of the price. */
  readonly mark: HTMLElement;
  /** The owner's art (the art skin): the coin is the menu's. */
  readonly art: boolean;
}

/**
 * Shop panel over the main menu (GAME_DESIGN §2.2): one card per upgrade, then the blessing cards
 * under their own heading (v0.36), scrolling. A card the best stage hasn't opened yet says which
 * stage opens it where its price would be. With `art`
 * (the art skin) it is the owner's approved mockup (docs/ART_ASSETS.md §4.9): the menu blurred
 * behind, the title on a cream pill, the menu's coins pill, and the cards, buttons and icons in the
 * owner's art (shop-art.css); otherwise the code-drawn sheet of v0.14. A card whose effect has a
 * how-it-works clip gets `clipButton`'s button on its icon (v0.38).
 */
export function createShopPanel(
  root: HTMLElement,
  actions: ShopActions,
  art = false,
  clipButton?: ClipButtonFactory,
): ShopView {
  const overlay = el('div', 'overlay shop-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = 'shop';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Upgrades');
  overlay.hidden = true;
  // A tap on the dimmed menu above the sheet closes it.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) actions.onClose();
  });

  const sheet = el('div', 'shop-sheet');
  const header = el('header', 'shop-header');
  const title = el('h2', 'shop-title', 'Upgrades');
  const balance = el('div', 'coin-balance shop-balance');
  balance.dataset['testid'] = 'shop-balance';
  balance.append(coinIcon('shop-balance-coin'));
  const balanceValue = el('span', 'coin-value', '0');
  balance.append(balanceValue);
  const close = button('icon-btn shop-close', '', art ? '' : ICON_CLOSE);
  if (art) close.append(artImage(`${SHOP_SPRITE_DIR}${SHOP_ART.close.file}`, 'shop-close-art'));
  close.setAttribute('aria-label', 'Close');
  close.dataset['testid'] = 'shop-close';
  close.addEventListener('click', actions.onClose);
  header.append(title, balance, close);

  const list = el('div', 'shop-list');
  list.dataset['scrollable'] = '';
  const cards = new Map<UpgradeId, CardParts>();
  let section: ShopSection = 'upgrade';
  for (const id of UPGRADE_IDS) {
    // Each section after the upgrades opens with its heading.
    const heading = SECTION_HEADINGS[UPGRADES[id].section];
    if (UPGRADES[id].section !== section && heading) {
      section = UPGRADES[id].section;
      const header = el('div', 'shop-section');
      header.dataset['testid'] = heading.testid;
      header.append(
        el('h3', 'shop-section-title', heading.title),
        el('p', 'shop-section-desc', heading.desc),
      );
      list.append(header);
    }
    const card = createCard(id, art, () => actions.onBuy(id), clipButton);
    cards.set(id, card);
    list.append(card.root);
  }

  sheet.append(header, list);
  overlay.append(sheet);
  root.append(overlay);

  // The balance shown, which counts down after a purchase.
  let shownCoins = 0;
  let countFrame = 0;
  const showBalance = (value: number): void => {
    shownCoins = value;
    balanceValue.textContent = formatNumber(value);
  };
  const countTo = (target: number): void => {
    cancelAnimationFrame(countFrame);
    const from = shownCoins;
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / SHOP_BALANCE_COUNT_MS);
      const eased = 1 - (1 - t) ** 3;
      showBalance(Math.round(from + (target - from) * eased));
      if (t < 1) countFrame = requestAnimationFrame(step);
    };
    countFrame = requestAnimationFrame(step);
  };

  return {
    get visible() {
      return !overlay.hidden;
    },
    show() {
      list.scrollTop = 0;
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
    update(levels, coins, bestStage) {
      for (const [id, card] of cards) paintCard(card, levels, coins, bestStage, id);
      cancelAnimationFrame(countFrame);
      if (coins < shownCoins && !overlay.hidden) countTo(coins);
      else showBalance(coins);
    },
    purchased(id) {
      const card = cards.get(id);
      if (!card) return;
      card.root.classList.remove('is-bought');
      void card.root.offsetWidth; // restart the CSS animation
      card.root.classList.add('is-bought');
    },
  };
}

function createCard(
  id: UpgradeId,
  art: boolean,
  onBuy: () => void,
  clipButton?: ClipButtonFactory,
): CardParts {
  const def = UPGRADES[id];
  const root = el('article', 'shop-card');
  root.dataset['testid'] = `shop-card-${id}`;
  root.addEventListener('animationend', () => root.classList.remove('is-bought'));

  const icon = el('span', 'shop-icon');
  const sprite = art ? iconSprite(id) : null;
  if (isBlessingCard(id)) {
    // The blessing's own ball in a gold-rimmed medallion, as on its pick card (pickArt.ts).
    icon.classList.add('is-blessing');
    const ball = art ? pickArt(id, 0) : null;
    if (ball) {
      const image = artImage(ball.path, 'shop-icon-ball');
      image.style.width = `${ball.width * 100}%`;
      icon.classList.toggle('is-golden', ball.golden);
      icon.append(image);
    } else {
      icon.insertAdjacentHTML('beforeend', pickIcon(id));
    }
  } else if (sprite) {
    icon.classList.add('is-art');
    icon.append(artImage(`${ICON_SPRITE_DIR}${sprite.file}`, 'shop-icon-art'));
  } else {
    icon.insertAdjacentHTML('beforeend', UPGRADE_ICONS[id]);
  }
  const clip = upgradeClip(id);
  if (clip && clipButton) icon.append(clipButton(clip, def.name));

  const info = el('div', 'shop-info');
  const head = el('div', 'shop-head');
  const level = el('span', 'shop-level');
  level.dataset['testid'] = `shop-level-${id}`;
  head.append(el('h3', 'shop-name', def.name), level);

  const desc = el('p', 'shop-desc', def.description);

  const foot = el('div', 'shop-foot');
  const value = el('p', 'shop-value');
  value.dataset['testid'] = `shop-value-${id}`;
  const current = el('span', 'shop-current');
  const arrow = el('span', 'shop-arrow', '→');
  const next = el('span', 'shop-next');
  value.append(el('span', 'shop-stat', def.statLabel), current, arrow, next);

  const buy = button('btn shop-buy', '');
  buy.dataset['sfx'] = 'none'; // A purchase plays its own sound.
  buy.dataset['testid'] = `shop-buy-${id}`;
  buy.addEventListener('click', onBuy);
  // "Buy" over the coin and the price (the art's button; the code-drawn one shows no label).
  const label = el('span', 'shop-buy-label', 'Buy');
  const line = el('span', 'shop-buy-line');
  const mark = el('span', 'shop-buy-mark');
  const price = el('span', 'shop-price');
  line.append(mark, price);
  buy.append(label, line);
  // Not enough coins: how many are missing, under the price (GAME_DESIGN §2.2).
  const need = el('span', 'shop-need');
  need.dataset['testid'] = `shop-need-${id}`;
  need.hidden = true;
  const buyBox = el('div', 'shop-buy-box');
  buyBox.append(buy, need);
  foot.append(value, buyBox);

  info.append(head, desc, foot);
  root.append(icon, info);
  return { root, level, current, arrow, next, buy, label, price, need, mark, art };
}

function paintCard(
  card: CardParts,
  levels: UpgradeLevels,
  coins: number,
  bestStage: number,
  id: UpgradeId,
): void {
  const data = shopCard(id, levels, coins, bestStage);
  card.root.dataset['state'] = data.state;
  card.level.textContent = `${data.level}/${data.maxLevel}`;
  card.current.textContent = data.current;
  card.arrow.hidden = data.next === null;
  card.next.hidden = data.next === null;
  card.next.textContent = data.next ?? '';

  card.buy.disabled = data.state !== 'affordable';
  card.buy.dataset['state'] = data.state;
  card.need.hidden = data.shortfall === null;
  card.need.textContent =
    data.shortfall === null ? '' : `Need ${formatNumber(data.shortfall)} more`;
  card.label.textContent = data.state === 'locked' ? 'Reach' : 'Buy';
  if (data.price === null) {
    card.mark.innerHTML = ICON_CHECK;
    card.price.textContent = 'MAX';
    card.buy.setAttribute('aria-label', `${data.name} is at the max level`);
  } else if (data.state === 'locked') {
    // "Reach" over the BEST STAGE card's torii and the stage that opens the card.
    if (card.art) {
      card.mark.replaceChildren(artImage(`${MENU_SPRITE_DIR}${MENU_ART.torii.file}`, 'shop-torii'));
    } else {
      card.mark.replaceChildren();
    }
    card.price.textContent = `Stage ${data.gate}`;
    card.buy.setAttribute('aria-label', `${data.name} opens at stage ${data.gate}`);
  } else {
    if (!card.mark.querySelector('.shop-coin')) card.mark.replaceChildren(coinIcon('shop-coin'));
    card.price.textContent = formatNumber(data.price);
    card.buy.setAttribute('aria-label', `Buy ${data.name} level ${data.level + 1}`);
  }
}
