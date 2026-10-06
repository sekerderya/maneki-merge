/**
 * Physics tunables (TECH_SPEC §5). These are starting values: M4 tunes them and records the
 * reasoning in TECH_SPEC §5, and M10 may retune them.
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

export const BALL_FRICTION = 0.2;
export const BALL_FRICTION_STATIC = 0.5;
export const BALL_RESTITUTION = 0.1;
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

/** matter-js turns bodies more slowly than real discs (inertia × 4); cats keep that feel. */
export const BALL_INERTIA_SCALE = 4;

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

/** matter-js gravity.y (1000 units/s²), the same at every stage. */
export const GRAVITY_BASE = 1;

/** Density of a size-1 cat. Bigger sizes are lighter per area (see densityForSize). */
export const BASE_DENSITY = 0.001;
export const DENSITY_EXPONENT = 0.5;

/** density(s) = BASE_DENSITY × (r(1) / r(s))^0.5, so mass grows like r^1.5 instead of r². */
export function densityForSize(size: number): number {
  return BASE_DENSITY * (sizeRadius(1) / sizeRadius(size)) ** DENSITY_EXPONENT;
}
