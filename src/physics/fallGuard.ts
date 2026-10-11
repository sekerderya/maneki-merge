/**
 * The tunnelling guard for Heavy Drop (GAME_DESIGN §15.9, TECH_SPEC §5). A heavy ball falls faster
 * than the speed limit, up to more than half a size-1 radius per step. Before such a step, its
 * circle is swept along the step's path against every other ball, the floor and the walls; if it
 * would sink deeper than the allowed depth into the first thing it meets, it starts the step that
 * much further back along its path. Its speed doesn't change, so it still hits at full speed, and
 * no contact ever starts deeper than the depth. Pure math: the world applies it.
 */

/** A circle the falling ball may run into. */
export interface SweepCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** The jar a ball falls in: the floor at y = 0 and walls at x = ±halfWidth. */
export interface SweepJar {
  readonly halfWidth: number;
}

/**
 * How far along the move (dx, dy) the circle at (x, y) of `radius` first touches `other`, as a
 * distance from the start: 0 when it already overlaps it and moves deeper, Infinity when it never
 * touches it on this move's line (or moves away).
 */
function touchCircle(
  x: number,
  y: number,
  radius: number,
  ux: number,
  uy: number,
  other: SweepCircle,
): number {
  const wx = x - other.x;
  const wy = y - other.y;
  const reach = radius + other.radius;
  const along = wx * ux + wy * uy;
  const gap = wx * wx + wy * wy - reach * reach;
  if (gap <= 0) return along < 0 ? 0 : Infinity;
  if (along >= 0) return Infinity;
  const disc = along * along - gap;
  return disc < 0 ? Infinity : -along - Math.sqrt(disc);
}

/** The same for the floor and the walls, which only ever stop a ball moving towards them. */
function touchJar(x: number, y: number, radius: number, ux: number, uy: number, jar: SweepJar) {
  let s = Infinity;
  if (uy > 0) s = Math.min(s, Math.max(0, (-radius - y) / uy));
  if (ux > 0) s = Math.min(s, Math.max(0, (jar.halfWidth - radius - x) / ux));
  if (ux < 0) s = Math.min(s, Math.max(0, (-jar.halfWidth + radius - x) / ux));
  return s;
}

/**
 * How far (world units) the ball must move back along its move (dx, dy) before the step, so that
 * it travels at most `depth` past its first contact: 0 when it doesn't get that far into anything.
 * `others` are the other balls (the ball itself is skipped by identity).
 */
export function fallPullback(
  ball: SweepCircle,
  dx: number,
  dy: number,
  others: readonly SweepCircle[],
  jar: SweepJar,
  depth: number,
): number {
  const length = Math.hypot(dx, dy);
  if (length <= depth) return 0;
  const ux = dx / length;
  const uy = dy / length;
  let first = touchJar(ball.x, ball.y, ball.radius, ux, uy, jar);
  for (const other of others) {
    if (other === ball) continue;
    first = Math.min(first, touchCircle(ball.x, ball.y, ball.radius, ux, uy, other));
  }
  return Math.max(0, length - first - depth);
}
