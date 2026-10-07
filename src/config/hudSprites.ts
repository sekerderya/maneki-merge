/**
 * The HUD art (GAME_DESIGN §2.3, §13.1, docs/ART_ASSETS.md phase 3): the coin and the paw badge on
 * the score and coins cards (which are CSS, after the owner's reference image), the next-cat bubble
 * and the pause button, made by tools/build-art.ts from the owner's images. Pure data.
 */
import {
  HUD_BADGE_SPRITE,
  HUD_COIN_SPRITE,
  HUD_NEXT_SPRITE,
  HUD_PAUSE_SPRITE,
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

/** Where the sprites live, relative to the app's base URL. */
export const HUD_SPRITE_DIR = 'assets/hud/';

/** The gold coin before the run's coins. */
export const HUD_COIN_ART: HudSprite = HUD_COIN_SPRITE;
/** The pink paw badge over the score card's left edge. */
export const HUD_BADGE_ART: HudSprite = HUD_BADGE_SPRITE;
export const HUD_NEXT_ART: HudBubbleSprite = HUD_NEXT_SPRITE;
export const HUD_PAUSE_ART: HudSprite = HUD_PAUSE_SPRITE;
