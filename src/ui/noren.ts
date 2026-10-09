/**
 * The noren curtain over the jar (GAME_DESIGN §13.1): a DOM image over the canvas and under the
 * HUD, so the paw's arm goes behind it. Its panels are centred on the jar, its hem hangs a fixed
 * height above the rim, and its plain fabric stretches up to the top of the play area. Pure
 * layout math, unit-tested in Node.
 */
import { NOREN_ART, NOREN_HEM, NOREN_SPAN } from '../config/sceneSprites';
import type { NorenSprite } from '../config/sceneSprites';
import { JAR_WIDTH } from '../config/stages';

/** The jar's inside on screen, CSS pixels. */
export interface NorenJarBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** Where the curtain goes, CSS pixels, and how tall its two fixed slices are drawn. */
export interface NorenLayout {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly sliceTop: number;
  readonly sliceBottom: number;
}

export function norenLayout(box: NorenJarBox, art: NorenSprite = NOREN_ART): NorenLayout {
  const unit = (box.right - box.left) / JAR_WIDTH;
  // CSS pixels per image pixel.
  const scale = (NOREN_SPAN * JAR_WIDTH * unit) / (art.right - art.left);
  const centre = (box.left + box.right) / 2;
  const sliceTop = art.sliceTop * scale;
  const sliceBottom = (art.height - art.sliceBottom) * scale;
  const bottom = box.top - NOREN_HEM * unit + (art.height - art.hem) * scale;
  // Up to the top of the play area, but never shorter than the rod, the coin and the band.
  const height = Math.max(bottom, sliceTop + sliceBottom);
  return {
    left: centre - ((art.left + art.right) / 2) * scale,
    top: bottom - height,
    width: art.width * scale,
    height,
    sliceTop,
    sliceBottom,
  };
}
