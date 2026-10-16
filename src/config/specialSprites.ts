/**
 * The special balls' art (GAME_DESIGN §13.1, §15, docs/ART_ASSETS.md phase 7): the magnet, the
 * hanabi, the joker cat, the boulder with 0–3 iron bands and the lightning ball (phase 15), made by
 * tools/build-art.ts from the owner's images. Each sprite is a square centred on the ball's body
 * circle, like the cats' (catSprites.ts): the game scales that circle onto the physics radius.
 * Pure data, no DOM.
 */
import type { CatSprite } from './catSprites';
import { SPECIAL_SPRITE_DATA } from './specialSpriteData';

export interface SpecialSprites {
  readonly magnet: CatSprite;
  readonly hanabi: CatSprite;
  readonly joker: CatSprite;
  /** Null until the owner's image comes (docs/ART_ASSETS.md §4.16): the code draws a stand-in. */
  readonly lightning: CatSprite | null;
  /**
   * The katana's ball in the paw and NEXT (GAME_DESIGN §15.16, docs/ART_ASSETS.md §4.21), null until
   * its image comes. The sword that flies out of it is config/katanaSprites.ts's.
   */
  readonly katana: CatSprite | null;
  /** The same stone with 0, 1, 2 and 3 iron bands (one per extra merge it needs). */
  readonly boulders: readonly CatSprite[];
}

/** Where the sprites live, relative to the app's base URL. */
export const SPECIAL_SPRITE_DIR = 'assets/specials/';

export const SPECIAL_ART: SpecialSprites = SPECIAL_SPRITE_DATA;

/** The boulder sprite for `bands` iron bands; more than the art has show its most. */
export function boulderSprite(bands: number): CatSprite {
  const { boulders } = SPECIAL_ART;
  const sprite = boulders[Math.max(0, Math.min(boulders.length - 1, Math.round(bands)))];
  if (!sprite) throw new RangeError('No boulder art');
  return sprite;
}

/** Every special sprite, for preloading. */
export function specialSprites(): CatSprite[] {
  const { magnet, hanabi, joker, lightning, katana, boulders } = SPECIAL_ART;
  return [
    magnet,
    hanabi,
    joker,
    ...(lightning ? [lightning] : []),
    ...(katana ? [katana] : []),
    ...boulders,
  ];
}
