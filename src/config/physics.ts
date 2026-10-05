/**
 * Physics tunables (TECH_SPEC §5). These are starting values: M4 tunes them and records the
 * reasoning in TECH_SPEC §5, and M10 may retune them.
 */
import { tierRadius } from './tiers';

/** Fixed timestep, and the most substeps one frame may run. */
export const PHYSICS_STEP_MS = 1000 / 120;
export const PHYSICS_MAX_SUBSTEPS = 5;

export const POSITION_ITERATIONS = 10;
export const VELOCITY_ITERATIONS = 8;

export const BALL_FRICTION = 0.2;
export const BALL_FRICTION_STATIC = 0.5;
export const BALL_RESTITUTION = 0.1;
export const BALL_FRICTION_AIR = 0.01;

export const ENABLE_SLEEPING = false;

/** Jar walls are static rectangles at least this thick, so nothing tunnels out. */
export const WALL_THICKNESS = 300;

/** Stage-1 gravity (matter-js gravity.y); stage s uses GRAVITY_BASE × scale_s. */
export const GRAVITY_BASE = 1;

/** Density of a tier-1 cat. Bigger tiers are lighter per area (see densityForTier). */
export const BASE_DENSITY = 0.001;
export const DENSITY_EXPONENT = 0.5;

/** density(t) = BASE_DENSITY × (r(1) / r(t))^0.5, so mass grows like r^1.5 instead of r². */
export function densityForTier(tier: number): number {
  return BASE_DENSITY * (tierRadius(1) / tierRadius(tier)) ** DENSITY_EXPONENT;
}

/** Gravity scales with the stage so on-screen motion feels the same at every zoom. */
export function gravityForScale(scale: number): number {
  return GRAVITY_BASE * scale;
}
