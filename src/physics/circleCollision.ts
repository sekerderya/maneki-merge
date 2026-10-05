/**
 * Exact circle contacts for matter-js (TECH_SPEC §5). matter-js treats every body as a polygon
 * and runs SAT on its vertices, which costs most of a step with 150 cats and makes round cats
 * roll over facets. `installCircleCollisions()` replaces `Matter.Collision.collides` with an
 * analytic test whenever a cat is involved (cat–cat, cat–wall) and keeps SAT for anything else.
 *
 * The record it returns follows matter-js 0.20.0's contract (src/collision/Collision.js), which
 * is why that version is pinned:
 * - records are reused through `pairs.table[Pair.id(a, b)]`, and `bodyA` has the smaller id;
 * - `normal` points from bodyB towards bodyA, `tangent = (−normal.y, normal.x)` and
 *   `penetration = normal × depth`;
 * - there is one support point, and it stays the same object for the life of the pair, so the
 *   resolver keeps the same contact (and its warm-started impulses) from step to step.
 */
import Matter from 'matter-js';

/** Anything with a radius. A cat's body carries one on `body.plugin.circle`. */
export interface CircleShape {
  readonly radius: number;
}

/** The fields of matter-js internals this module touches but @types/matter-js leaves out. */
interface CollisionRecord extends Matter.Collision {
  depth: number;
  supportCount: number;
  /** Our single support point, created once per record. */
  circleSupport?: Matter.Vector;
}
interface PairsTable {
  readonly table: Record<string, Matter.Pair | undefined>;
}

/** matter-js's own polygon test, used for every pair without a cat. */
export const polygonCollides = Matter.Collision.collides;

export function circleOf(body: Matter.Body): CircleShape | undefined {
  return (body.plugin as { circle?: CircleShape } | undefined)?.circle;
}

/** The walls and the floor: static, unrotated, single-part rectangles. */
function isBox(body: Matter.Body): boolean {
  return body.isStatic && body.angle === 0 && body.parts.length === 1;
}

/**
 * Scratch result of the analytic tests: the unit normal points from the other body towards the
 * circle, `depth` is the overlap, and (px, py) is the contact point, midway through the overlap.
 */
const hit = { nx: 0, ny: 0, depth: 0, px: 0, py: 0 };

/** Fills `hit` and returns true when two circles overlap (touching exactly doesn't count). */
function circleVsCircle(
  ax: number,
  ay: number,
  ra: number,
  bx: number,
  by: number,
  rb: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const sum = ra + rb;
  const d2 = dx * dx + dy * dy;
  if (d2 >= sum * sum) return false;
  const d = Math.sqrt(d2);
  if (d > 0) {
    hit.nx = dx / d;
    hit.ny = dy / d;
  } else {
    // Concentric: push the circle up, out of the pile.
    hit.nx = 0;
    hit.ny = -1;
  }
  hit.depth = sum - d;
  const reach = ra - hit.depth / 2;
  hit.px = ax - hit.nx * reach;
  hit.py = ay - hit.ny * reach;
  return true;
}

/** Fills `hit` and returns true when a circle overlaps an axis-aligned box. */
function circleVsBox(
  cx: number,
  cy: number,
  r: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  const qx = cx < minX ? minX : cx > maxX ? maxX : cx;
  const qy = cy < minY ? minY : cy > maxY ? maxY : cy;
  const dx = cx - qx;
  const dy = cy - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 > 0) {
    if (d2 >= r * r) return false;
    const d = Math.sqrt(d2);
    hit.nx = dx / d;
    hit.ny = dy / d;
    hit.depth = r - d;
    hit.px = qx - (hit.nx * hit.depth) / 2;
    hit.py = qy - (hit.ny * hit.depth) / 2;
    return true;
  }
  // The centre is inside the box: leave through the nearest face.
  const left = cx - minX;
  const right = maxX - cx;
  const top = cy - minY;
  const bottom = maxY - cy;
  let face = left;
  hit.nx = -1;
  hit.ny = 0;
  if (right < face) {
    face = right;
    hit.nx = 1;
  }
  if (top < face) {
    face = top;
    hit.nx = 0;
    hit.ny = -1;
  }
  if (bottom < face) {
    face = bottom;
    hit.nx = 0;
    hit.ny = 1;
  }
  hit.depth = r + face;
  const reach = r - hit.depth / 2;
  hit.px = cx - hit.nx * reach;
  hit.py = cy - hit.ny * reach;
  return true;
}

/** The replacement for `Matter.Collision.collides`. */
export function collides(
  bodyA: Matter.Body,
  bodyB: Matter.Body,
  pairs?: Matter.Pairs,
): Matter.Collision | null {
  const circleA = circleOf(bodyA);
  const circleB = circleOf(bodyB);
  let circle: Matter.Body;
  if (circleA && circleB) {
    circle = bodyA;
    const a = bodyA.position;
    const b = bodyB.position;
    if (!circleVsCircle(a.x, a.y, circleA.radius, b.x, b.y, circleB.radius)) return null;
  } else if (circleA || circleB) {
    circle = circleA ? bodyA : bodyB;
    const box = circleA ? bodyB : bodyA;
    if (!isBox(box)) return polygonCollides(bodyA, bodyB, pairs);
    const { min, max } = box.bounds;
    const radius = (circleA ?? circleB)!.radius;
    if (!circleVsBox(circle.position.x, circle.position.y, radius, min.x, min.y, max.x, max.y)) {
      return null;
    }
  } else {
    return polygonCollides(bodyA, bodyB, pairs);
  }

  const pair = pairs ? (pairs as unknown as PairsTable).table[Matter.Pair.id(bodyA, bodyB)] : null;
  let collision: CollisionRecord;
  if (pair) {
    collision = pair.collision as CollisionRecord;
  } else {
    collision = Matter.Collision.create(bodyA, bodyB) as CollisionRecord;
    collision.collided = true;
    collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
    collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
    collision.parentA = collision.bodyA.parent;
    collision.parentB = collision.bodyB.parent;
  }

  // `hit` points from the other body towards the circle; matter-js wants bodyB → bodyA.
  const sign = collision.bodyA === circle ? 1 : -1;
  const nx = hit.nx * sign;
  const ny = hit.ny * sign;
  collision.normal.x = nx;
  collision.normal.y = ny;
  collision.tangent.x = -ny;
  collision.tangent.y = nx;
  collision.penetration.x = nx * hit.depth;
  collision.penetration.y = ny * hit.depth;
  collision.depth = hit.depth;

  const support = (collision.circleSupport ??= { x: 0, y: 0 });
  support.x = hit.px;
  support.y = hit.py;
  collision.supports[0] = support;
  collision.supportCount = 1;
  return collision;
}

let installed = false;

/** Routes matter-js narrowphase through `collides`. Safe to call more than once. */
export function installCircleCollisions(): void {
  if (installed) return;
  installed = true;
  Matter.Collision.collides = collides;
}
