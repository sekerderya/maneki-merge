/**
 * The growth clouds (GAME_DESIGN §7.1, docs/ART_ASSETS.md phase 10): the owner's cloud puffs,
 * which well up over the screen while the jar grows and part to uncover the next background. The
 * measured data is in cloudSpriteData.ts. Pure data.
 */
import { CLOUD_SPRITE_DATA } from './cloudSpriteData';

/** One cloud's image and its size in pixels. */
export interface CloudSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** Where the sprites live, relative to the app's base URL. */
export const CLOUD_SPRITE_DIR = 'assets/transition/';

/** The clouds in the sheet's reading order: the big ones come first. */
export const CLOUD_SPRITES: readonly CloudSprite[] = CLOUD_SPRITE_DATA;
