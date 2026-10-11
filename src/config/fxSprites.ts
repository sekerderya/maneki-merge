/**
 * The effect art (GAME_DESIGN §15.9–§15.10, §15.12, §15.14; docs/ART_ASSETS.md §4.12–§4.13), made by
 * tools/build-art.ts from the owner's sheets: Heavy Drop's flames, Porcelain's crack lines and gold
 * kintsugi seams, Cursed Bell's bell and ring of flames, and Dice's two dice. Pure data, no DOM.
 */
import { FX_SPRITE_DATA } from './fxSpriteData';

/** A flame: a round head at the bottom, flames rising from it (sprite pixels). */
export interface FlameSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** The head circle, which the game puts under the falling ball. */
  readonly headX: number;
  readonly headY: number;
  readonly headR: number;
}

/** A line pattern in a square sprite, centred on a circle of `radius` px that the cat's covers. */
export interface PatternSprite {
  readonly file: string;
  readonly side: number;
  readonly radius: number;
}

/**
 * The cursed bell (GAME_DESIGN §15.12): the bell on its cord, its blank tag's fill circle (sprite
 * pixels) where the drops left are written.
 */
export interface BellSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly tagX: number;
  readonly tagY: number;
  readonly tagR: number;
}

/** The ring of flames round a cursed cat: a square sprite centred on it, its hole and its outside. */
export interface RingSprite {
  readonly file: string;
  readonly side: number;
  /** The clear hole in the middle (px): the cat goes in it. */
  readonly inner: number;
  readonly outer: number;
}

/** A plain sprite: a die. */
export interface FxImageSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

export interface FxSprites {
  /** The small flame (Heavy Drop 3–4) and the big fireball (level 5). */
  readonly flames: readonly FlameSprite[];
  /** Two crack patterns. */
  readonly cracks: readonly PatternSprite[];
  /** Two gold seams, matching the cracks. */
  readonly seams: readonly PatternSprite[];
  /** Cursed Bell's bell and ring of flames (Batch 19). */
  readonly bell: BellSprite;
  readonly ring: RingSprite;
  /** Dice's lucky die, then its unlucky one (Batch 19). */
  readonly dice: readonly FxImageSprite[];
}

/** Where the sprites live, relative to the app's base URL. */
export const FX_SPRITE_DIR = 'assets/fx/';

export const FX_ART: FxSprites = FX_SPRITE_DATA;
