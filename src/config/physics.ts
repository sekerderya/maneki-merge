/**
 * Physics tunables (TECH_SPEC §5). M4 chose the first values; v0.12 and v0.13 retuned them after
 * the owner's playtests (v0.13: a one-second drop, a dead floor, cats that shove each other). The
 * reasoning is in TECH_SPEC §5.
 */
import { sizeRadius } from './tiers';

/** Fixed timestep, and the most substeps one frame may run. */
export const PHYSICS_STEP_MS = 1000 / 120;
export const PHYSICS_MAX_SUBSTEPS = 5;

/**
 * Whole fixed steps that cover `ms`. Timers count steps instead of adding up milliseconds, so
 * floating-point noise can't move a deadline by a step (2500 ms is exactly 300 steps).
 */
export function stepsFor(ms: number): number {
  return Math.max(0, Math.ceil(ms / PHYSICS_STEP_MS - 1e-9));
}

export const POSITION_ITERATIONS = 10;
export const VELOCITY_ITERATIONS = 8;

/**
 * Coulomb friction (physics/friction.ts, v0.23.7) between two cats: a cat that rests on another
 * rolls over it instead of sliding like on ice. A contact never holds back more than this times
 * the force pressing the two together, and an impact carries none, so a landing cat still shoves.
 */
export const CAT_FRICTION = 0.8;
/**
 * Coulomb friction between a cat and the jar's walls and floor: a pushed cat rolls within a tenth
 * of a second, and a pile leaning on the walls settles as fast as before.
 */
export const JAR_FRICTION = 0.4;
/** Cats bounce a little off each other and the walls (never off the floor, see below). */
export const BALL_RESTITUTION = 0.25;
export const BALL_FRICTION_AIR = 0.01;

/** The floor never bounces: a cat that lands on it stops dead (physics/restitution.ts). */
export const FLOOR_RESTITUTION = 0;

export const ENABLE_SLEEPING = false;

/** Jar walls are static rectangles at least this thick, so nothing tunnels out. */
export const WALL_THICKNESS = 300;

/**
 * The walls rise this many jar heights above the floor. Only the part up to the rim is drawn; the
 * rest keeps a pile that grows past the rim from spilling over.
 */
export const WALL_HEIGHT_FACTOR = 4;

/**
 * Contacts are exact circles (physics/circleCollision.ts). A cat's matter-js body is still a
 * polygon with this many sides drawn around the circle; it only feeds the broadphase bounds.
 */
export const BALL_HULL_SIDES = 12;

/**
 * Cats turn like real discs (inertia ½ m r²), so they roll aside easily when pushed and keep
 * their shove while rolling over each other. matter-js uses × 4; cats had × 2 until v0.23.6.
 */
export const BALL_INERTIA_SCALE = 1;

/**
 * Speed limits in world units per second (the world has the same scale at every stage).
 * MAX_SPEED applies to every cat on every step and sits above a natural fall from the dropper, so
 * it only catches launches.
 */
export const MAX_SPEED_BASE = 2400;
/** While a merged cat grows, every cat touching it is capped at this. */
export const GROWTH_NEIGHBOUR_MAX_SPEED_BASE = 500;
/** Radians per second. */
export const MAX_ANGULAR_SPEED = 30;

/**
 * A merged cat is born at rest and starts to turn, as if another cat had clipped it: its rim
 * moves at this speed (world units per second), so small cats turn faster than big ones.
 */
export const MERGE_SPIN_RIM_SPEED = 80;
/**
 * The parents decide the turn: their sliding past each other (world units per second, above this),
 * else their own turning, else their ids (physics/merges.ts).
 */
export const MERGE_SPIN_MIN_SLIDE = 20;

/**
 * matter-js gravity.y (2150 units/s²), the same at every stage. With the air friction above, a
 * dropped cat reaches the empty floor in 1 s (size 1: 1.00 s, size 4: 0.99 s).
 */
export const GRAVITY_BASE = 2.15;

/** Density of a size-1 cat. Bigger sizes are lighter per area (see densityForSize). */
export const BASE_DENSITY = 0.001;
export const DENSITY_EXPONENT = 1.0;

/**
 * density(s) = BASE_DENSITY × r(1) / r(s), so mass grows like r instead of r²: a small cat can
 * shove a big one.
 */
export function densityForSize(size: number): number {
  return BASE_DENSITY * (sizeRadius(1) / sizeRadius(size)) ** DENSITY_EXPONENT;
}
