/**
 * Physics tunables (TECH_SPEC §5). M4 chose the first values; v0.12 made the cats lighter, a bit
 * bouncier and easier to push (the owner's playtest). The reasoning is in TECH_SPEC §5.
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
export const BALL_FRICTION = 0.1;
export const BALL_FRICTION_STATIC = 0.3;
/** A visible bounce: a size-1 cat dropped on the empty floor bounces about its own radius. */
export const BALL_RESTITUTION = 0.25;
export const BALL_FRICTION_AIR = 0.01;

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
 * matter-js turns bodies more slowly than real discs (it uses inertia × 4); cats use × 3, so they
 * roll aside a little more easily when pushed.
 */
export const BALL_INERTIA_SCALE = 3;

/**
 * Speed limits in world units per second (the world has the same scale at every stage).
 * MAX_SPEED applies to every cat on every step and sits above a natural fall from the dropper, so
 * it only catches launches.
 */
export const MAX_SPEED_BASE = 1500;
/** A merged cat starts with its parents' average velocity, capped at this. */
export const MERGE_MAX_SPEED_BASE = 400;
/** While a merged cat grows, every cat touching it is capped at this. */
export const GROWTH_NEIGHBOUR_MAX_SPEED_BASE = 500;
/** Radians per second. */
export const MAX_ANGULAR_SPEED = 30;

/** matter-js gravity.y (900 units/s²), the same at every stage: cats fall a little floatier. */
export const GRAVITY_BASE = 0.9;

/** Density of a size-1 cat. Bigger sizes are lighter per area (see densityForSize). */
export const BASE_DENSITY = 0.001;
export const DENSITY_EXPONENT = 0.6;

/**
 * density(s) = BASE_DENSITY × (r(1) / r(s))^0.6, so mass grows like r^1.4 instead of r²: a small
 * cat can shove a big one.
 */
export function densityForSize(size: number): number {
  return BASE_DENSITY * (sizeRadius(1) / sizeRadius(size)) ** DENSITY_EXPONENT;
}
