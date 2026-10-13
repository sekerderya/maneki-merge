import { ICON_SPRITE_DIR, iconSprite } from '../../config/iconSprites';
import { SCENARIO_GROUP_INFO, SCENARIOS } from '../../config/scenarios';
import type { ScenarioDef } from '../../config/scenarios';
import { SHOP_ART, SHOP_SPRITE_DIR } from '../../config/shopSprites';
import { button, el } from '../dom';
import { ICON_CHEVRON, ICON_CLOSE, pickIcon, UPGRADE_ICONS } from '../icons';
import { pickArt } from '../pickArt';
import { artImage, setUiArtProperties } from '../uiArt';

export interface ScenesActions {
  /** Plays the scene: the game opens on its jar. */
  onStart(scene: ScenarioDef): void;
  onClose(): void;
}

export interface ScenesView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
}

/** The medallion of a scene's group: the ball it is about, or Second Chance's icon. */
function groupIcon(scene: ScenarioDef, art: boolean): HTMLElement {
  const tile = el('span', 'settings-icon scenes-icon');
  const pick = SCENARIO_GROUP_INFO[scene.group].pick;
  if (pick === null) {
    const sprite = art ? iconSprite('secondChance') : null;
    if (sprite) tile.append(artImage(`${ICON_SPRITE_DIR}${sprite.file}`, 'scenes-icon-art'));
    else tile.insertAdjacentHTML('beforeend', UPGRADE_ICONS.secondChance);
    return tile;
  }
  const ball = art ? pickArt(pick, 0) : null;
  if (ball) {
    const image = artImage(ball.path, 'scenes-icon-ball');
    image.style.width = `${ball.width * 100}%`;
    tile.classList.toggle('is-golden', ball.golden);
    tile.append(image);
  } else {
    tile.insertAdjacentHTML('beforeend', pickIcon(pick));
  }
  return tile;
}

/**
 * The Scenes panel over the main menu (GAME_DESIGN §2.6): every scene, two per special ball and
 * rule, with what to do in it and its stage. A tap plays it. It is the Settings panel's card
 * (settings.css, panel-art.css) with a scrolling list (scenes.css).
 */
export function createScenesPanel(
  root: HTMLElement,
  actions: ScenesActions,
  art = false,
): ScenesView {
  const overlay = el('div', 'overlay settings-overlay scenes-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = 'scenes-panel';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Scenes');
  overlay.hidden = true;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) actions.onClose();
  });

  const card = el('section', 'settings-card scenes-card');
  const header = el('header', 'settings-header');
  const close = button('icon-btn settings-close', '', art ? '' : ICON_CLOSE);
  if (art) close.append(artImage(`${SHOP_SPRITE_DIR}${SHOP_ART.close.file}`, 'settings-close-art'));
  close.setAttribute('aria-label', 'Close');
  close.dataset['testid'] = 'scenes-close';
  close.addEventListener('click', actions.onClose);
  header.append(el('h2', 'settings-title', 'Scenes'), close);

  const list = el('div', 'settings-list scenes-list');
  // Touch scrolling is blocked everywhere else (platform/viewport.ts).
  list.dataset['scrollable'] = '';
  for (const scene of SCENARIOS) {
    const row = button('settings-row scenes-row', '');
    row.dataset['testid'] = `scene-${scene.id}`;
    const text = el('span', 'settings-text');
    text.append(
      el('span', 'scenes-group', SCENARIO_GROUP_INFO[scene.group].name),
      el('span', 'settings-label', scene.name),
      el('span', 'settings-sub', scene.line),
    );
    const stage = el('span', 'scenes-stage', `Stage ${scene.stage}`);
    const chevron = el('span', 'settings-chevron');
    chevron.insertAdjacentHTML('beforeend', ICON_CHEVRON);
    row.append(groupIcon(scene, art), text, stage, chevron);
    row.addEventListener('click', () => actions.onStart(scene));
    list.append(row);
  }

  // The card's tan strip: what a scene is.
  const footer = el('p', 'settings-version', 'Set-up moments for clips; nothing in them counts.');

  card.append(header, list, footer);
  overlay.append(card);
  root.append(overlay);

  return {
    get visible() {
      return !overlay.hidden;
    },
    show() {
      overlay.hidden = false;
      list.scrollTop = 0;
    },
    hide() {
      overlay.hidden = true;
    },
  };
}
