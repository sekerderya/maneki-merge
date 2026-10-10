/**
 * The pieces cut from the owner's approved Upgrades mockup (docs/ART_ASSETS.md §4.9), shared by
 * the screens built from them: the Upgrades screen and the stage-clear picks. Their images and
 * nine-slice measurements go on the screen's root as CSS custom properties (shop-art.css,
 * pick-art.css lay them out in mockup pixels).
 */
import { MENU_ART, MENU_SPRITE_DIR } from '../config/menuSprites';
import { SHOP_ART, SHOP_MOCKUP_WIDTH, SHOP_SPRITE_DIR } from '../config/shopSprites';
import { el } from './dom';

export function setUiArtProperties(node: HTMLElement): void {
  const set = (name: string, value: string | number): void =>
    node.style.setProperty(name, String(value));
  const url = (path: string): string => `url("${import.meta.env.BASE_URL}${path}")`;
  const { card, buy, title } = SHOP_ART;
  set('--shop-mockup-w', SHOP_MOCKUP_WIDTH);
  set('--shop-card-art', url(`${SHOP_SPRITE_DIR}${card.file}`));
  set('--shop-card-w', card.width);
  set('--shop-card-corner', card.corner);
  set('--shop-card-bottom', card.bottom);
  const strips = [
    ['buy', SHOP_SPRITE_DIR, buy],
    ['title', SHOP_SPRITE_DIR, title],
    // The menu's coins pill and PLAY button.
    ['coins', MENU_SPRITE_DIR, MENU_ART.coinsPill],
    ['play', MENU_SPRITE_DIR, MENU_ART.play],
  ] as const;
  for (const [name, dir, sprite] of strips) {
    set(`--shop-${name}-art`, url(`${dir}${sprite.file}`));
    set(`--shop-${name}-slice`, sprite.cap);
    set(`--shop-${name}-cap`, sprite.cap / sprite.height);
  }
}

/** An image of the art at `path` (relative to the app's base URL), not draggable. */
export function artImage(path: string, className: string): HTMLImageElement {
  const image = el('img', className);
  image.src = `${import.meta.env.BASE_URL}${path}`;
  image.alt = '';
  image.draggable = false;
  return image;
}
