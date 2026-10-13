/**
 * The Lightning blessing's effect art (GAME_DESIGN §15.15, docs/ART_ASSETS.md §4.16), made by
 * tools/build-art.ts from the owner's sheets of light on black: chain bolts, sky bolts, an impact
 * flash, a shock ring, a burst of sparks, small arcs and the crackles laid over a struck ball. Null
 * until the sheets are in (the game draws stand-ins). Pure data, no DOM.
 */
import { LIGHTNING_SPRITE_DATA } from './lightningSpriteData';

/** A bolt sprite and its two ends in sprite pixels (`a` where it starts, `b` where it lands). */
export interface LightningBoltSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  /** How wide its zigzag band is, across the line from a to b, in sprite pixels. */
  readonly band: number;
}

/** A square sprite centred on a round piece, and that piece's radius in sprite pixels. */
export interface LightningRoundSprite {
  readonly file: string;
  readonly side: number;
  readonly radius: number;
}

export interface LightningSprites {
  readonly bolts: readonly LightningBoltSprite[];
  /** Standing up: `a` at the top, `b` at the tip's flash. */
  readonly sky: readonly LightningBoltSprite[];
  readonly flash: LightningRoundSprite;
  /** Its radius is the ring's line. */
  readonly ring: LightningRoundSprite;
  readonly sparks: LightningRoundSprite;
  readonly arcs: readonly LightningBoltSprite[];
  /** Their radius is the outermost crackle's. */
  readonly shocks: readonly LightningRoundSprite[];
}

/** Where the sprites live, relative to the app's base URL. */
export const LIGHTNING_SPRITE_DIR = 'assets/fx/';

export const LIGHTNING_ART: LightningSprites | null = LIGHTNING_SPRITE_DATA;

/** Every sprite, in the order the game loads them (none until the art is in). */
export function lightningSprites(art = LIGHTNING_ART): { readonly file: string }[] {
  if (!art) return [];
  const { bolts, sky, flash, ring, sparks, arcs, shocks } = art;
  return [...bolts, ...sky, flash, ring, sparks, ...arcs, ...shocks];
}
