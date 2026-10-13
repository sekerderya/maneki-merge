import { HUD_COIN_ART, HUD_SPRITE_DIR } from '../config/hudSprites';
import { el } from './dom';

/**
 * The coin: the owner's gold coin from the HUD (assets/hud/coin.webp). Every coin on every screen
 * and skin is this one image (v0.42.4), so the HUD, the menu, the Upgrades screen, the banners, the
 * flying coins and the Game Over panel all show the same coin.
 */
export function coinIcon(className = ''): HTMLImageElement {
  const image = el('img', className ? `coin-icon ${className}` : 'coin-icon');
  image.src = `${import.meta.env.BASE_URL}${HUD_SPRITE_DIR}${HUD_COIN_ART.file}`;
  image.width = HUD_COIN_ART.width;
  image.height = HUD_COIN_ART.height;
  image.alt = '';
  image.draggable = false;
  return image;
}
