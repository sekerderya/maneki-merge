/**
 * The HUD art (GAME_DESIGN §2.3, §13.1, docs/ART_ASSETS.md phase 3): the coins card, the score
 * card's paw badge, the next-cat bubble and the pause button, made by tools/build-art.ts from the
 * owner's images. The labels and numbers are live text on top. Pure data.
 */
import {
  HUD_BADGE_SPRITE,
  HUD_COINS_SPRITE,
  HUD_NEXT_SPRITE,
  HUD_PAUSE_SPRITE,
} from './hudSpriteData';

export interface HudSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** A card with an icon (the coin) on its left end and room for text after it. */
export interface HudCardSprite extends HudSprite {
  /** The text area's left and right edges, as fractions of the width. */
  readonly textLeft: number;
  readonly textRight: number;
  /** The icon's centre, as fractions of the width and height (flying coins land there). */
  readonly iconX: number;
  readonly iconY: number;
}

/** The round bubble the next cat shows in, with a tag on its rim for "NEXT". */
export interface HudBubbleSprite extends HudSprite {
  /** The circle's centre (fractions of the size), its radius (of the width), the tag's centre. */
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly tagY: number;
}

/** Where the sprites live, relative to the app's base URL. */
export const HUD_SPRITE_DIR = 'assets/hud/';

export const HUD_COINS_ART: HudCardSprite = HUD_COINS_SPRITE;
/** The pink paw badge on the score card's top-left corner. */
export const HUD_BADGE_ART: HudSprite = HUD_BADGE_SPRITE;
export const HUD_NEXT_ART: HudBubbleSprite = HUD_NEXT_SPRITE;
export const HUD_PAUSE_ART: HudSprite = HUD_PAUSE_SPRITE;
