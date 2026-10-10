/**
 * What the camera frames and where the drawn jar is during an expansion (GAME_DESIGN §7.1,
 * TECH_SPEC §4). Pure math, no Phaser, so it is unit-tested in Node.
 *
 * Everything comes from the run's expansion timeline (fixed ticks) plus the fraction of a tick the
 * frame is into (`alpha`), so the zoom moves smoothly at any refresh rate and never drifts from
 * the physics. During the zoom the world is still the old stage's: the camera pulls back by
 * STAGE_ZOOM while the drawn walls slide out and the rim rises. At the reveal the run rescales the
 * world by 1 / STAGE_ZOOM, so the grown jar is the current stage's jar again and nothing jumps.
 */
import { PHYSICS_STEP_MS } from '../config/physics';
import { EXPANSION_ZOOM_MS, EXPANSION_ZOOM_START_MS } from '../config/timings';
import { EXPANSION_WALL_LAG, STAGE_ZOOM } from '../config/view';
import { clamp } from '../core/math';
import type { ExpansionView } from '../run/RunController';
import { easeInOut, growFrame } from './cameraFit';
import type { JarFrame } from './cameraFit';

export interface ExpansionFrames {
  /** The jar size the camera fits (TECH_SPEC §4). */
  readonly camera: JarFrame;
  /** The drawn jar: walls at ±width / 2, rim at −height. The floor never moves. */
  readonly jar: JarFrame;
}

/** Zoom progress (0–1) at this frame: the ticks so far plus the fraction of the next one. */
export function zoomProgressAt(expansion: ExpansionView, alpha: number): number {
  if (expansion.phase === 'clear') return 0;
  if (expansion.phase === 'reveal') return 1;
  const ms = expansion.elapsedMs - EXPANSION_ZOOM_START_MS + clamp(alpha, 0, 1) * PHYSICS_STEP_MS;
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
 * Camera and jar frames for this frame. Outside the zoom (no expansion, the stage clear before it,
 * or the reveal, when the world is already the new stage's) both are the current jar.
 */
export function expansionFrames(
  geometry: JarFrame,
  expansion: ExpansionView | null,
  alpha: number,
): ExpansionFrames {
  if (!expansion || expansion.phase !== 'zoom') return { camera: geometry, jar: geometry };
  const t = zoomProgressAt(expansion, alpha);
  return {
    camera: growFrame(geometry, STAGE_ZOOM, easeInOut(t)),
    jar: growFrame(geometry, STAGE_ZOOM, wallProgress(t)),
  };
}
