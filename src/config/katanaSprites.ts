/**
 * The Katana's art (GAME_DESIGN §15.16, docs/ART_ASSETS.md §4.21), made by tools/build-art.ts from
 * the owner's images: the sword on white, and its sheets of light on black (four slash streaks, a
 * cut flash, a glint, a burst of sparks, a swoosh, a strike burst and a soft flash). Null until the
 * images are in (the game draws stand-ins). Pure data, no DOM.
 */
import type { LightningBoltSprite, LightningRoundSprite } from './lightningSprites';
import { KATANA_SPRITE_DATA } from './katanaSpriteData';

/** The sword, point down, and its two ends in sprite pixels: the hilt's end and the point. */
export interface KatanaSwordSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly topX: number;
  readonly topY: number;
  readonly tipX: number;
  readonly tipY: number;
}

export interface KatanaSprites {
  readonly katana: KatanaSwordSprite;
  /** Straight streaks from `a` to `b`, stretched along a blade's path. */
  readonly slashes: readonly LightningBoltSprite[];
  /** A short straight flash with a star at its middle, laid along a cut. */
  readonly flash: LightningRoundSprite;
  readonly glint: LightningRoundSprite;
  readonly sparks: LightningRoundSprite;
  /** A crescent of light, at the paw as the sword leaves it. */
  readonly swoosh: LightningRoundSprite;
  /** Sparks flying up from the bottom middle: the point striking the floor. */
  readonly strike: LightningRoundSprite;
  /** A soft round flash. */
  readonly glow: LightningRoundSprite;
}

/** Where the sword lives (the effects are in `assets/fx/`), relative to the app's base URL. */
export const KATANA_SWORD_DIR = 'assets/specials/';
export const KATANA_FX_DIR = 'assets/fx/';

export const KATANA_ART: KatanaSprites | null = KATANA_SPRITE_DATA;

/** The effect sprites, in the order the game loads them (none until the art is in). */
export function katanaFxSprites(art = KATANA_ART): { readonly file: string }[] {
  if (!art) return [];
  const { slashes, flash, glint, sparks, swoosh, strike, glow } = art;
  return [...slashes, flash, glint, sparks, swoosh, strike, glow];
}
