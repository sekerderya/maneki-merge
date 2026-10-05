/**
 * What the camera frames and where the drawn jar is during an expansion (GAME_DESIGN §7.1,
 * TECH_SPEC §4). Pure math, no Phaser, so it is unit-tested in Node.
 *
 * Everything comes from the run's expansion timeline (fixed ticks) plus the fraction of a tick the
 * frame is into (`alpha`), so the zoom moves smoothly at any refresh rate and never drifts from
 * the physics: the walls arrive at the new stage exactly when the run moves the physics walls.
 */
import { PHYSICS_STEP_MS } from '../config/physics';
import { EXPANSION_ZOOM_MS } from '../config/timings';
import { EXPANSION_WALL_LAG } from '../config/view';
import { clamp } from '../core/math';
import { jarGeometry } from '../physics/geometry';
import type { ExpansionView } from '../run/RunController';
import { easeInOut, lerpFrame } from './cameraFit';
import type { JarFrame } from './cameraFit';

export interface ExpansionFrames {
  /** The jar size the camera fits (TECH_SPEC §4). */
  readonly camera: JarFrame;
  /** The drawn jar: walls at ±width / 2, rim at −height. The floor never moves. */
  readonly jar: JarFrame;
}

/** Zoom progress (0–1) at this frame: the ticks so far plus the fraction of the next one. */
export function zoomProgressAt(expansion: ExpansionView, alpha: number): number {
  if (expansion.phase !== 'zoom') return 1;
  const ms = expansion.elapsedMs + clamp(alpha, 0, 1) * PHYSICS_STEP_MS;
  return clamp(ms / EXPANSION_ZOOM_MS, 0, 1);
}

/**
 * The walls' and rim's progress for a camera progress `t`: they trail the camera by `lag` and
 * catch up at t = 1, so the jar always fits inside what the camera shows.
 */
export function wallProgress(t: number, lag = EXPANSION_WALL_LAG): number {
  if (lag <= 0) return easeInOut(t);
  if (lag >= 1) return t >= 1 ? 1 : 0;
  return easeInOut((t - lag) / (1 - lag));
}

/**
 * Camera and jar frames for this frame. Outside the zoom (no expansion, or its reveal, when the
 * run is already at the new stage) both are the current stage's jar.
 */
export function expansionFrames(
  geometry: JarFrame,
  expansion: ExpansionView | null,
  alpha: number,
): ExpansionFrames {
  if (!expansion || expansion.phase !== 'zoom') return { camera: geometry, jar: geometry };
  const from = jarGeometry(expansion.from);
  const to = jarGeometry(expansion.to);
  const t = zoomProgressAt(expansion, alpha);
  return {
    camera: lerpFrame(from, to, easeInOut(t)),
    jar: lerpFrame(from, to, wallProgress(t)),
  };
}
