/**
 * Balls in the physics world: a matter-js body plus the game data the world tracks for it
 * (kind, tier, size, golden, growth after a merge, first contact). A ball is a cat or a boulder
 * (GAME_DESIGN §15.3), which never merges and breaks after `hitsLeft` merges next to it. The tier
 * is the cat's number (a boulder's is the tier of its size); the size (its place in the current
 * stage, 1–10) sets its radius and density. Contacts use the exact circle (circleCollision.ts);
 * the body's polygon only feeds matter-js's broadphase bounds.
 */
import Matter from 'matter-js';
import {
  BALL_FRICTION_AIR,
  BALL_HULL_SIDES,
  BALL_INERTIA_SCALE,
  BALL_RESTITUTION,
  densityForSize,
} from '../config/physics';
import { isSize, isTier, sizeRadius } from '../config/tiers';
import { MERGE_GROW_MS } from '../config/timings';
import type { CircleShape } from './circleCollision';

/** matter-js velocities are per base tick of 1000/60 ms; config speeds are per second. */
export const MATTER_TICKS_PER_SECOND = 60;

/** A ball is a cat or a boulder. */
export type BallKind = 'cat' | 'boulder';

/** What rendering and game rules may read about a ball. */
export interface BallView {
  readonly id: number;
  readonly kind: BallKind;
  readonly tier: number;
  /** A golden cat skips a tier when it merges (GAME_DESIGN §15.4). */
  readonly golden: boolean;
  /** The merges a boulder still needs to break; 0 for a cat. */
  readonly hitsLeft: number;
  /** The cat's size at the current stage (1–9). */
  readonly size: number;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  /** World units per second. */
  readonly vx: number;
  readonly vy: number;
  /** World units per second. */
  readonly speed: number;
  /** The current radius; a merged cat grows into its size's radius. */
  readonly radius: number;
  /** The radius of the cat's size, which a growing cat is on its way to. */
  readonly targetRadius: number;
  readonly growing: boolean;
  /** Play time of the cat's first contact with anything, or −1 while it is still falling. */
  readonly landedMs: number;
}

export interface BallSpec {
  /** A cat by default. */
  readonly kind?: BallKind;
  readonly tier: number;
  readonly golden?: boolean;
  /** A boulder's merges to break (at least 1). */
  readonly hits?: number;
  /** 1–10: the tier's place in the world's stage (the world works it out). */
  readonly size: number;
  readonly x: number;
  readonly y: number;
  /** World units per second. */
  readonly vx?: number;
  readonly vy?: number;
  /** Radians per second; positive turns clockwise on screen (y grows downward). */
  readonly spin?: number;
  /** Start smaller and grow into the tier's radius over MERGE_GROW_MS (merged cats). */
  readonly startRadius?: number;
  /** Play time of the first contact, if the cat counts as landed already. */
  readonly landedMs?: number;
}

export class Ball implements BallView, CircleShape {
  radius: number;
  targetRadius: number;
  /** Play time of the first contact, or −1. */
  landedMs: number;
  /** The merges a boulder still needs to break; 0 for a cat. */
  hitsLeft: number;
  /** Set once the world has removed the cat. */
  removed = false;
  /** Set by the world during a step when the cat touches a growing cat. */
  touchesGrowth = false;
  private growFrom: number;
  private growAgeMs = 0;

