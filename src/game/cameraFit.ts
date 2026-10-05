/**
 * Camera fit (TECH_SPEC §4): show the jar plus its side margins, the dropper band above the rim
 * and a floor margin inside the play band, letterboxed, with the floor near the bottom. Pure
 * math, no Phaser, so it is unit-tested in Node.
 */
import { CAMERA_FLOOR_MARGIN_RATIO, CAMERA_SIDE_MARGIN_RATIO } from '../config/view';

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
 * Fits the jar into a viewport of `viewWidth` × `viewHeight` canvas pixels. Spare height goes
 * above the dropper, so the floor stays near the bottom of the play band.
 */
export function fitCamera(jar: JarFrame, viewWidth: number, viewHeight: number): CameraFit {
  const region = framedRegion(jar);
  const w = Math.max(1, viewWidth);
  const h = Math.max(1, viewHeight);
  const zoom = Math.min(w / region.width, h / region.height);
  return { zoom, centerX: 0, centerY: region.bottom - h / zoom / 2 };
}

/** Linear blend of two jar frames (t = 0 → a, t = 1 → b). */
export function lerpFrame(a: JarFrame, b: JarFrame, t: number): JarFrame {
  return {
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
    headroom: a.headroom + (b.headroom - a.headroom) * t,
  };
}

/** Smooth ease in-out on 0–1. */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
