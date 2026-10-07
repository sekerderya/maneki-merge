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

/** Low friction: cats slide and roll past each other instead of gripping. */
export const BALL_FRICTION = 0.05;
export const BALL_FRICTION_STATIC = 0.2;
/** Cats bounce a little off each other and the walls (never off the floor, see below). */
export const BALL_RESTITUTION = 0.25;
export const BALL_FRICTION_AIR = 0.01;

/**
 * The walls and the floor grip like cats do. matter-js gives a pair the lower friction and the
 * higher static friction of its two bodies, so with its defaults (0.1 / 0.5) the floor held cats
 * harder than the cats' own values said.
 */
export const JAR_FRICTION = BALL_FRICTION;
export const JAR_FRICTION_STATIC = BALL_FRICTION_STATIC;
/** The floor never bounces: a cat that lands on it stops dead (physics/restitution.ts). */
export const FLOOR_RESTITUTION = 0;

/**
 * The first-landing cushion (v0.19.4, owner's choice B): a dropped cat whose first touch is a
 * rounded corner, and no cat, loses its fall's speed over this long, braking in and out gently,
 * instead of being swung along the curve across the jar. Only that once (TECH_SPEC §5).
 */
export const CORNER_CUSHION_MS = 500;
/** How much of its speed the cushion leaves a cat, gravity aside. */
export const CORNER_CUSHION_KEEP = 0.25;

/**
 * Rolling resistance in u/s²: a cat touching the jar floor (flat or curved) and no other cat
 * slows down by this much, like a ball on a rug, and stops on gentle slopes (under 22°). It also
 * rolls there instead of sliding (v0.19.5, owner: the cats barely turned). Piles are left to the
 * physics. 600 in v0.19.4, when the cats slid and friction slowed them too.
 */
export const FLOOR_ROLLING_RESISTANCE = 800;

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
 * matter-js turns bodies more slowly than real discs (it uses inertia × 4); cats use × 2, so they
 * roll aside easily when pushed.
 */
export const BALL_INERTIA_SCALE = 2;

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
