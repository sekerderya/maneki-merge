/**
 * The Frog's art (GAME_DESIGN §15.17, docs/ART_ASSETS.md §4.22): its four poses, each a square
 * centred on the body circle like a cat's (catSprites.ts), and its tongue, made by
 * tools/build-art.ts from the owner's images. Each part is null until its image comes: the game
 * draws a stand-in. Pure data, no DOM.
 */
import type { CatSprite } from './catSprites';
import { FROG_SPRITE_DATA } from './frogSpriteData';

/** A piece of the tongue, px. */
export interface TongueSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

export interface FrogSprites {
  /** Calm, mouth open, gulping and sleepy, in that order. */
  readonly poses: readonly CatSprite[] | null;
  /** A slice of the tongue's even middle, stretched from the mouth to the cat. */
  readonly band: TongueSprite | null;
  /** The tongue's round tip: its left edge joins the band. */
  readonly tip: TongueSprite | null;
}

/** The frog's faces (GAME_DESIGN §15.17): in the paw and at rest, its tongue out, a gulp, asleep. */
export type FrogPose = 'calm' | 'open' | 'gulp' | 'sleepy';
export const FROG_POSES: readonly FrogPose[] = ['calm', 'open', 'gulp', 'sleepy'];

/** Where the poses live (with the other special balls) and the tongue (with the effects). */
export const FROG_POSE_DIR = 'assets/specials/';
export const FROG_TONGUE_DIR = 'assets/fx/';

export const FROG_ART: FrogSprites = FROG_SPRITE_DATA;

/** The sprite of `pose`, or null before the art. */
export function frogSprite(pose: FrogPose = 'calm'): CatSprite | null {
  return FROG_ART.poses?.[FROG_POSES.indexOf(pose)] ?? null;
}
