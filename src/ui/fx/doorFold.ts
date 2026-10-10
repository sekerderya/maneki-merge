/**
 * Where the stage doors stand while they fold (GAME_DESIGN §7.1). Pure math, no DOM, so it is
 * unit-tested in Node.
 *
 * Each wing is two doors of width 1: the outer one hinged at the screen's edge, the inner one
 * hinged on the outer one's free edge. Folding by θ turns the outer door θ away from the viewer and
 * the inner one back by θ, so the inner door's free edge stays on the screen (z = 0) and the wing
 * folds like an accordion. At θ = 90° both stand edge-on at the screen's edge.
 */
import { DOORS_SHADE_INNER, DOORS_SHADE_OUTER } from '../../config/view';

export interface DoorPose {
  /** Shift from the door's place when shut, in door widths: across the screen, and away (−). */
  readonly x: number;
  readonly z: number;
  /** Turn about the door's hinge edge, degrees; positive turns its free edge away. */
  readonly angle: number;
  /** How dark it gets (0–1). */
  readonly shade: number;
}

export interface WingPose {
  readonly outer: DoorPose;
  readonly inner: DoorPose;
}

/** The left wing at `fold` (0 = shut and flat, 1 = folded away). The right wing is its mirror. */
export function wingPose(fold: number): WingPose {
  const t = Math.min(1, Math.max(0, fold));
  const theta = (t * Math.PI) / 2;
  const sin = Math.sin(theta);
  return {
    outer: { x: 0, z: 0, angle: t * 90, shade: DOORS_SHADE_OUTER * sin },
    // Its hinge is the outer door's free edge, which has moved in to cos θ and back to −sin θ.
    inner: { x: Math.cos(theta) - 1, z: -sin, angle: -t * 90, shade: DOORS_SHADE_INNER * sin },
  };
}

/** Slow start, slow end: the doors never jump to speed or stop dead. */
export function easeDoors(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
}

/** The CSS transform of a door at `pose`, `width` px wide; `mirror` for the right wing. */
export function doorTransform(pose: DoorPose, width: number, mirror: boolean): string {
  const sign = mirror ? -1 : 1;
  const x = round(sign * pose.x * width);
  const z = round(pose.z * width);
  const angle = round(sign * pose.angle);
  return `translate3d(${x}px, 0px, ${z}px) rotateY(${angle}deg)`;
}

function round(v: number): number {
  return Math.round(v * 100) / 100 || 0;
}
