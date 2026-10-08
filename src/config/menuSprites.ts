/**
 * The main menu's art (GAME_DESIGN §2.1, §13.1, docs/ART_ASSETS.md phase 4): pieces cut from the
 * owner's mockup by tools/build-art.ts. The measured data is in menuSpriteData.ts; the menu's CSS
 * places them where they sit in the mockup. Pure data.
 */
import { MENU_SPRITE_DATA } from './menuSpriteData';

export interface MenuSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** A horizontal three-slice strip: `cap` px at each end stay whole, the middle stretches. */
export interface MenuStripSprite extends MenuSprite {
  readonly cap: number;
}

/** A nine-slice frame: `slice` px on every side stay whole, the middle stretches. */
export interface MenuFrameSprite extends MenuSprite {
  readonly slice: number;
}

export interface MenuSprites {
  /** The garden, the mockup without its interface; `sky` fills the screen above it. */
  readonly background: MenuSprite & { readonly sky: string };
  readonly logo: MenuSprite;
  /** The golden cat on its pink cushion. */
  readonly hero: MenuSprite;
  /** The round settings button with its gear. */
  readonly gear: MenuSprite;
  readonly play: MenuStripSprite;
  readonly upgrades: MenuStripSprite;
  readonly coinsPill: MenuStripSprite;
  /** A record card's frame, and the sunken well its number sits in. */
  readonly card: MenuFrameSprite;
  readonly well: MenuStripSprite;
  readonly coin: MenuSprite;
  readonly torii: MenuSprite;
  readonly arrow: MenuSprite;
  readonly sparkle: MenuSprite;
  readonly sparkleSmall: MenuSprite;
}

/** Where the sprites live, relative to the app's base URL. */
export const MENU_SPRITE_DIR = 'assets/menu/';

export const MENU_ART: MenuSprites = MENU_SPRITE_DATA;

/** Every menu sprite, for preloading. */
export function menuSprites(): MenuSprite[] {
  return Object.values(MENU_ART) as MenuSprite[];
}

/** The mockup the menu is laid out on: every position in menu.css is in its pixels. */
export const MENU_MOCKUP_WIDTH = 768;
export const MENU_MOCKUP_HEIGHT = 1376;
