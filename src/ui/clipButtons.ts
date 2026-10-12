import type { ClipId } from '../config/clips';
import { ICON_SPRITE_DIR, iconSprite } from '../config/iconSprites';
import { button, el } from './dom';
import { ICON_PLAY } from './icons';
import { artImage } from './uiArt';

/** Makes the round button that plays a card's how-it-works clip (`name`: the card's name). */
export type ClipButtonFactory = (id: ClipId, name: string) => HTMLButtonElement;

export interface ClipButtons {
  readonly create: ClipButtonFactory;
  /** Shows or hides each button's new dot from what the profile has seen. */
  refresh(): void;
}

/**
 * The clip buttons of the shop and pick cards (GAME_DESIGN §2.5): the icon kit's play
 * medallion (or a drawn triangle without the art), with the menu's red dot while the clip has never
 * been opened. A tap opens the clip and never reaches the card under it.
 */
export function createClipButtons(
  seen: (id: ClipId) => boolean,
  onOpen: (id: ClipId, name: string) => void,
  art: boolean,
): ClipButtons {
  const made = new Set<HTMLButtonElement>();
  const sprite = art ? iconSprite('clip') : null;

  const paint = (node: HTMLButtonElement): void => {
    const dot = node.querySelector<HTMLElement>('.clip-dot');
    if (dot) dot.hidden = seen(node.dataset['clip'] as ClipId);
  };

  return {
    create(id, name) {
      const node = button('clip-btn', '');
      node.dataset['clip'] = id;
      node.dataset['testid'] = `clip-btn-${id}`;
      node.setAttribute('aria-label', `How ${name} works`);
      if (sprite) node.append(artImage(`${ICON_SPRITE_DIR}${sprite.file}`, 'clip-btn-art'));
      else node.insertAdjacentHTML('beforeend', ICON_PLAY);
      node.append(el('span', 'notify-dot clip-dot'));
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        onOpen(id, name);
      });
      paint(node);
      made.add(node);
      return node;
    },
    refresh() {
      for (const node of made) {
        // Pick cards are made anew for every pick: forget the ones that are gone.
        if (!node.isConnected) made.delete(node);
        else paint(node);
      }
    },
  };
}
