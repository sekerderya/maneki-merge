/**
 * Exact circle contacts for matter-js (TECH_SPEC §5). matter-js treats every body as a polygon
 * and runs SAT on its vertices, which costs most of a step with 150 cats and makes round cats
 * roll over facets. `installCircleCollisions()` replaces `Matter.Collision.collides` with an
 * analytic test whenever a cat is involved (cat–cat, cat–wall, cat–floor with its rounded
 * corners) and keeps SAT for anything else.
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

/**
 * The jar floor with rounded corners: its flat top at y = `top`, and quarter circles of `radius`
 * around (±cx, cy) in the corners. The floor body carries it on `body.plugin.roundedFloor`; its
 * rectangle reaches up to the corners' centres, so the broadphase pairs it with every cat that
 * could touch a curve. One pair per cat covers the flat floor and both curves, so a cat rolling
 * onto a curve keeps the same contact.
 */
export interface RoundedFloor {
  readonly top: number;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export function roundedFloorOf(body: Matter.Body): RoundedFloor | undefined {
  return (body.plugin as { roundedFloor?: RoundedFloor } | undefined)?.roundedFloor;
}

/**
 * True when a cat of `radius` centred at (x, y) is in a rounded corner: smaller than the corner,
 * beyond the corner's centre and below it. Elsewhere the flat floor and the walls hold it, and a
 * cat at least as big as the corner never reaches into it.
 */
export function inRoundedCorner(
  x: number,
  y: number,
  radius: number,
  floor: RoundedFloor,
): boolean {
  return radius < floor.radius && Math.abs(x) > floor.cx && y > floor.cy;
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

/**
 * Fills `hit` and returns true when a circle in a rounded corner (`inRoundedCorner`) pokes out of
 * the curve. At the foot of the curve this matches the flat floor's contact exactly.
 */
function circleVsCorner(cx: number, cy: number, r: number, floor: RoundedFloor): boolean {
  const dx = cx - (cx < 0 ? -floor.cx : floor.cx);
  const dy = cy - floor.cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const limit = floor.radius - r;
  if (d <= limit) return false;
  // Push the circle back towards the corner's centre.
  hit.nx = -dx / d;
  hit.ny = -dy / d;
  hit.depth = d - limit;
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
    const other = circleA ? bodyB : bodyA;
    const radius = (circleA ?? circleB)!.radius;
    if (!isBox(other)) return polygonCollides(bodyA, bodyB, pairs);
    const { x, y } = circle.position;
    const floor = roundedFloorOf(other);
    if (floor && inRoundedCorner(x, y, radius, floor)) {
      if (!circleVsCorner(x, y, radius, floor)) return null;
    } else {
      const { min, max } = other.bounds;
      if (!circleVsBox(x, y, radius, min.x, floor ? floor.top : min.y, max.x, max.y)) return null;
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
