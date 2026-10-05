import { SHOP_BALANCE_COUNT_MS } from '../../config/view';
import { UPGRADE_IDS, UPGRADES } from '../../config/upgrades';
import type { UpgradeId } from '../../config/upgrades';
import { formatNumber } from '../../core/format';
import { shopCard } from '../../core/shop';
import type { UpgradeLevels } from '../../core/upgrades';
import { button, el } from '../dom';
import { ICON_CLOSE, ICON_COIN, UPGRADE_ICONS } from '../icons';

export interface ShopActions {
  onBuy(id: UpgradeId): void;
  onClose(): void;
}

export interface ShopView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
  /** Shows the wallet and the levels. A lower balance (a purchase) counts down to it. */
  update(levels: UpgradeLevels, coins: number): void;
  /** Feedback for a purchase that went through: the card pulses. */
  purchased(id: UpgradeId): void;
}

interface CardParts {
  readonly root: HTMLElement;
  readonly level: HTMLElement;
  readonly pips: HTMLElement[];
  readonly current: HTMLElement;
  readonly arrow: HTMLElement;
  readonly next: HTMLElement;
  readonly buy: HTMLButtonElement;
  readonly price: HTMLElement;
}

/** Shop panel over the main menu (GAME_DESIGN §2.2): one card per upgrade, scrolling. */
export function createShopPanel(root: HTMLElement, actions: ShopActions): ShopView {
  const overlay = el('div', 'overlay shop-overlay');
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
  balance.insertAdjacentHTML('beforeend', ICON_COIN);
  const balanceValue = el('span', 'coin-value', '0');
  balance.append(balanceValue);
  const close = button('icon-btn shop-close', '', ICON_CLOSE);
  close.setAttribute('aria-label', 'Close');
  close.dataset['testid'] = 'shop-close';
  close.addEventListener('click', actions.onClose);
  header.append(title, balance, close);

  const list = el('div', 'shop-list');
  list.dataset['scrollable'] = '';
  const cards = new Map<UpgradeId, CardParts>();
  for (const id of UPGRADE_IDS) {
    const card = createCard(id, () => actions.onBuy(id));
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
    update(levels, coins) {
      for (const [id, card] of cards) paintCard(card, levels, coins, id);
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

function createCard(id: UpgradeId, onBuy: () => void): CardParts {
  const def = UPGRADES[id];
  const root = el('article', 'shop-card');
  root.dataset['testid'] = `shop-card-${id}`;
  root.addEventListener('animationend', () => root.classList.remove('is-bought'));

  const icon = el('span', 'shop-icon');
  icon.insertAdjacentHTML('beforeend', UPGRADE_ICONS[id]);

  const info = el('div', 'shop-info');
  const head = el('div', 'shop-head');
  const level = el('span', 'shop-level');
  level.dataset['testid'] = `shop-level-${id}`;
  head.append(el('h3', 'shop-name', def.name), level);

  const pipRow = el('div', 'shop-pips');
  pipRow.setAttribute('aria-hidden', 'true');
  const pips = Array.from({ length: def.maxLevel }, () => el('span', 'shop-pip'));
  pipRow.append(...pips);
  pipRow.classList.toggle('is-dense', def.maxLevel > 5);

  const desc = el('p', 'shop-desc', def.description);

  const foot = el('div', 'shop-foot');
  const value = el('p', 'shop-value');
  value.dataset['testid'] = `shop-value-${id}`;
  const current = el('span', 'shop-current');
  const arrow = el('span', 'shop-arrow', '→');
  const next = el('span', 'shop-next');
  value.append(el('span', 'shop-stat', def.statLabel), current, arrow, next);

  const buy = button('btn shop-buy', '');
  buy.dataset['testid'] = `shop-buy-${id}`;
  buy.addEventListener('click', onBuy);
  const price = el('span', 'shop-price');
  buy.append(price);
  foot.append(value, buy);

  info.append(head, pipRow, desc, foot);
  root.append(icon, info);
  return { root, level, pips, current, arrow, next, buy, price };
}

function paintCard(card: CardParts, levels: UpgradeLevels, coins: number, id: UpgradeId): void {
  const data = shopCard(id, levels, coins);
  card.root.dataset['state'] = data.state;
  card.level.textContent = `${data.level}/${data.maxLevel}`;
  card.pips.forEach((pip, i) => pip.classList.toggle('is-on', i < data.level));
  card.current.textContent = data.current;
  card.arrow.hidden = data.next === null;
  card.next.hidden = data.next === null;
  card.next.textContent = data.next ?? '';

  card.buy.disabled = data.state !== 'affordable';
  card.buy.dataset['state'] = data.state;
  card.buy.querySelector('svg')?.remove();
  if (data.price === null) {
    card.price.textContent = 'MAX';
    card.buy.setAttribute('aria-label', `${data.name} is at the max level`);
  } else {
    card.buy.insertAdjacentHTML('afterbegin', ICON_COIN);
    card.price.textContent = formatNumber(data.price);
    card.buy.setAttribute('aria-label', `Buy ${data.name} level ${data.level + 1}`);
  }
}
