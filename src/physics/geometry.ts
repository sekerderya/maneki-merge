/**
 * Jar geometry per stage in world units (TECH_SPEC §4): the origin is the centre of the jar
 * floor and y grows downward, so the rim is at y = −height. Pure math, no matter-js, so the
 * game scene can use it too.
 */
import { clamp } from '../core/math';
import { DROPPER_HEADROOM_RATIO, stageInfo, STAGES } from '../config/stages';

export interface JarGeometry {
  readonly stage: number;
  /** STAGE_SCALE_STEP^(stage−1); gravity and speed limits scale with it. */
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly halfWidth: number;
  /** The rim, which is also the danger line. */
  readonly rimY: number;
  /** Height of the dropper band above the rim. */
  readonly headroom: number;
  /** Where a dropped cat's centre starts: the middle of the dropper band. */
  readonly dropY: number;
}

const GEOMETRY: readonly JarGeometry[] = STAGES.map((info) => {
  const headroom = DROPPER_HEADROOM_RATIO * info.width;
  return Object.freeze({
    stage: info.stage,
    scale: info.scale,
    width: info.width,
    height: info.height,
    halfWidth: info.width / 2,
    rimY: -info.height,
    headroom,
    dropY: -info.height - headroom / 2,
  });
});

export function jarGeometry(stage: number): JarGeometry {
  stageInfo(stage); // throws for an unknown stage
  return GEOMETRY[stage - 1] as JarGeometry;
}

/** Keeps a cat of `radius` centred at `x` inside the jar walls. `x` must be finite. */
export function clampDropX(x: number, radius: number, geometry: JarGeometry): number {
  const limit = Math.max(0, geometry.halfWidth - radius);
  return clamp(x, -limit, limit);
}
