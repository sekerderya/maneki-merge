/**
 * The effect art (GAME_DESIGN §15.9–§15.10, §15.12, §15.14; docs/ART_ASSETS.md §4.12–§4.13), made by
 * tools/build-art.ts from the owner's sheets: Heavy Drop's flames, Porcelain's crack lines and gold
 * kintsugi seams, and Dice's two dice. Pure data, no DOM.
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
  /** Dice's lucky die, then its unlucky one (Batch 19). */
  readonly dice: readonly FxImageSprite[];
  /** Cursed Bell's two stone patterns over a cursed cat, the first half and the rest (Batch 19). */
  readonly stones: readonly PatternSprite[];
}

/** Where the sprites live, relative to the app's base URL. */
export const FX_SPRITE_DIR = 'assets/fx/';

export const FX_ART: FxSprites = FX_SPRITE_DATA;
