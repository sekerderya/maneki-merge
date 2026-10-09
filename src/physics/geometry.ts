/**
 * Jar geometry in world units (TECH_SPEC §4): the origin is the centre of the jar floor and y
 * grows downward, so the rim is at y = −height. The jar is a plain rectangle with square bottom
 * corners. Every stage has the same jar: when the jar grows on screen, the run empties it and the
 * next stage plays in the same world jar (GAME_DESIGN §7). Pure math, no matter-js, so the game scene can use it too.
 */
import { clamp } from '../core/math';
import {
  DROP_SIZES,
  DROPPER_HEADROOM_RATIO,
  JAR_HEIGHT,
  JAR_WIDTH,
  stageInfo,
  STAGES,
} from '../config/stages';
import { sizeRadius } from '../config/tiers';

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

/** The biggest drop's radius (size 4): the dropper band above the rim is sized for it. */
export const MAX_DROP_RADIUS = sizeRadius(DROP_SIZES);

/**
 * Where a dropped ball of `radius` starts: the middle of the dropper band, or, for a ball bigger
 * than the biggest drop (one a magnet took out of the jar, GAME_DESIGN §15.2), higher, with its
 * bottom where the biggest drop's bottom would be.
 */
export function dropStartY(radius: number, geometry: JarGeometry): number {
  return geometry.dropY + Math.min(0, MAX_DROP_RADIUS - radius);
}

/** Keeps a cat of `radius` centred at `x` inside the jar walls. `x` must be finite. */
export function clampDropX(x: number, radius: number, geometry: JarGeometry): number {
  const limit = Math.max(0, geometry.halfWidth - radius);
  return clamp(x, -limit, limit);
}
