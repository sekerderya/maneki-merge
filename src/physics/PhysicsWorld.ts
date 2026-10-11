/**
 * The matter-js world of one run (TECH_SPEC §4–§5): the jar walls, the cats of the current stage,
 * and one fixed step at a time. Every stage has the same jar and gravity; the next stage starts
 * with an empty jar (`setStage`). Each step also tracks first contacts, collects the contacts that
 * can merge (same-tier cats, a joker and a cat) for the merge resolver, grows merged cats and
 * clamps speeds. No randomness and no wall clock:
 * the same calls always give the same world.
 */
import Matter from 'matter-js';
import {
  ENABLE_SLEEPING,
  FALL_GUARD_DEPTH,
  FLOOR_RESTITUTION,
  GRAVITY_BASE,
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
import { FIRST_STAGE, tierSize } from '../config/stages';
import type { StateHasher } from '../core/hash';
import type { SavedBall, WorldSnapshot } from '../core/runSave';
import { ballOf, createBall, MATTER_TICKS_PER_SECOND } from './balls';
import type { Ball, BallSpec } from './balls';
import { fallPullback } from './fallGuard';

/** A cat to add: the world works out its size at the current stage. */
export type NewBall = Omit<BallSpec, 'size'>;
import { installCircleCollisions } from './circleCollision';
import { installCoulombFriction } from './friction';
import { jarGeometry } from './geometry';
import type { JarGeometry } from './geometry';
import { installRestitutionOverride } from './restitution';

/** matter-js's gravity unit: gravity.y = 1 accelerates by 0.001 units/ms² (1000 units/s²). */
const MATTER_GRAVITY_SCALE = 0.001;
/** World units per second² in matter-js's units per ms². */
const PER_MS2 = 1e-6;
/** matter-js's base step: velocities are per this many ms, and air friction is set for it. */
const MATTER_BASE_DELTA = 1000 / MATTER_TICKS_PER_SECOND;

/**
 * What acts on a ball from the drop until its first contact (GAME_DESIGN §15.8–§15.9): the wind's
 * sideways push and Heavy Drop's extra gravity (world units per second², the wind's sign is its
 * direction), and its speed limit while it falls (world units per second, at least the normal one).
 */
export interface FallForces {
  readonly windAccel: number;
  readonly gravityBonus: number;
  readonly maxFallSpeed: number;
}

/** The fields of matter-js internals this module reads but @types/matter-js leaves out. */
interface PairList {
  readonly list: readonly Matter.Pair[];
}
interface VerletBody {
  readonly positionPrev: Matter.Vector;
  readonly anglePrev: number;
  /** The last step's length in ms. */
  readonly deltaTime: number;
}
/** The integrator's and solver's state a saved run writes back into a body. */
interface BodyState {
  positionPrev: Matter.Vector;
  anglePrev: number;
  velocity: Matter.Vector;
  angularVelocity: number;
  speed: number;
  angularSpeed: number;
  deltaTime: number;
  positionImpulse: Matter.Vector;
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
   * The balls that touched during the last step and can merge, as a flat list: pair i is [2i] and
   * [2i + 1]. Either two cats of the same tier, or a joker and a cat (the joker first). matter-js
   * keeps one pair per two bodies, so there are no duplicates. Boulders and hanabi never merge.
   */
  readonly mergeContacts: Ball[] = [];
  /** Jokers touching boulders during the last step, flat like `mergeContacts`: joker, boulder. */
  readonly jokerBoulderContacts: Ball[] = [];

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
  /** The falling balls' forces (units per ms²) and speed limit (matter-js units). */
  private windAccel = 0;
  private gravityBonus = 0;
  private maxFallSpeed = this.maxSpeed;

  constructor(options: PhysicsWorldOptions = {}) {
    installCircleCollisions();
    installRestitutionOverride();
    installCoulombFriction();
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
      });
    this.leftWall = wall();
    this.rightWall = wall();
    const floor = Matter.Bodies.rectangle(
      0,
      WALL_THICKNESS / 2,
      jar.width + 2 * WALL_THICKNESS,
      WALL_THICKNESS,
      {
        isStatic: true,
        label: 'floor',
        // A landing cat stops dead (restitution.ts).
        plugin: { restitution: FLOOR_RESTITUTION },
      },
    );
    const offset = jar.halfWidth + WALL_THICKNESS / 2;
    Matter.Body.setPosition(this.leftWall, { x: -offset, y: wallY });
    Matter.Body.setPosition(this.rightWall, { x: offset, y: wallY });
    Matter.Composite.add(this.engine.world, [floor, this.leftWall, this.rightWall]);
  }

  /** Every ball in the world (cats and boulders), oldest first. */
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

  /** The speed limit of a ball still falling from the dropper, in world units per second. */
  get fallSpeedLimit(): number {
    return this.maxFallSpeed * MATTER_TICKS_PER_SECOND;
  }

  /**
   * Sets what acts on every ball from the drop until its first contact (the wind, Heavy Drop).
   * Nothing (0, 0 and the normal limit) by default.
   */
  setFallForces(forces: FallForces): void {
    this.windAccel = forces.windAccel * PER_MS2;
    this.gravityBonus = forces.gravityBonus * PER_MS2;
    this.maxFallSpeed = Math.max(this.maxSpeed, forces.maxFallSpeed / MATTER_TICKS_PER_SECOND);
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
   * Moves on to the next stage (GAME_DESIGN §7): the grown jar is the same jar in world units,
   * and it starts empty. The run pops every ball first.
   */
  setStage(stage: number): void {
    if (stage !== this.geo.stage + 1)
      throw new RangeError(`Can't move from stage ${this.geo.stage} to ${stage}`);
    if (this.list.length > 0)
      throw new RangeError(`The jar must be empty to grow into stage ${stage}`);
    this.geo = jarGeometry(stage);
  }

  /** The size a tier has at the current stage (outside 1–9 when the stage can't hold it). */
  sizeOf(tier: number): number {
    return tierSize(tier, this.geo.stage);
  }

  addBall(spec: NewBall): Ball {
    const ball = createBall(this.nextId++, { ...spec, size: this.sizeOf(spec.tier) });
    this.list.push(ball);
    Matter.Composite.add(this.engine.world, ball.body);
    if (spec.vx || spec.vy) this.limitSpeed(ball.body, this.speedCap(ball));
    return ball;
  }

  /**
   * Adds a velocity in world units per second to the ball (a hanabi's blast, GAME_DESIGN §15.6),
   * within the speed limit.
   */
  push(ball: Ball, vx: number, vy: number): void {
    const v = ball.body.velocity;
    this.scratch.x = v.x + vx / MATTER_TICKS_PER_SECOND;
    this.scratch.y = v.y + vy / MATTER_TICKS_PER_SECOND;
    Matter.Body.setVelocity(ball.body, this.scratch);
    this.limitSpeed(ball.body, this.maxSpeed);
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
    if (this.windAccel !== 0 || this.gravityBonus !== 0) this.pushFalling();
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
      this.limitSpeed(ball.body, this.speedCap(ball));
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

  /**
   * The world between two steps, for a saved run: every ball with its body's integrator state.
   * matter-js's contact cache isn't kept, so a restored world's first steps re-solve the contacts
   * (the pile doesn't visibly move).
   */
  snapshot(): WorldSnapshot {
    return {
      stage: this.geo.stage,
      steps: this.stepCount,
      nextId: this.nextId,
      paused: this.isPaused,
      balls: this.list.map(saveBall),
    };
  }

  /** Rebuilds a saved world. Only a new world (never stepped, empty) can be restored. */
  restore(saved: WorldSnapshot): void {
    if (this.list.length > 0 || this.stepCount > 0) {
      throw new Error('Only a new world can be restored');
    }
    this.geo = jarGeometry(saved.stage);
    this.stepCount = saved.steps;
    this.isPaused = saved.paused;
    const ids = new Set<number>();
    let lastId = 0;
    for (const ball of saved.balls) {
      if (ids.has(ball.id) || ball.id < 1) throw new RangeError(`Invalid ball id ${ball.id}`);
      ids.add(ball.id);
      lastId = Math.max(lastId, ball.id);
      this.restoreBall(ball);
    }
    this.nextId = Math.max(saved.nextId, lastId + 1);
  }

  private restoreBall(saved: SavedBall): void {
    const ball = createBall(saved.id, {
      kind: saved.kind,
      tier: saved.tier,
      golden: saved.golden,
      hits: saved.hitsLeft,
      size: this.sizeOf(saved.tier),
      x: saved.x,
      y: saved.y,
      startRadius: saved.radius,
      landedMs: saved.landedMs,
      struck: saved.struck,
    });
    ball.restoreGrowth(saved.growFrom, saved.growMs);
    const body = ball.body;
    Matter.Body.setAngle(body, saved.angle);
    const state = body as unknown as BodyState;
    state.positionPrev.x = saved.prevX;
    state.positionPrev.y = saved.prevY;
    state.anglePrev = saved.anglePrev;
    state.velocity.x = saved.vx;
    state.velocity.y = saved.vy;
    state.speed = Math.hypot(saved.vx, saved.vy);
    state.angularVelocity = saved.spin;
    state.angularSpeed = Math.abs(saved.spin);
    if (saved.deltaTime > 0) state.deltaTime = saved.deltaTime;
    state.positionImpulse.x = saved.impulseX;
    state.positionImpulse.y = saved.impulseY;
    this.list.push(ball);
    Matter.Composite.add(this.engine.world, body);
  }

  /** Feeds everything that decides the future of the world into `hasher`. */
  hashInto(hasher: StateHasher): void {
    hasher.number(this.stepCount).number(this.geo.stage).bool(this.isPaused);
    hasher.number(this.list.length).number(this.nextId);
    for (const ball of this.list) {
      const { position, angle } = ball.body;
      const { positionPrev, anglePrev } = ball.body as unknown as VerletBody;
      hasher.number(ball.id).string(ball.kind).number(ball.tier);
      hasher.bool(ball.golden).number(ball.hitsLeft);
      hasher.number(position.x).number(position.y);
      hasher.number(positionPrev.x).number(positionPrev.y);
      hasher.number(angle).number(anglePrev);
      hasher.number(ball.radius).number(ball.landedMs);
      for (const id of ball.struck) hasher.number(id);
    }
  }

  /**
   * One pass over matter-js's pair list. With sleeping off it holds exactly the pairs that
   * overlap this step (new and continuing), once each.
   */
  private scanContacts(): void {
    const now = this.timeMs;
    const contacts = this.mergeContacts;
    contacts.length = 0;
    const struck = this.jokerBoulderContacts;
    struck.length = 0;

    for (const pair of (this.engine.pairs as unknown as PairList).list) {
      if (!pair.isActive) continue;
      const a = ballOf(pair.bodyA);
      const b = ballOf(pair.bodyB);
      if (a && a.landedMs < 0) a.landedMs = now;
      if (b && b.landedMs < 0) b.landedMs = now;
      if (!a || !b) continue;
      if (a.kind === 'cat' && b.kind === 'cat') {
        if (a.tier === b.tier) contacts.push(a, b);
      } else if (a.kind === 'joker' || b.kind === 'joker') {
        const [joker, other] = a.kind === 'joker' ? [a, b] : [b, a];
        if (other.kind === 'cat') contacts.push(joker, other);
        else if (other.kind === 'boulder') struck.push(joker, other);
      }
      if (a.growing) b.touchesGrowth = true;
      if (b.growing) a.touchesGrowth = true;
    }
  }

  /** A falling ball's limit is the fall's (Heavy Drop); from its first contact the normal one. */
  private speedCap(ball: Ball): number {
    return ball.landedMs < 0 ? this.maxFallSpeed : this.maxSpeed;
  }

  /**
   * The wind and Heavy Drop act on every ball that hasn't touched anything yet, as forces that
   * matter-js integrates in this step. A heavy ball that could sink too deep into something this
   * step starts further back along its path (fallGuard.ts).
   */
  private pushFalling(): void {
    const ax = this.windAccel;
    const ay = this.gravityBonus;
    const gravity = this.engine.gravity.y * MATTER_GRAVITY_SCALE;
    for (const ball of this.list) {
      if (ball.landedMs >= 0) continue;
      const body = ball.body;
      body.force.x += body.mass * ax;
      body.force.y += body.mass * ay;
      if (ay > 0) this.guardFall(ball, ax, ay + gravity);
    }
  }

  /** Moves a falling ball back along its path so that it sinks at most FALL_GUARD_DEPTH. */
  private guardFall(ball: Ball, ax: number, ay: number): void {
    const body = ball.body;
    const prev = body as unknown as VerletBody;
    // This step's move, as matter-js's Verlet integrator will make it.
    const dt = PHYSICS_STEP_MS;
    const keep = (dt / (prev.deltaTime || dt)) * (1 - body.frictionAir * (dt / MATTER_BASE_DELTA));
    const dx = (body.position.x - prev.positionPrev.x) * keep + ax * dt * dt;
    const dy = (body.position.y - prev.positionPrev.y) * keep + ay * dt * dt;
    const back = fallPullback(ball, dx, dy, this.list, this.geo, FALL_GUARD_DEPTH);
    if (back <= 0) return;
    const k = back / Math.hypot(dx, dy);
    this.scratch.x = body.position.x - dx * k;
    this.scratch.y = body.position.y - dy * k;
    // Without updateVelocity, the previous position moves along: its speed stays.
    Matter.Body.setPosition(body, this.scratch);
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

function saveBall(ball: Ball): SavedBall {
  const state = ball.body as unknown as BodyState;
  const { from, ageMs } = ball.growth;
  return {
    id: ball.id,
    kind: ball.kind,
    tier: ball.tier,
    golden: ball.golden,
    hitsLeft: ball.hitsLeft,
    x: ball.body.position.x,
    y: ball.body.position.y,
    prevX: state.positionPrev.x,
    prevY: state.positionPrev.y,
    angle: ball.body.angle,
    anglePrev: state.anglePrev,
    vx: state.velocity.x,
    vy: state.velocity.y,
    spin: state.angularVelocity,
    deltaTime: state.deltaTime,
    impulseX: state.positionImpulse.x,
    impulseY: state.positionImpulse.y,
    radius: ball.radius,
    growFrom: from,
    growMs: ageMs,
    landedMs: ball.landedMs,
    struck: [...ball.struck],
  };
}
