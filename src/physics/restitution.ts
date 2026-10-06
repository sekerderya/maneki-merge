/**
 * Bounce per body (TECH_SPEC §5). matter-js gives a pair the larger restitution of its two bodies,
 * so a bouncy cat would bounce off the floor as much as off another cat. A body that carries
 * `plugin.restitution` decides its pairs' restitution instead: the floor sets 0, so a landing cat
 * stops dead while cats still bounce off each other.
 *
 * `installRestitutionOverride()` wraps `Matter.Pair.update` once. matter-js 0.20.0 sets
 * `pair.restitution` there on every step a pair is active, and `Pairs.update` looks the function
 * up on each call, so the wrapper sees every pair (the version is pinned, see circleCollision.ts).
 */
import Matter from 'matter-js';

/** The restitution a body forces on its pairs, if it sets one. */
export function restitutionOverride(body: Matter.Body): number | undefined {
  return (body.plugin as { restitution?: number } | undefined)?.restitution;
}

/** matter-js's own `Pair.update`. */
const pairUpdate = Matter.Pair.update;

/** The replacement for `Matter.Pair.update`. */
export function updatePair(
  pair: Matter.Pair,
  collision: Matter.Collision,
  timestamp: number,
): void {
  pairUpdate(pair, collision, timestamp);
  const forced = restitutionOverride(collision.parentA) ?? restitutionOverride(collision.parentB);
  if (forced !== undefined) pair.restitution = forced;
}

let installed = false;

/** Routes matter-js's pair updates through `updatePair`. Safe to call more than once. */
export function installRestitutionOverride(): void {
  if (installed) return;
  installed = true;
  Matter.Pair.update = updatePair;
}
