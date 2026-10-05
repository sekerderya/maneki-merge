/**
 * The matter-js world of one run (TECH_SPEC §4–§5): the jar walls of the current stage, the cats,
 * and one fixed step at a time. Each step also tracks first contacts, collects same-tier contacts
 * for the merge resolver, grows merged cats and clamps speeds. No randomness and no wall clock:
 * the same calls always give the same world.
 */
import Matter from 'matter-js';
import {
  ENABLE_SLEEPING,
  gravityForScale,
  GROWTH_NEIGHBOUR_MAX_SPEED_BASE,
  MAX_ANGULAR_SPEED,
  MAX_SPEED_BASE,
  PHYSICS_MAX_SUBSTEPS,
  PHYSICS_STEP_MS,
  POSITION_ITERATIONS,
  VELOCITY_ITERATIONS,
  WALL_HEIGHT_FACTOR,
  WALL_THICKNESS,
} from '../config/physics';
import { FIRST_STAGE, STAGE_COUNT } from '../config/stages';
import type { StateHasher } from '../core/hash';
import { ballOf, createBall, MATTER_TICKS_PER_SECOND } from './balls';
import type { Ball, BallSpec } from './balls';
import { installCircleCollisions } from './circleCollision';
import { jarGeometry } from './geometry';
import type { JarGeometry } from './geometry';

/** matter-js's gravity unit: gravity.y = 1 accelerates by 0.001 units/ms² (1000 units/s²). */
const MATTER_GRAVITY_SCALE = 0.001;

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
    this.accumulator = Math.min(this.accumulator + frameMs, this.maxSteps * this.stepMs);
    let steps = 0;
    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      steps++;
      tick();
    }
    return steps;
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
  /** Speed limits in matter-js units (per base tick), scaled to the stage. */
  private maxSpeed = 0;
  private neighbourMaxSpeed = 0;
  private readonly maxAngularSpeed = MAX_ANGULAR_SPEED / MATTER_TICKS_PER_SECOND;

  constructor(options: PhysicsWorldOptions = {}) {
    installCircleCollisions();
    this.geo = jarGeometry(options.stage ?? FIRST_STAGE);
    this.engine = Matter.Engine.create({
      positionIterations: POSITION_ITERATIONS,
      velocityIterations: VELOCITY_ITERATIONS,
      enableSleeping: ENABLE_SLEEPING,
      gravity: { x: 0, y: 0, scale: MATTER_GRAVITY_SCALE },
    });

    // The walls are tall enough for every stage and only slide sideways; the floor is wide
    // enough to stay under them at stage 5.
    const last = jarGeometry(STAGE_COUNT);
    const top = -WALL_HEIGHT_FACTOR * last.height;
    const wallHeight = WALL_THICKNESS - top;
    const wallY = (WALL_THICKNESS + top) / 2;
    const wall = (): Matter.Body =>
      Matter.Bodies.rectangle(0, wallY, WALL_THICKNESS, wallHeight, {
        isStatic: true,
        label: 'wall',
      });
    this.leftWall = wall();
    this.rightWall = wall();
    const floor = Matter.Bodies.rectangle(
      0,
      WALL_THICKNESS / 2,
      last.width + 2 * WALL_THICKNESS,
      WALL_THICKNESS,
      { isStatic: true, label: 'floor' },
    );
    Matter.Composite.add(this.engine.world, [floor, this.leftWall, this.rightWall]);
    this.applyStage();
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

  /** matter-js gravity.y; 1 at stage 1. */
  get gravity(): number {
    return this.engine.gravity.y;
  }

  /** The speed limit for every cat at the current stage, in world units per second. */
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

  /** Moves the walls to the stage's jar and scales gravity and the speed limits with it. */
  setStage(stage: number): void {
    this.geo = jarGeometry(stage);
    this.applyStage();
  }

  addBall(spec: BallSpec): Ball {
    const ball = createBall(this.nextId++, spec);
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

  /** Caps a cat's speed (world units per second) right now. */
  capSpeed(ball: Ball, unitsPerSecond: number): void {
    this.limitSpeed(ball.body, unitsPerSecond / MATTER_TICKS_PER_SECOND);
  }

  /** Feeds everything that decides the future of the world into `hasher`. */
  hashInto(hasher: StateHasher): void {
    hasher.number(this.stepCount).number(this.geo.stage).bool(this.isPaused);
    hasher.number(this.list.length).number(this.nextId);
    for (const ball of this.list) {
      const { position, angle } = ball.body;
      const { positionPrev, anglePrev } = ball.body as unknown as VerletBody;
      hasher.number(ball.id).number(ball.tier).bool(ball.golden);
      hasher.number(position.x).number(position.y);
      hasher.number(positionPrev.x).number(positionPrev.y);
      hasher.number(angle).number(anglePrev);
      hasher.number(ball.radius).number(ball.landedMs);
    }
  }

  private applyStage(): void {
    const { halfWidth, scale } = this.geo;
    const offset = halfWidth + WALL_THICKNESS / 2;
    Matter.Body.setPosition(this.leftWall, { x: -offset, y: this.leftWall.position.y });
    Matter.Body.setPosition(this.rightWall, { x: offset, y: this.rightWall.position.y });
    this.engine.gravity.y = gravityForScale(scale);
    this.maxSpeed = (MAX_SPEED_BASE * scale) / MATTER_TICKS_PER_SECOND;
    this.neighbourMaxSpeed = (GROWTH_NEIGHBOUR_MAX_SPEED_BASE * scale) / MATTER_TICKS_PER_SECOND;
  }

  /**
   * One pass over matter-js's pair list. With sleeping off it holds exactly the pairs that
   * overlap this step (new and continuing), once each.
   */
  private scanContacts(): void {
    const now = this.timeMs;
    const contacts = this.sameTierContacts;
    contacts.length = 0;
    for (const pair of (this.engine.pairs as unknown as PairList).list) {
      if (!pair.isActive) continue;
      const a = ballOf(pair.bodyA);
      const b = ballOf(pair.bodyB);
      if (a && a.landedMs < 0) a.landedMs = now;
      if (b && b.landedMs < 0) b.landedMs = now;
      if (!a || !b) continue;
      if (a.tier === b.tier) contacts.push(a, b);
      if (a.growing) b.touchesGrowth = true;
      if (b.growing) a.touchesGrowth = true;
    }
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
