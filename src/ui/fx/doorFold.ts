/**
 * Where the stage doors stand while they slide and fold (GAME_DESIGN §7.1). Pure math, no DOM, so
 * it is unit-tested in Node.
 *
 * Each wing is a folding screen of two doors of width 1, standing on the screen's plane like a
 * byobu on the floor: the outer door's outer edge and the inner door's free edge stay on it (z = 0)
 * and slide, while the hinge between the doors comes forward. Opening, the wing slides to the
 * screen's edge and off it while it folds up (the doors turn by θ, up to DOORS_FOLD_ANGLE); shutting
 * is the same backwards: it slides in from the edge and unfolds flat.
 */
import {
  DOORS_FOLD_ANGLE,
  DOORS_SHADE_INNER,
  DOORS_SHADE_OUTER,
  DOORS_SLIDE_PAST,
} from '../../config/view';

export interface DoorPose {
  /** Shift from the door's place when shut, in door widths: across the screen, and forward (+). */
  readonly x: number;
  readonly z: number;
  /** Turn about the door's hinge-side edge, degrees; positive turns its free edge away. */
  readonly angle: number;
  /** How dark it gets (0–1). */
  readonly shade: number;
}

export interface WingPose {
  readonly outer: DoorPose;
  readonly inner: DoorPose;
}

/** The left wing at `fold` (0 = shut and flat, 1 = folded up off the screen). The right wing is its mirror. */
export function wingPose(fold: number): WingPose {
  const t = Math.min(1, Math.max(0, fold));
  const theta = (t * DOORS_FOLD_ANGLE * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  // The wing's outer edge slides out at an even pace, so that when the wing is folded up (2 cos θ
  // wide) its free edge ends past the screen's edge; the free edge, folding in, moves faster. Both
  // only ever move one way.
  const foldedWidth = 2 * Math.cos((DOORS_FOLD_ANGLE * Math.PI) / 180);
  const outer = -t * (foldedWidth + DOORS_SLIDE_PAST);
  const shade = sin / Math.sin((DOORS_FOLD_ANGLE * Math.PI) / 180);
  return {
    outer: { x: outer, z: 0, angle: -t * DOORS_FOLD_ANGLE, shade: DOORS_SHADE_OUTER * shade },
    // Its hinge is the outer door's other edge, which has come in to cos θ and forward to sin θ.
    inner: {
      x: outer + cos - 1,
      z: sin,
      angle: t * DOORS_FOLD_ANGLE,
      shade: DOORS_SHADE_INNER * shade,
    },
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
