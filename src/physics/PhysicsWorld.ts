/**
 * The matter-js world of one run (TECH_SPEC §4–§5): the jar walls, the cats of the current stage,
 * and one fixed step at a time. Every stage has the same jar and gravity; moving to the next stage
 * rescales the cats instead (`setStage`). Each step also tracks first contacts, collects same-tier contacts
 * for the merge resolver, grows merged cats and clamps speeds. No randomness and no wall clock:
 * the same calls always give the same world.
 */
import Matter from 'matter-js';
import {
  CORNER_CUSHION_KEEP,
  CORNER_CUSHION_MS,
  ENABLE_SLEEPING,
  FLOOR_RESTITUTION,
  FLOOR_ROLLING_RESISTANCE,
  GRAVITY_BASE,
  GROWTH_NEIGHBOUR_MAX_SPEED_BASE,
  JAR_FRICTION,
  JAR_FRICTION_STATIC,
  MAX_ANGULAR_SPEED,
  MAX_SPEED_BASE,
  PHYSICS_MAX_SUBSTEPS,
  PHYSICS_STEP_MS,
  POSITION_ITERATIONS,
  stepsFor,
  VELOCITY_ITERATIONS,
  WALL_HEIGHT_FACTOR,
  WALL_THICKNESS,
} from '../config/physics';
import { FIRST_STAGE, tierSize } from '../config/stages';
import { isSize, STAGE_ZOOM } from '../config/tiers';
import type { StateHasher } from '../core/hash';
import { ballOf, createBall, MATTER_TICKS_PER_SECOND } from './balls';
import type { Ball, BallSpec } from './balls';

/** A cat to add: the world works out its size at the current stage. */
export type NewBall = Omit<BallSpec, 'size'>;
import { inRoundedCorner, installCircleCollisions, roundedFloorOf } from './circleCollision';
import { jarGeometry } from './geometry';
import type { JarGeometry } from './geometry';
import { installRestitutionOverride } from './restitution';

/** matter-js's gravity unit: gravity.y = 1 accelerates by 0.001 units/ms² (1000 units/s²). */
const MATTER_GRAVITY_SCALE = 0.001;

/**
 * Speed factors for the `steps` steps of a cushion: 1 minus a sin² bump, so the braking eases in
 * and out with no jolt, scaled so that together they leave about `keep` of the speed.
 */
export function cushionFactors(steps: number, keep: number): number[] {
  const strength = (-2 * Math.log(keep)) / steps;
  return Array.from(
    { length: steps },
    (_, i) => 1 - strength * Math.sin((Math.PI * (i + 0.5)) / steps) ** 2,
  );
}

/** The first-landing cushion, one factor per step (CORNER_CUSHION_MS). */
export const CUSHION_FACTORS: readonly number[] = cushionFactors(
  stepsFor(CORNER_CUSHION_MS),
  CORNER_CUSHION_KEEP,
);

/** The fields of matter-js internals this module reads but @types/matter-js leaves out. */
interface PairList {
  readonly list: readonly Matter.Pair[];
}
interface VerletBody {
  readonly positionPrev: Matter.Vector;
  readonly anglePrev: number;
}

/**
 * Turns frame times into whole fixed steps. At most `maxSteps` run per frame and the rest of a
 * long frame is dropped, so a slow device slows the game down instead of spiralling.
 */
export class FixedStepper {
  private accumulator = 0;

  constructor(
    readonly stepMs = PHYSICS_STEP_MS,
    readonly maxSteps = PHYSICS_MAX_SUBSTEPS,
  ) {}

  /** Adds a frame's time and calls `tick` once per whole step. Returns the number of steps. */
  advance(frameMs: number, tick: () => void): number {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return 0;
    this.accumulator += frameMs;
    // Divide instead of subtracting step by step: 5 × (1000/120) ms must give 5 steps, not 4.
    let steps = Math.floor(this.accumulator / this.stepMs + 1e-9);
    if (steps > this.maxSteps) {
      steps = this.maxSteps;
      this.accumulator = 0;
    } else {
      this.accumulator = Math.max(0, this.accumulator - steps * this.stepMs);
    }
    for (let i = 0; i < steps; i++) tick();
    return steps;
  }

