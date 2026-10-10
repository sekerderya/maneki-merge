import { ART_BOX, ART_PAD, ART_TWO_DIGIT_SCALE, catLook } from '../config/catArt';
import { CAT_SPRITE_DIR, CAT_SPRITES, catSprite } from '../config/catSprites';
import type { CatSprite } from '../config/catSprites';
import type { ArtShape, CatLook } from '../config/catArt';
import { OUTLINE_DARKEN, tierColor } from '../config/skin';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR, boulderSprite } from '../config/specialSprites';
import { darken } from '../core/color';
import type { Drop } from '../core/dropQueue';
import { el } from './dom';
import { boulderSvg, HANABI_SVG, JOKER_SVG, MAGNET_SVG } from './icons';

/** Which art DOM icons use; `?skin=` switches them along with the game. */
export type IconSkin = 'art' | 'vector' | 'placeholder';

let iconSkin: IconSkin = 'art';

export function setIconSkin(skin: IconSkin): void {
  iconSkin = skin;
}

const SIDE = ART_BOX + 2 * ART_PAD;
const VIEW_BOX = `${-ART_PAD} ${-ART_PAD} ${SIDE} ${SIDE}`;
const HERO_ART_LOOK = 9;
const HERO_VECTOR_LOOK = 6;
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
export function catSvg(look: CatLook): string {
  let markup = svgCache.get(look.name);
  if (!markup) {
    markup =
      `<svg viewBox="${VIEW_BOX}" aria-hidden="true" focusable="false" ` +
      `stroke-linecap="round" stroke-linejoin="round">${look.shapes.map(shapeMarkup).join('')}</svg>`;
    svgCache.set(look.name, markup);
  }
  return markup;
}

/**
 * A cat as a DOM icon (HUD preview and goal, banners, Game Over): its art, with the tier number on
 * its plate for the vector and placeholder skins (the cat art shows none). Size comes from CSS
 * (`--size`); `data-tier` holds the tier.
 */
export function catIcon(tier: number): HTMLElement {
  const icon = el('span', 'cat-icon');
  paintCatIcon(icon, tier);
  return icon;
}

/**
 * A ball from the dropper's queue as a DOM icon (the HUD's NEXT, GAME_DESIGN §15.1): a cat (a
 * golden one glows), the magnet, a boulder with its bands, a hanabi or a joker.
 */
export function paintDropIcon(icon: HTMLElement, drop: Drop): void {
  icon.classList.toggle('is-golden', drop.golden);
  icon.dataset['kind'] = drop.kind;
  if (drop.kind === 'cat') {
    paintCatIcon(icon, drop.tier);
    return;
  }
  const painted = `${iconSkin}:${drop.kind === 'boulder' ? `boulder:${drop.hits}` : drop.kind}`;
  if (icon.dataset['painted'] === painted) return;
  icon.dataset['painted'] = painted;
  delete icon.dataset['tier'];
  icon.classList.remove('is-placeholder', 'is-two-digits');
  icon.style.removeProperty('--cat-color');
  icon.style.removeProperty('--cat-outline');
  if (iconSkin === 'art') {
    const sprite = drop.kind === 'boulder' ? boulderSprite(drop.hits - 1) : SPECIAL_ART[drop.kind];
    paintSpecialArt(icon, sprite);
    return;
  }
  icon.innerHTML =
    drop.kind === 'magnet'
      ? MAGNET_SVG
      : drop.kind === 'hanabi'
        ? HANABI_SVG
        : drop.kind === 'joker'
          ? JOKER_SVG
          : boulderSvg(Math.max(0, drop.hits - 1));
}

export function paintCatIcon(icon: HTMLElement, tier: number): void {
  const painted = `${iconSkin}:${tier}`;
  if (icon.dataset['painted'] === painted) return;
  icon.dataset['painted'] = painted;
  icon.dataset['tier'] = String(tier);
  icon.classList.toggle('is-two-digits', tier >= 10);
  if (iconSkin === 'placeholder') {
    paintPlaceholder(icon, tier);
    return;
  }
  icon.classList.remove('is-placeholder');
  if (iconSkin === 'art') {
    paintArt(icon, tier);
    return;
  }
  const look = catLook(tier);
  const plate = look.number;
  const digits = tier >= 10 ? ART_TWO_DIGIT_SCALE : 1;
  const number = el('span', 'cat-icon-num', String(tier));
  number.style.setProperty('--num-y', `${((plate.y + ART_PAD) / SIDE) * 100}%`);
  number.style.setProperty('--num-size', String((plate.size * digits * ICON_NUMBER_BOOST) / SIDE));
  number.style.setProperty('--num-color', plate.color);
  number.style.setProperty('--num-halo', plate.halo);
  icon.innerHTML = catSvg(look);
  icon.append(number);
}

/**
 * The cat on the menu's cushion (GAME_DESIGN §2.1): the golden Kin (look 9) of the cat art, or the
 * calico (look 6) of the vector cats. The placeholder skin keeps the vector cat.
 */
export function paintHeroCat(node: HTMLElement): void {
  if (iconSkin === 'art') {
    const image = el('img');
    image.src = catSpriteUrl(HERO_ART_LOOK);
    image.alt = '';
    image.draggable = false;
    node.replaceChildren(image);
  } else {
    node.innerHTML = catSvg(catLook(HERO_VECTOR_LOOK));
  }
}

/** The URL of a tier's cat sprite (GAME_DESIGN §13.1). */
export function catSpriteUrl(tier: number): string {
  return `${import.meta.env.BASE_URL}${CAT_SPRITE_DIR}${catSprite(tier).file}`;
}

/** The raster cat: just its sprite, with no number (its look tells its size). */
function paintArt(icon: HTMLElement, tier: number): void {
  const image = el('img');
  image.src = catSpriteUrl(tier);
  image.alt = '';
  image.draggable = false;
  icon.replaceChildren(image);
}

/** The cats' body circle as a share of their sprite's side, on average. */
const CAT_BODY_SHARE =
  CAT_SPRITES.reduce((sum, sprite) => sum + sprite.radius / sprite.side, 0) / CAT_SPRITES.length;

/**
 * A special ball's art (GAME_DESIGN §15): its sprite, scaled so its body is as big in the icon as
 * a cat's (a joker's hat makes its sprite wider than a cat's).
 */
function paintSpecialArt(icon: HTMLElement, sprite: CatSprite): void {
  const image = el('img');
  image.src = `${import.meta.env.BASE_URL}${SPECIAL_SPRITE_DIR}${sprite.file}`;
  image.alt = '';
  image.draggable = false;
  image.style.transform = `scale(${(CAT_BODY_SHARE * sprite.side) / sprite.radius})`;
  icon.replaceChildren(image);
}

/** The flat placeholder look: a CSS circle with the number in the middle. */
function paintPlaceholder(icon: HTMLElement, tier: number): void {
  const color = tierColor(tier);
  icon.classList.add('is-placeholder');
  icon.textContent = String(tier);
  icon.style.setProperty('--cat-color', color);
  icon.style.setProperty('--cat-outline', darken(color, OUTLINE_DARKEN));
}
