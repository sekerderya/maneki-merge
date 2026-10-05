/**
 * Cats in the physics world: a matter-js body plus the game data the world tracks for it
 * (tier, golden, growth after a merge, first contact). Contacts use the exact circle
 * (circleCollision.ts); the body's polygon only feeds matter-js's broadphase bounds.
 */
import Matter from 'matter-js';
import {
  BALL_FRICTION,
  BALL_FRICTION_AIR,
  BALL_FRICTION_STATIC,
  BALL_HULL_SIDES,
  BALL_INERTIA_SCALE,
  BALL_RESTITUTION,
  densityForTier,
} from '../config/physics';
import { isTier, tierRadius } from '../config/tiers';
import { MERGE_GROW_MS } from '../config/timings';
import type { CircleShape } from './circleCollision';

/** matter-js velocities are per base tick of 1000/60 ms; config speeds are per second. */
export const MATTER_TICKS_PER_SECOND = 60;

/** What rendering and game rules may read about a cat. */
export interface BallView {
  readonly id: number;
  readonly tier: number;
  readonly golden: boolean;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  /** World units per second. */
  readonly vx: number;
  readonly vy: number;
  /** The current radius; a merged cat grows into its tier's radius. */
  readonly radius: number;
  readonly growing: boolean;
  /** Play time of the cat's first contact with anything, or −1 while it is still falling. */
  readonly landedMs: number;
}

export interface BallSpec {
  readonly tier: number;
  readonly golden?: boolean;
  readonly x: number;
  readonly y: number;
  /** World units per second. */
  readonly vx?: number;
  readonly vy?: number;
  /** Start smaller and grow into the tier's radius over MERGE_GROW_MS (merged cats). */
  readonly startRadius?: number;
  /** Play time of the first contact, if the cat counts as landed already. */
  readonly landedMs?: number;
}

export class Ball implements BallView, CircleShape {
  radius: number;
  readonly targetRadius: number;
  /** Play time of the first contact, or −1. */
  landedMs: number;
  /** Set once the world has removed the cat. */
  removed = false;
  /** Set by the world during a step when the cat touches a growing cat. */
  touchesGrowth = false;
  private readonly growFrom: number;
  private growAgeMs = 0;

  constructor(
    readonly id: number,
    readonly tier: number,
    readonly golden: boolean,
    readonly body: Matter.Body,
    startRadius: number,
    landedMs: number,
  ) {
    this.targetRadius = tierRadius(tier);
    this.radius = Math.min(startRadius, this.targetRadius);
    this.growFrom = this.radius;
    this.landedMs = landedMs;
  }

  get x(): number {
    return this.body.position.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  get angle(): number {
    return this.body.angle;
  }

  get vx(): number {
    return this.body.velocity.x * MATTER_TICKS_PER_SECOND;
  }

  get vy(): number {
    return this.body.velocity.y * MATTER_TICKS_PER_SECOND;
  }

  /** World units per second. */
  get speed(): number {
    return Math.hypot(this.body.velocity.x, this.body.velocity.y) * MATTER_TICKS_PER_SECOND;
  }

  get growing(): boolean {
    return this.radius < this.targetRadius;
  }

  get landed(): boolean {
    return this.landedMs >= 0;
  }

  /** Grows linearly from the start radius to the tier's radius over MERGE_GROW_MS. */
  grow(dtMs: number): void {
    if (!this.growing) return;
    this.growAgeMs += dtMs;
    const t = this.growAgeMs / MERGE_GROW_MS;
    const radius =
      t >= 1 ? this.targetRadius : this.growFrom + (this.targetRadius - this.growFrom) * t;
    const factor = radius / this.radius;
    Matter.Body.scale(this.body, factor, factor);
    this.radius = radius;
    setCircleMass(this.body, this.tier, radius);
  }
}

/** Mass and inertia of a solid disc of the tier's density (the hull polygon is a bit bigger). */
function setCircleMass(body: Matter.Body, tier: number, radius: number): void {
  const mass = densityForTier(tier) * Math.PI * radius * radius;
  Matter.Body.setMass(body, mass);
  Matter.Body.setInertia(body, BALL_INERTIA_SCALE * 0.5 * mass * radius * radius);
}

export function createBall(id: number, spec: BallSpec): Ball {
  if (!isTier(spec.tier)) throw new RangeError(`Unknown tier: ${spec.tier}`);
  if (!Number.isFinite(spec.x) || !Number.isFinite(spec.y)) {
    throw new RangeError(`Invalid position: ${spec.x}, ${spec.y}`);
  }
  const radius = Math.min(spec.startRadius ?? tierRadius(spec.tier), tierRadius(spec.tier));
  if (!(radius > 0)) throw new RangeError(`Invalid start radius: ${spec.startRadius}`);
  const hull = radius / Math.cos(Math.PI / BALL_HULL_SIDES);
  const body = Matter.Bodies.circle(
    spec.x,
    spec.y,
    hull,
    {
      label: 'cat',
      friction: BALL_FRICTION,
      frictionStatic: BALL_FRICTION_STATIC,
      restitution: BALL_RESTITUTION,
      frictionAir: BALL_FRICTION_AIR,
    },
    BALL_HULL_SIDES,
  );
  const ball = new Ball(id, spec.tier, spec.golden ?? false, body, radius, spec.landedMs ?? -1);
  (body.plugin as { circle?: Ball }).circle = ball;
  setCircleMass(body, spec.tier, radius);
  if (spec.vx || spec.vy) {
    Matter.Body.setVelocity(body, {
      x: (spec.vx ?? 0) / MATTER_TICKS_PER_SECOND,
      y: (spec.vy ?? 0) / MATTER_TICKS_PER_SECOND,
    });
  }
  return ball;
}

/** The cat a matter-js body belongs to, if any. */
export function ballOf(body: Matter.Body): Ball | undefined {
  return (body.plugin as { circle?: Ball } | undefined)?.circle;
}
