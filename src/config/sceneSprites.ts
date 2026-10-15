/**
 * The scene art (GAME_DESIGN §13.1, docs/ART_ASSETS.md phase 2): the bamboo jar, the dropper's paw
 * and the shrine-garden background, raster images made by tools/build-art.ts from the owner's
 * files. The measured data is in sceneSpriteData.ts; the choices here place the art. Pure data.
 */
import { JAR_HEIGHT, JAR_WIDTH } from './stages';
import type { TimeOfDay } from './timeOfDay';
import { BACKGROUND_SPRITES, JAR_SPRITE, PAW_SPRITE } from './sceneSpriteData';

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

/** Where the day picture's pixel (u, v) lies in a background: (u · sx + x, v · sy + y). */
export interface BackgroundFit {
  readonly sx: number;
  readonly sy: number;
  readonly x: number;
  readonly y: number;
}

export interface BackgroundSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** The sky's colour at the top of the image (the screen above it) and the floor's at the bottom. */
  readonly sky: string;
  readonly ground: string;
  /**
   * Its fit onto the jar's day picture: the day picture's own is (1, 1, 0, 0); a sunset or a
   * night is the owner's edit of it, a little zoomed in, measured by tools/backgroundFit.ts.
   */
  readonly fit: BackgroundFit;
}

/** One jar's backgrounds by time of day (GAME_DESIGN §7.3); a missing time shows the day. */
export interface BackgroundSet {
  readonly day: BackgroundSprite;
  readonly sunset?: BackgroundSprite;
  readonly night?: BackgroundSprite;
}

/** Where the sprites live, relative to the app's base URL. */
export const SCENE_SPRITE_DIR = 'assets/scene/';

export const JAR_ART: JarSprite = JAR_SPRITE;
export const PAW_ART: PawSprite = PAW_SPRITE;
/**
 * The backgrounds, one set per jar (GAME_DESIGN §7): the jar grows every JAR_GROWTH_STAGES stages
 * and each grown jar stands in a bigger place, up to five. Jars past the last painted one keep it.
 */
export const BACKGROUND_ARTS: readonly BackgroundSet[] = BACKGROUND_SPRITES;

/**
 * The background of jar `jar` (1 for stages 1–5, 2 for 6–10, …; config/stages.ts stageJar) at
 * `time` (GAME_DESIGN §7.3), the day's where that time isn't painted.
 */
export function backgroundArt(jar: number, time: TimeOfDay = 'day'): BackgroundSprite {
  const index = Math.min(Math.max(1, Math.floor(jar)), BACKGROUND_ARTS.length) - 1;
  const set = BACKGROUND_ARTS[index] as BackgroundSet;
  return set[time] ?? set.day;
}

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
 * The paw floats over the jar (v0.25): this much of the image shows above its bottom, world
 * units (the paw itself is about 102), and the top PAW_ART_FADE of that fades out.
 */
export const PAW_ART_SHOWN = 160;
export const PAW_ART_FADE = 55;

/**
 * Where the jar stands in the background image (px): the centre of its inside, its inside's width
 * and its floor. Chosen so the feet stand on the painted rug, between the lanterns. Every
 * background is painted with the jar's place in the same spot (docs/ART_ASSETS.md phase 9).
 */
export const BACKGROUND_JAR = { cx: 384, width: 560, floor: 1200 } as const;

/**
 * The background files (under SCENE_SPRITE_DIR) painted for another time of day than `time`: the
 * loading screen leaves them out, as a day's play shows only one time's (GAME_DESIGN §7.3).
 */
export function otherTimesFiles(time: TimeOfDay): Set<string> {
  const files = new Set<string>();
  for (const set of BACKGROUND_ARTS) {
    for (const other of ['sunset', 'night'] as const) {
      const art = set[other];
      if (art && other !== time) files.add(art.file);
    }
  }
  return files;
}

/** Where the jar stands in `art`'s own pixels: BACKGROUND_JAR moved by its fit. */
export function backgroundJar(art: BackgroundSprite): {
  readonly cx: number;
  readonly width: number;
  readonly floor: number;
} {
  const { sx, sy, x, y } = art.fit;
  return {
    cx: BACKGROUND_JAR.cx * sx + x,
    width: BACKGROUND_JAR.width * sx,
    floor: BACKGROUND_JAR.floor * sy + y,
  };
}
