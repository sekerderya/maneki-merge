/**
 * The HUD art (GAME_DESIGN §2.3, §13.1, docs/ART_ASSETS.md phase 3): the score card (v0.22), the
 * coin on the coins card (which is CSS, after the owner's reference image), the next-cat bubble,
 * the pause button and the paw badge (the menu's record cards), made by tools/build-art.ts from the
 * owner's images. Pure data.
 */
import {
  HUD_BADGE_SPRITE,
  HUD_COIN_SPRITE,
  HUD_NEXT_SPRITE,
  HUD_PAUSE_SPRITE,
  HUD_SCORE_CARD_SPRITE,
} from './hudSpriteData';

export interface HudSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** The round bubble the next cat shows in, with a tag on its rim for "NEXT". */
export interface HudBubbleSprite extends HudSprite {
  /** The circle's centre (fractions of the size), its radius (of the width), the tag's centre. */
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly tagY: number;
}

/**
 * The score card (v0.22): the paw at its left end, a caramel well for the score, "SCORE:" above
 * it. Image pixels; the columns between the two slices are plain and stretch for long scores.
 */
export interface HudScoreCardSprite extends HudSprite {
  readonly sliceLeft: number;
  readonly sliceRight: number;
  /** The card's body (the paw sticks out past its left edge): outer left and right edges. */
  readonly cardLeft: number;
  readonly cardRight: number;
  /** The card's outline: its top and bottom rows. */
  readonly top: number;
  readonly bottom: number;
  readonly wellTop: number;
  readonly wellBottom: number;
  /** The well's left edge beside the paw's arm (at its middle row) and its right end. */
  readonly wellLeft: number;
  readonly wellRight: number;
}

/** Where the sprites live, relative to the app's base URL. */
export const HUD_SPRITE_DIR = 'assets/hud/';

/** The gold coin before the run's coins. */
export const HUD_COIN_ART: HudSprite = HUD_COIN_SPRITE;
/** The pink paw badge on the menu's record cards (on the score card until v0.22). */
export const HUD_BADGE_ART: HudSprite = HUD_BADGE_SPRITE;
export const HUD_NEXT_ART: HudBubbleSprite = HUD_NEXT_SPRITE;
export const HUD_PAUSE_ART: HudSprite = HUD_PAUSE_SPRITE;
export const HUD_SCORE_CARD_ART: HudScoreCardSprite = HUD_SCORE_CARD_SPRITE;
