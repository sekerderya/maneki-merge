import type { PickId, PickKind } from '../../config/picks';
import { PICK_ARM_MS } from '../../config/view';
import type { PickCard } from '../../core/picks';
import { button, el } from '../dom';
import { PICK_ICONS } from '../icons';

export interface PickActions {
  onChoose(id: PickId): void;
}

export interface PickView {
  readonly visible: boolean;
  /** Shows a pick's cards (a trial or a blessing); nothing is selected yet. */
  show(kind: PickKind, cards: readonly PickCard[]): void;
  hide(): void;
}

const TITLES: Readonly<Record<PickKind, { title: string; detail: string }>> = {
  trial: { title: 'Choose a trial', detail: 'The coming stages get harder' },
  blessing: { title: 'Choose a blessing', detail: 'It lasts for the whole run' },
};

/**
 * A stage clear's pick (GAME_DESIGN §15.5): up to three cards over the dimmed jar. A tap selects
 * a card, Choose confirms it; taps in the panel's first PICK_ARM_MS are ignored, so a tap still in
 * flight from the last drop can't pick. There is no skip and no reroll.
 */
export function createPickOverlay(root: HTMLElement, actions: PickActions): PickView {
  const overlay = el('div', 'overlay game-overlay pick-overlay');
  overlay.dataset['testid'] = 'pick-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.hidden = true;

  const panel = el('div', 'overlay-panel pick-panel');
  const title = el('h2', 'overlay-title pick-title');
  const detail = el('p', 'pick-detail');
  const list = el('div', 'pick-cards');
  const choose = button('btn btn-primary overlay-main-btn pick-choose', 'Choose');
  choose.dataset['testid'] = 'pick-choose';
  panel.append(title, detail, list, choose);
  overlay.append(panel);
  root.append(overlay);

  let selected: PickId | null = null;
  let armedAt = 0;
  const armed = (): boolean => performance.now() >= armedAt;

  const select = (id: PickId): void => {
    if (!armed()) return;
    selected = id;
    for (const card of list.children) {
      const on = (card as HTMLElement).dataset['id'] === id;
      card.classList.toggle('is-selected', on);
      card.setAttribute('aria-pressed', String(on));
    }
    choose.disabled = false;
  };

  choose.addEventListener('click', () => {
    if (!armed() || selected === null) return;
    const id = selected;
    selected = null;
    choose.disabled = true;
    actions.onChoose(id);
  });

  return {
    get visible() {
      return !overlay.hidden;
    },
    show(kind, cards) {
      const text = TITLES[kind];
      title.textContent = text.title;
      detail.textContent = text.detail;
      overlay.setAttribute('aria-label', text.title);
      overlay.dataset['kind'] = kind;
      list.replaceChildren(...cards.map((card) => createCard(card, () => select(card.id))));
      selected = null;
      choose.disabled = true;
      armedAt = performance.now() + PICK_ARM_MS;
      overlay.hidden = false;
      // A new pick pops in again.
      panel.classList.remove('is-new');
      void panel.offsetWidth;
      panel.classList.add('is-new');
    },
    hide() {
      overlay.hidden = true;
      selected = null;
    },
  };
}

function createCard(card: PickCard, onSelect: () => void): HTMLButtonElement {
  const root = button(`pick-card is-${card.kind}`, '');
  root.dataset['id'] = card.id;
  root.dataset['testid'] = `pick-card-${card.id}`;
  root.setAttribute('aria-pressed', 'false');
  root.addEventListener('click', onSelect);

  const icon = el('span', 'pick-icon');
  icon.insertAdjacentHTML('beforeend', PICK_ICONS[card.id]);

  const info = el('span', 'pick-info');
  const head = el('span', 'pick-head');
  head.append(
    el('span', 'pick-name', card.name),
    el('span', 'pick-level', `Lv ${card.level} → ${card.level + 1}`),
  );
  const value = el('span', 'pick-value');
  value.append(
    el('span', 'pick-stat', card.statLabel),
    el('span', 'pick-current', card.current),
    el('span', 'pick-arrow', '→'),
    el('span', 'pick-next', card.next),
  );
  info.append(head, el('span', 'pick-desc', card.description), value);
  root.append(icon, info);
  return root;
}
