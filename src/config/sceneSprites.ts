/**
 * The scene art (GAME_DESIGN §13.1, docs/ART_ASSETS.md phase 2): the bamboo jar, the dropper's paw
 * and the shrine-garden background, raster images made by tools/build-art.ts from the owner's
 * files. The measured data is in sceneSpriteData.ts; the choices here place the art. Pure data.
 */
import { JAR_HEIGHT, JAR_WIDTH } from './stages';
import { BACKGROUND_SPRITE, JAR_SPRITE, NOREN_SPRITE, PAW_SPRITE } from './sceneSpriteData';

/** A rectangle in an image's pixels. */
export interface PxRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The jar, split into what is drawn behind the cats (the glass's inner edge and the top rail,
 * inside the opening) and in front of them (the bamboo frame). Both images have the source's size;
 * the pieces are the parts that hold something, so the see-through middle costs no fill rate.
 */
export interface JarSprite {
  readonly back: string;
  readonly front: string;
  readonly width: number;
  readonly height: number;
  /** The opening in image pixels: the inner walls, the rim and the floor. */
  readonly left: number;
  readonly right: number;
  readonly rim: number;
  /** The top rail's upper edge over the opening, px: a cat in the dropper hangs above it. */
  readonly railTop: number;
  readonly floor: number;
  readonly backPieces: readonly PxRect[];
  readonly frontPieces: readonly PxRect[];
}

/** The paw at the bottom of a long arm, cut off at the top of the image. */
export interface PawSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** The arm's centre line and the paw's lowest point, px. */
  readonly cx: number;
  readonly bottom: number;
  /** The paw's width at its widest, px. */
  readonly pawWidth: number;
  /** A row of plain arm (no spots): the game stretches it up to the top of the screen. */
  readonly armRow: number;
}

export interface BackgroundSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** The sky's colour at the top of the image (the screen above it) and the floor's at the bottom. */
  readonly sky: string;
  readonly ground: string;
}

/**
 * The noren curtain over the jar (GAME_DESIGN §13.1): a rod on top, four panels, a pink band at the
 * hem. Rows from `sliceTop` to `sliceBottom` are plain fabric, which stretches to any height.
 */
export interface NorenSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** The outer edges of the side panels, px (the rod reaches past them). */
  readonly left: number;
  readonly right: number;
  /** The bottom of the panels, px. */
  readonly hem: number;
  readonly sliceTop: number;
  readonly sliceBottom: number;
}

/** Where the sprites live, relative to the app's base URL. */
export const SCENE_SPRITE_DIR = 'assets/scene/';

export const JAR_ART: JarSprite = JAR_SPRITE;
export const PAW_ART: PawSprite = PAW_SPRITE;
export const BACKGROUND_ART: BackgroundSprite = BACKGROUND_SPRITE;
export const NOREN_ART: NorenSprite = NOREN_SPRITE;

/**
 * The noren's panels span this many jar widths (a phone shows 1.38, CAMERA_SIDE_MARGIN_RATIO), so
 * their outer edges are just off a phone's screen. Its hem hangs NOREN_HEM world units above the
 * rim: the paw and a little of the arm show under it (the paw's bottom is 145–161 units above the
 * rim, its wrist about 95 above that). The fabric reaches up to the top of the screen; when there
 * isn't room for the rod and the coin, they go off the top.
 */
export const NOREN_SPAN = 1.44;
export const NOREN_HEM = 300;
/**
 * Behind the noren the paw's arm reaches this far above the hem, then ends: it shows through the
 * slits up to about the score card's bottom (the owner's mark, v0.23.2; 30 before, which left
 * empty slits above the hem), and never reaches the holes under the rod.
 */
export const NOREN_ARM_OVERLAP = 240;

/** World units per jar image pixel, across and down (the opening fills JAR_WIDTH × JAR_HEIGHT). */
export const JAR_ART_SCALE_X = JAR_WIDTH / (JAR_ART.right - JAR_ART.left);
export const JAR_ART_SCALE_Y = JAR_HEIGHT / (JAR_ART.floor - JAR_ART.rim);

/** The jar's image pixel (x, y) in world units around the centre of the floor. */
export function jarArtToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - (JAR_ART.left + JAR_ART.right) / 2) * JAR_ART_SCALE_X,
    y: (y - JAR_ART.floor) * JAR_ART_SCALE_Y,
  };
}

/** The paw's widest part is this many world units across (the vector paw's width). */
export const PAW_ART_WORLD_WIDTH = 112;

/**
 * Where the jar stands in the background image (px): the centre of its inside, its inside's width
 * and its floor. Chosen so the feet stand on the painted rug, between the lanterns.
 */
export const BACKGROUND_JAR = { cx: 384, width: 560, floor: 1200 } as const;
