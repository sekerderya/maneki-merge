/**
 * Jar geometry in world units (TECH_SPEC §4): the origin is the centre of the jar floor and y
 * grows downward, so the rim is at y = −height. Every stage has the same jar: when the jar grows,
 * the run rescales the world instead (GAME_DESIGN §7). Pure math, no matter-js, so the game scene
 * can use it too.
 */
import { clamp } from '../core/math';
import { DROPPER_HEADROOM_RATIO, JAR_HEIGHT, JAR_WIDTH, stageInfo, STAGES } from '../config/stages';

export interface JarGeometry {
  readonly stage: number;
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

const HEADROOM = DROPPER_HEADROOM_RATIO * JAR_WIDTH;

const GEOMETRY: readonly JarGeometry[] = STAGES.map(({ stage }) =>
  Object.freeze({
    stage,
    width: JAR_WIDTH,
    height: JAR_HEIGHT,
    halfWidth: JAR_WIDTH / 2,
    rimY: -JAR_HEIGHT,
    headroom: HEADROOM,
    dropY: -JAR_HEIGHT - HEADROOM / 2,
  }),
);

export function jarGeometry(stage: number): JarGeometry {
  stageInfo(stage); // throws for an unknown stage
  return GEOMETRY[stage - 1] as JarGeometry;
}

/** Keeps a cat of `radius` centred at `x` inside the jar walls. `x` must be finite. */
export function clampDropX(x: number, radius: number, geometry: JarGeometry): number {
  const limit = Math.max(0, geometry.halfWidth - radius);
  return clamp(x, -limit, limit);
}
