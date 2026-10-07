/**
 * The cat art (GAME_DESIGN §13.1, docs/ART_ASSETS.md): nine raster looks, one per cat size, made by
 * tools/build-art.ts from the owner's images. Each sprite is a square centred on the body circle;
 * the game scales it so that circle lands exactly on the physics radius. The art shows no numbers:
 * a cat's look tells its size. Pure data, no DOM.
 *
 * Looks repeat with the sizes like the vector looks (catArt.ts): size 10 wears look 1.
 */
import { STAGE_TIER_STEP } from './tiers';
import { CAT_SPRITE_DATA } from './catSpriteData';

export interface CatSprite {
  /** File name in CAT_SPRITE_DIR. */
  readonly file: string;
  /** The sprite's side, px (it is square). */
  readonly side: number;
  /** The body circle's radius, px, around the sprite's centre (ears stick out above it). */
  readonly radius: number;
  /** The body's main colour: merge particles and the pop ring use it. */
  readonly color: string;
}

/**
 * The thick dark outline the game draws around every cat (v0.18, like the owner's reference
 * image): it keeps neighbouring cats apart. Its width in world units is CAT_OUTLINE_RATIO of the
 * cat's radius, but at least CAT_OUTLINE_MIN, so small cats keep a visible line. The body is drawn
 * that much smaller, so the outline's outer edge is the physics radius.
 */
export const CAT_OUTLINE_COLOR = '#3b2620';
export const CAT_OUTLINE_RATIO = 0.05;
export const CAT_OUTLINE_MIN = 4.5;
/** The outline's width in world units for a cat of `radius`. */
export function catOutlineWidth(radius: number): number {
  return Math.max(CAT_OUTLINE_MIN, CAT_OUTLINE_RATIO * radius);
}

/** Where the sprites live, relative to the app's base URL. */
export const CAT_SPRITE_DIR = 'assets/cats/';
/** Boot waits this long for the cat images at most, then falls back to the vector cats. */
export const CAT_ART_LOAD_TIMEOUT_MS = 8000;

export const CAT_SPRITES: readonly CatSprite[] = CAT_SPRITE_DATA;

/** The sprite of a tier's look; the same at every stage, like `catLook`. */
export function catSprite(tier: number): CatSprite {
  const index = (((tier - 1) % STAGE_TIER_STEP) + STAGE_TIER_STEP) % STAGE_TIER_STEP;
  const sprite = CAT_SPRITES[index];
  if (!sprite) throw new RangeError(`No cat sprite for tier ${tier}`);
  return sprite;
}