  /**
   * How far the leftover time has come towards the next step, 0 (inclusive) to 1 (exclusive).
   * Rendering only: it smooths motion between steps without touching the simulation.
   */
  get alpha(): number {
    return Math.min(this.accumulator / this.stepMs, 1 - 1e-9);
  }

  /** Forgets leftover time, e.g. when the game resumes after a pause. */
  reset(): void {
    this.accumulator = 0;
  }
}

export interface PhysicsWorldOptions {
  readonly stage?: number;
}

export class PhysicsWorld {
  /**
   * Same-tier cats that touched during the last step, as a flat list: pair i is
   * [2i] and [2i + 1]. matter-js keeps one pair per two bodies, so there are no duplicates.
   */
  readonly sameTierContacts: Ball[] = [];

  private readonly engine: Matter.Engine;
  private readonly list: Ball[] = [];
  private readonly leftWall: Matter.Body;
  private readonly rightWall: Matter.Body;
  private readonly scratch = { x: 0, y: 0 };
  private geo: JarGeometry;
  private stepCount = 0;
  private nextId = 1;
  private isPaused = false;
  /** Speed limits in matter-js units (per base tick). */
  private readonly maxSpeed = MAX_SPEED_BASE / MATTER_TICKS_PER_SECOND;
  private readonly neighbourMaxSpeed = GROWTH_NEIGHBOUR_MAX_SPEED_BASE / MATTER_TICKS_PER_SECOND;
  private readonly maxAngularSpeed = MAX_ANGULAR_SPEED / MATTER_TICKS_PER_SECOND;
  /** Speed a lone cat on the floor loses per step (FLOOR_ROLLING_RESISTANCE), in matter-js units. */
  private readonly rollingLoss =
    (FLOOR_ROLLING_RESISTANCE * PHYSICS_STEP_MS) / 1000 / MATTER_TICKS_PER_SECOND;

  constructor(options: PhysicsWorldOptions = {}) {
    installCircleCollisions();
    installRestitutionOverride();
    this.geo = jarGeometry(options.stage ?? FIRST_STAGE);
    this.engine = Matter.Engine.create({
      positionIterations: POSITION_ITERATIONS,
      velocityIterations: VELOCITY_ITERATIONS,
      enableSleeping: ENABLE_SLEEPING,
      gravity: { x: 0, y: GRAVITY_BASE, scale: MATTER_GRAVITY_SCALE },
    });

    // The walls stand WALL_HEIGHT_FACTOR jar heights tall; the floor reaches under them.
    const jar = this.geo;
    const top = -WALL_HEIGHT_FACTOR * jar.height;
    const wallHeight = WALL_THICKNESS - top;
    const wallY = (WALL_THICKNESS + top) / 2;
    const wall = (): Matter.Body =>
      Matter.Bodies.rectangle(0, wallY, WALL_THICKNESS, wallHeight, {
        isStatic: true,
        label: 'wall',
        friction: JAR_FRICTION,
        frictionStatic: JAR_FRICTION_STATIC,
      });
    this.leftWall = wall();
    this.rightWall = wall();
    // The floor's rectangle reaches up to the rounded corners' centres (circleCollision.ts); its
    // flat top is still y = 0.
    const corner = jar.cornerRadius;
    const floor = Matter.Bodies.rectangle(
      0,
      (WALL_THICKNESS - corner) / 2,
      jar.width + 2 * WALL_THICKNESS,
      WALL_THICKNESS + corner,
      {
        isStatic: true,
        label: 'floor',
        friction: JAR_FRICTION,
        frictionStatic: JAR_FRICTION_STATIC,
        // A landing cat stops dead (restitution.ts). Its bottom corners are rounded.
        plugin: {
          restitution: FLOOR_RESTITUTION,
          roundedFloor: { top: 0, cx: jar.halfWidth - corner, cy: -corner, radius: corner },
        },
      },
    );
    const offset = jar.halfWidth + WALL_THICKNESS / 2;
    Matter.Body.setPosition(this.leftWall, { x: -offset, y: wallY });
    Matter.Body.setPosition(this.rightWall, { x: offset, y: wallY });
    Matter.Composite.add(this.engine.world, [floor, this.leftWall, this.rightWall]);
  }

