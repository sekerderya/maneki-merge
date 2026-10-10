/**
 * Camera fit (TECH_SPEC §4): show the jar plus its side margins, the dropper band above the rim
 * and a floor margin inside the play band, letterboxed. The play band is the canvas below the
 * HUD, which floats over the top of the canvas (`insetTop`). Spare height is shared between the
 * space above the dropper and below the floor (CAMERA_SPARE_BELOW_RATIO). Pure math, no Phaser,
 * so it is unit-tested in Node.
 */
import {
  CAMERA_FLOOR_MARGIN_RATIO,
  CAMERA_SHARED_HEADROOM_RATIO,
  CAMERA_SIDE_MARGIN_RATIO,
  CAMERA_SPARE_BELOW_RATIO,
} from '../config/view';

/** The jar size the camera frames (a stage's geometry, or a blend of two during an expansion). */
export interface JarFrame {
  readonly width: number;
  readonly height: number;
  /** Height of the dropper band above the rim. */
  readonly headroom: number;
}

export interface CameraFit {
  /** Canvas pixels per world unit. */
  readonly zoom: number;
  /** The world point at the centre of the viewport. */
  readonly centerX: number;
  readonly centerY: number;
}

/** The world rectangle that must be visible: x from −w/2, y from `top` (above the rim). */
export function framedRegion(jar: JarFrame): {
  width: number;
  height: number;
  top: number;
  bottom: number;
} {
  const width = jar.width * (1 + 2 * CAMERA_SIDE_MARGIN_RATIO);
  const top = -(jar.height + jar.headroom);
  const bottom = jar.width * CAMERA_FLOOR_MARGIN_RATIO;
  return { width, height: bottom - top, top, bottom };
}

/**
 * Fits the jar into a viewport of `viewWidth` × `viewHeight` canvas pixels, below the top
 * `insetTop` pixels (the HUD). When the band is taller than the framed region, `spareBelow` of
 * the spare height goes below the floor and the rest above the dropper, counting the dropper band
 * past CAMERA_SHARED_HEADROOM_RATIO as spare above (as long as there is that much spare). Frames
 * of the same shape (every stage, every moment of an expansion) get the same spare in pixels, so
 * the floor never moves on screen.
 */
export function fitCamera(
  jar: JarFrame,
  viewWidth: number,
  viewHeight: number,
  spareBelow = CAMERA_SPARE_BELOW_RATIO,
  insetTop = 0,
): CameraFit {
  const region = framedRegion(jar);
  const w = Math.max(1, viewWidth);
  const h = Math.max(1, viewHeight);
  const band = Math.max(1, h - Math.max(0, insetTop));
  const zoom = Math.min(w / region.width, band / region.height);
  const spare = Math.max(0, band / zoom - region.height);
  const reserved = Math.max(0, jar.headroom - CAMERA_SHARED_HEADROOM_RATIO * jar.width);
  const below = Math.min(spare, (spare + reserved) * spareBelow);
  // The band ends at the bottom edge, so the floor's place only depends on the spare below.
  return { zoom, centerX: 0, centerY: region.bottom + below - h / zoom / 2 };
}

/** Where a world point appears in the viewport, in canvas pixels from its top-left corner. */
export function worldToView(
  fit: CameraFit,
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: (x - fit.centerX) * fit.zoom + viewWidth / 2,
    y: (y - fit.centerY) * fit.zoom + viewHeight / 2,
  };
}
