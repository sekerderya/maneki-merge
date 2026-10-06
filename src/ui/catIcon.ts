import { ART_BOX, ART_PAD, ART_TWO_DIGIT_SCALE, catLook, GOLDEN_SHAPES } from '../config/catArt';
import type { ArtShape, CatLook } from '../config/catArt';
import { GOLD_RING, OUTLINE_DARKEN, tierColor } from '../config/skin';
import { darken } from '../core/color';
import { el } from './dom';

/** Which art DOM icons use; `?skin=placeholder` switches them along with the game. */
export type IconSkin = 'cat' | 'placeholder';

let iconSkin: IconSkin = 'cat';

export function setIconSkin(skin: IconSkin): void {
  iconSkin = skin;
}

const SIDE = ART_BOX + 2 * ART_PAD;
const VIEW_BOX = `${-ART_PAD} ${-ART_PAD} ${SIDE} ${SIDE}`;
/** DOM icons are small, so their numbers are drawn this much bigger than on the art's plate. */
const ICON_NUMBER_BOOST = 1.3;

function shapeMarkup(shape: ArtShape): string {
  const attrs = [`d="${shape.d}"`, `fill="${shape.fill ?? 'none'}"`];
  if (shape.stroke) {
    attrs.push(`stroke="${shape.stroke}"`, `stroke-width="${shape.width ?? 1}"`);
  }
  if (shape.opacity !== undefined) attrs.push(`opacity="${shape.opacity}"`);
  return `<path ${attrs.join(' ')}/>`;
}

const svgCache = new Map<string, string>();

/**
 * A cat's art as inline SVG (TECH_SPEC §7), from the same shapes as the game's textures. The box
 * includes the art's padding, so the body circle spans 100 / 108 of the element.
 */
export function catSvg(look: CatLook, golden: boolean): string {
  const key = `${look.name}:${golden ? 1 : 0}`;
  let markup = svgCache.get(key);
  if (!markup) {
    const shapes = golden ? [...look.shapes, ...GOLDEN_SHAPES] : look.shapes;
    markup =
      `<svg viewBox="${VIEW_BOX}" aria-hidden="true" focusable="false" ` +
      `stroke-linecap="round" stroke-linejoin="round">${shapes.map(shapeMarkup).join('')}</svg>`;
    svgCache.set(key, markup);
  }
  return markup;
}

/**
 * A cat as a DOM icon (HUD preview and goal, banners, Game Over): its art with the tier number on
 * its plate. Size comes from CSS (`--size`); the text content is the tier.
 */
export function catIcon(tier: number, golden: boolean): HTMLElement {
  const icon = el('span', 'cat-icon');
  paintCatIcon(icon, tier, golden);
  return icon;
}

export function paintCatIcon(icon: HTMLElement, tier: number, golden: boolean): void {
  const painted = `${iconSkin}:${tier}:${golden ? 1 : 0}`;
  if (icon.dataset['painted'] === painted) return;
  icon.dataset['painted'] = painted;
  icon.dataset['tier'] = String(tier);
  icon.classList.toggle('is-golden', golden);
  icon.classList.toggle('is-two-digits', tier >= 10);
  if (iconSkin === 'placeholder') {
    paintPlaceholder(icon, tier, golden);
    return;
  }
  icon.classList.remove('is-placeholder');
  const look = catLook(tier);
  const plate = look.number;
  const digits = tier >= 10 ? ART_TWO_DIGIT_SCALE : 1;
  const number = el('span', 'cat-icon-num', String(tier));
  number.style.setProperty('--num-y', `${((plate.y + ART_PAD) / SIDE) * 100}%`);
  number.style.setProperty('--num-size', String((plate.size * digits * ICON_NUMBER_BOOST) / SIDE));
  number.style.setProperty('--num-color', plate.color);
  number.style.setProperty('--num-halo', plate.halo);
  icon.innerHTML = catSvg(look, golden);
  icon.append(number);
}

/** The flat placeholder look: a CSS circle with the number in the middle. */
function paintPlaceholder(icon: HTMLElement, tier: number, golden: boolean): void {
  const color = tierColor(tier);
  icon.classList.add('is-placeholder');
  icon.textContent = String(tier);
  icon.style.setProperty('--cat-color', color);
  icon.style.setProperty('--cat-outline', golden ? GOLD_RING : darken(color, OUTLINE_DARKEN));
}