  constructor(
    readonly id: number,
    readonly tier: number,
    public size: number,
    readonly body: Matter.Body,
    startRadius: number,
    landedMs: number,
    readonly kind: BallKind = 'cat',
    readonly golden = false,
    hitsLeft = 0,
  ) {
    this.targetRadius = sizeRadius(size);
    this.radius = Math.min(startRadius, this.targetRadius);
    this.growFrom = this.radius;
    this.landedMs = landedMs;
    this.hitsLeft = hitsLeft;
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

  /** Radians per second; positive turns clockwise on screen. */
  get spin(): number {
    return this.body.angularVelocity * MATTER_TICKS_PER_SECOND;
  }

  /** World units per second. */
  get speed(): number {
    return Math.hypot(this.body.velocity.x, this.body.velocity.y) * MATTER_TICKS_PER_SECOND;
  }

  get growing(): boolean {
    return this.radius < this.targetRadius;
  }

  /** Where the growth after a merge started and how far it has come (a saved run). */
  get growth(): { readonly from: number; readonly ageMs: number } {
    return { from: this.growFrom, ageMs: this.growAgeMs };
  }

  /** Continues a saved ball's growth. */
  restoreGrowth(from: number, ageMs: number): void {
    this.growFrom = Math.min(from, this.radius);
    this.growAgeMs = Math.max(0, ageMs);
  }

  /** Grows linearly from the start radius to the size's radius over MERGE_GROW_MS. */
  grow(dtMs: number): void {
    if (!this.growing) return;
    this.growAgeMs += dtMs;
    const t = this.growAgeMs / MERGE_GROW_MS;
    const radius =
      t >= 1 ? this.targetRadius : this.growFrom + (this.targetRadius - this.growFrom) * t;
    const factor = radius / this.radius;
    Matter.Body.scale(this.body, factor, factor);
    this.radius = radius;
    setCircleMass(this.body, this.size, radius);
  }
}

/** Mass and inertia of a solid disc of the size's density (the hull polygon is a bit bigger). */
function setCircleMass(body: Matter.Body, size: number, radius: number): void {
  const mass = densityForSize(size) * Math.PI * radius * radius;
  Matter.Body.setMass(body, mass);
  Matter.Body.setInertia(body, BALL_INERTIA_SCALE * 0.5 * mass * radius * radius);
}

export function createBall(id: number, spec: BallSpec): Ball {
  if (!isTier(spec.tier)) throw new RangeError(`Unknown tier: ${spec.tier}`);
  const kind = spec.kind ?? 'cat';
  const hits = kind === 'boulder' ? (spec.hits ?? 1) : 0;
  if (kind === 'boulder' && !(Number.isInteger(hits) && hits >= 1)) {
    throw new RangeError(`Invalid boulder hits: ${spec.hits}`);
  }
  if (!isSize(spec.size)) throw new RangeError(`Tier ${spec.tier} has no size here: ${spec.size}`);
  if (!Number.isFinite(spec.x) || !Number.isFinite(spec.y)) {
    throw new RangeError(`Invalid position: ${spec.x}, ${spec.y}`);
  }
  const full = sizeRadius(spec.size);
  const radius = Math.min(spec.startRadius ?? full, full);
  if (!(radius > 0)) throw new RangeError(`Invalid start radius: ${spec.startRadius}`);
  const hull = radius / Math.cos(Math.PI / BALL_HULL_SIDES);
  const body = Matter.Bodies.circle(
    spec.x,
    spec.y,
    hull,
    {
      label: kind,
      restitution: BALL_RESTITUTION,
      frictionAir: BALL_FRICTION_AIR,
    },
    BALL_HULL_SIDES,
  );
  const golden = kind === 'cat' && (spec.golden ?? false);
  const ball = new Ball(
    id,
    spec.tier,
    spec.size,
    body,
    radius,
    spec.landedMs ?? -1,
    kind,
    golden,
    hits,
  );
  (body.plugin as { circle?: Ball }).circle = ball;
  setCircleMass(body, spec.size, radius);
  if (spec.vx || spec.vy) {
    Matter.Body.setVelocity(body, {
      x: (spec.vx ?? 0) / MATTER_TICKS_PER_SECOND,
      y: (spec.vy ?? 0) / MATTER_TICKS_PER_SECOND,
    });
  }
  if (spec.spin) Matter.Body.setAngularVelocity(body, spec.spin / MATTER_TICKS_PER_SECOND);
  return ball;
}

/** The ball a matter-js body belongs to, if any. */
export function ballOf(body: Matter.Body): Ball | undefined {
  return (body.plugin as { circle?: Ball } | undefined)?.circle;
}
