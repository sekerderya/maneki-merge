/**
 * The Upgrades screen's art (GAME_DESIGN §2.2, docs/ART_ASSETS.md §4.9): empty pieces cut from the
 * owner's approved mockup by tools/build-art.ts. The measured data is in shopSpriteData.ts; the
 * screen's CSS lays them out at the mockup's proportions. Pure data.
 */
import { SHOP_SPRITE_DATA } from './shopSpriteData';

export interface ShopSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

export interface ShopSprites {
  /**
   * An upgrade card, a nine-slice: `corner` px stay whole at the top and the sides, `bottom` px at
   * the bottom (the tan stat strip).
   */
  readonly card: ShopSprite & { readonly corner: number; readonly bottom: number };
  /** The gold Buy button and the title's cream pill: three-slice strips, `cap` px at each end. */
  readonly buy: ShopSprite & { readonly cap: number };
  readonly title: ShopSprite & { readonly cap: number };
  /** The round close button with its X. */
  readonly close: ShopSprite;
}

/** Where the sprites live, relative to the app's base URL. */
export const SHOP_SPRITE_DIR = 'assets/shop/';

export const SHOP_ART: ShopSprites = SHOP_SPRITE_DATA;

/** The approved mockup the screen is laid out on: its CSS sizes are in its pixels. */
export const SHOP_MOCKUP_WIDTH = 768;