  /** Every cat in the world, oldest first. */
  get balls(): readonly Ball[] {
    return this.list;
  }

  get stage(): number {
    return this.geo.stage;
  }

  get geometry(): JarGeometry {
    return this.geo;
  }

  /** Simulated time: steps × PHYSICS_STEP_MS. */
  get timeMs(): number {
    return this.stepCount * PHYSICS_STEP_MS;
  }

  get steps(): number {
    return this.stepCount;
  }

  /** matter-js gravity.y. */
  get gravity(): number {
    return this.engine.gravity.y;
  }

  /** x of the right wall's inner face (the left one mirrors it): the jar's half-width. */
  get wallInnerX(): number {
    return this.rightWall.position.x - WALL_THICKNESS / 2;
  }

  /** The speed limit for every cat, in world units per second. */
  get speedLimit(): number {
    return this.maxSpeed * MATTER_TICKS_PER_SECOND;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  /**
   * Moves on to the next stage (GAME_DESIGN §7): the jar has grown by STAGE_ZOOM, so the world
   * shrinks by as much around the floor's centre and the new stage plays in the same jar. The
   * last cat of the old stage becomes the first of the new one. Every cat must fit the new stage;
   * the run pops the others first.
   */
  setStage(stage: number): void {
    if (stage !== this.geo.stage + 1)
      throw new RangeError(`Can't move from stage ${this.geo.stage} to ${stage}`);
    const sizes = this.list.map((ball) => tierSize(ball.tier, stage));
    if (!sizes.every(isSize)) throw new RangeError(`Stage ${stage} can't hold every cat`);
    this.geo = jarGeometry(stage);
    this.list.forEach((ball, i) => ball.rescale(1 / STAGE_ZOOM, sizes[i] as number));
  }

  /** The size a tier has at the current stage (outside 1–10 when the stage can't hold it). */
  sizeOf(tier: number): number {
    return tierSize(tier, this.geo.stage);
  }

  addBall(spec: NewBall): Ball {
    const ball = createBall(this.nextId++, { ...spec, size: this.sizeOf(spec.tier) });
    this.list.push(ball);
    Matter.Composite.add(this.engine.world, ball.body);
    if (spec.vx || spec.vy) this.limitSpeed(ball.body, this.maxSpeed);
    return ball;
  }

  removeBall(ball: Ball): void {
    if (ball.removed) return;
    const index = this.list.indexOf(ball);
    if (index < 0) throw new Error(`Cat ${ball.id} is not in this world`);
    this.list.splice(index, 1);
    Matter.Composite.remove(this.engine.world, ball.body);
    ball.removed = true;
  }

  /** Runs one fixed step, unless paused. Returns whether it ran. */
  step(): boolean {
    if (this.isPaused) return false;
    Matter.Engine.update(this.engine, PHYSICS_STEP_MS);
    this.stepCount++;
    this.scanContacts();
    for (const ball of this.list) {
      if (ball.growing) ball.grow(PHYSICS_STEP_MS);
    }
    for (const ball of this.list) {
      if (ball.landsOnCorner) {
        // A dropped cat landing alone on a curve: the cushion takes its fall's speed gently, so
        // it isn't swung across the jar (CORNER_CUSHION_MS).
        ball.landsOnCorner = false;
        if (!ball.touchesCat) ball.cushionStep = 0;
      }
      if (ball.cushionStep >= 0) {
        const factor = CUSHION_FACTORS[ball.cushionStep] as number;
        ball.cushionStep =
          ball.cushionStep + 1 < CUSHION_FACTORS.length ? ball.cushionStep + 1 : -1;
        if (!ball.touchesCat) this.scaleSpeed(ball.body, factor);
      }
      if (ball.touchesFloor && !ball.touchesCat) {
        // Rolling resistance: a lone cat on the floor slows down like a ball on a rug.
        const { x, y } = ball.body.velocity;
        const speed = Math.sqrt(x * x + y * y);
        this.scaleSpeed(ball.body, speed > this.rollingLoss ? 1 - this.rollingLoss / speed : 0);
      }
      if (ball.touchesGrowth) {
        ball.touchesGrowth = false;
        this.limitSpeed(ball.body, this.neighbourMaxSpeed);
      }
      this.limitSpeed(ball.body, this.maxSpeed);
      const spin = ball.body.angularVelocity;
      if (spin > this.maxAngularSpeed || spin < -this.maxAngularSpeed) {
        Matter.Body.setAngularVelocity(
          ball.body,
          spin > 0 ? this.maxAngularSpeed : -this.maxAngularSpeed,
        );
      }
    }
    return true;
  }

  /** Feeds everything that decides the future of the world into `hasher`. */
  hashInto(hasher: StateHasher): void {
    hasher.number(this.stepCount).number(this.geo.stage).bool(this.isPaused);
    hasher.number(this.list.length).number(this.nextId);
    for (const ball of this.list) {
      const { position, angle } = ball.body;
      const { positionPrev, anglePrev } = ball.body as unknown as VerletBody;
      hasher.number(ball.id).number(ball.tier);
      hasher.number(position.x).number(position.y);
      hasher.number(positionPrev.x).number(positionPrev.y);
      hasher.number(angle).number(anglePrev);
      hasher.number(ball.radius).number(ball.landedMs).number(ball.cushionStep);
    }
  }

  /**
   * One pass over matter-js's pair list. With sleeping off it holds exactly the pairs that
   * overlap this step (new and continuing), once each.
   */
  private scanContacts(): void {
    const now = this.timeMs;
    const contacts = this.sameTierContacts;
    contacts.length = 0;
    for (const ball of this.list) {
      ball.touchesCat = false;
      ball.touchesFloor = false;
    }
    for (const pair of (this.engine.pairs as unknown as PairList).list) {
      if (!pair.isActive) continue;
      const a = ballOf(pair.bodyA);
      const b = ballOf(pair.bodyB);
      if (a && a.landedMs < 0) a.landedMs = now;
      if (b && b.landedMs < 0) b.landedMs = now;
      if (!a || !b) {
        if (a) this.markFloor(a, pair.bodyB, now);
        if (b) this.markFloor(b, pair.bodyA, now);
        continue;
      }
      a.touchesCat = true;
      b.touchesCat = true;
      if (a.tier === b.tier) contacts.push(a, b);
      if (a.growing) b.touchesGrowth = true;
      if (b.growing) a.touchesGrowth = true;
    }
  }

  /**
   * Notes a cat touching the floor (`other` may be a wall), and one that lands this step (its
   * first contact) on one of the floor's rounded corners.
   */
  private markFloor(ball: Ball, other: Matter.Body, now: number): void {
    const floor = roundedFloorOf(other);
    if (!floor) return;
    ball.touchesFloor = true;
    if (ball.landedMs === now && inRoundedCorner(ball.x, ball.y, ball.radius, floor)) {
      ball.landsOnCorner = true;
    }
  }

  /** Multiplies a body's velocity and spin by `factor`. */
  private scaleSpeed(body: Matter.Body, factor: number): void {
    this.scratch.x = body.velocity.x * factor;
    this.scratch.y = body.velocity.y * factor;
    Matter.Body.setVelocity(body, this.scratch);
    Matter.Body.setAngularVelocity(body, body.angularVelocity * factor);
  }

  private limitSpeed(body: Matter.Body, max: number): void {
    const { x, y } = body.velocity;
    const speed2 = x * x + y * y;
    if (speed2 <= max * max) return;
    const k = max / Math.sqrt(speed2);
    this.scratch.x = x * k;
    this.scratch.y = y * k;
    Matter.Body.setVelocity(body, this.scratch);
  }
}
