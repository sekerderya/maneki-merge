import Matter from 'matter-js';
import { describe, expect, it, vi } from 'vitest';
import {
  GROWTH_NEIGHBOUR_MAX_SPEED_BASE,
  MAX_ANGULAR_SPEED,
  MAX_SPEED_BASE,
  PHYSICS_MAX_SUBSTEPS,
  PHYSICS_STEP_MS,
} from '../../src/config/physics';
import { sizeRadius, STAGE_ZOOM } from '../../src/config/tiers';
import { MERGE_GROW_MS } from '../../src/config/timings';
import { StateHasher } from '../../src/core/hash';
import { FixedStepper, PhysicsWorld } from '../../src/physics/PhysicsWorld';

const STEPS_PER_SECOND = 120;

function run(world: PhysicsWorld, seconds: number): void {
  for (let i = 0; i < seconds * STEPS_PER_SECOND; i++) world.step();
}

describe('FixedStepper', () => {
  it('runs one tick per whole step and carries the remainder', () => {
    const stepper = new FixedStepper(10, 5);
    const tick = vi.fn();
    expect(stepper.advance(25, tick)).toBe(2);
    expect(stepper.advance(4, tick)).toBe(0);
    expect(stepper.advance(1, tick)).toBe(1); // 5 + 4 + 1 = 10
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it('runs at most maxSteps per frame and drops the rest', () => {
    const stepper = new FixedStepper(10, 5);
    const tick = vi.fn();
    expect(stepper.advance(1000, tick)).toBe(5);
    expect(stepper.advance(9, tick)).toBe(0);
    expect(stepper.advance(1, tick)).toBe(1);
  });

  it('ignores invalid frame times and forgets leftovers on reset', () => {
    const stepper = new FixedStepper(10, 5);
    const tick = vi.fn();
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(stepper.advance(bad, tick)).toBe(0);
    }
    stepper.advance(9, tick);
    stepper.reset();
    expect(stepper.advance(9, tick)).toBe(0);
    expect(tick).not.toHaveBeenCalled();
  });

  it('defaults to the physics step and substep limit', () => {
    const stepper = new FixedStepper();
    expect(stepper.stepMs).toBe(PHYSICS_STEP_MS);
    expect(stepper.maxSteps).toBe(PHYSICS_MAX_SUBSTEPS);
    expect(stepper.advance(1000 / 60, () => {})).toBe(2);
    // Floating-point noise must not lose a step: 5 × (1000/120) ms is 5 steps.
    expect(stepper.advance(5 * PHYSICS_STEP_MS, () => {})).toBe(5);
    expect(stepper.advance(PHYSICS_STEP_MS, () => {})).toBe(1);
  });
});

describe('PhysicsWorld', () => {
  it('drops a cat onto the floor, where it rests at y = −r', () => {
    const world = new PhysicsWorld();
    const cat = world.addBall({ tier: 3, x: 0, y: world.geometry.dropY });
    expect(cat.landedMs).toBe(-1);
    run(world, 3);
    expect(cat.y).toBeCloseTo(-sizeRadius(3), 0);
    expect(cat.speed).toBeLessThan(1);
    // Free fall from y = −924 to the floor takes about 1.3 s.
    expect(cat.landedMs).toBeGreaterThan(1100);
    expect(cat.landedMs).toBeLessThan(1600);
  });

  it('keeps time in fixed steps and stands still while paused', () => {
    const world = new PhysicsWorld();
    const cat = world.addBall({ tier: 1, x: 0, y: -500 });
    world.step();
    world.pause();
    const y = cat.y;
    expect(world.step()).toBe(false);
    expect(cat.y).toBe(y);
    world.resume();
    expect(world.step()).toBe(true);
    expect(world.steps).toBe(2);
    expect(world.timeMs).toBe(2 * PHYSICS_STEP_MS);
  });

  it('keeps cats inside the jar walls', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    const left = world.addBall({ tier: 2, x: -200, y: -100, vx: -1400 });
    const right = world.addBall({ tier: 2, x: 200, y: -100, vx: 1400 });
    for (let i = 0; i < 240; i++) {
      world.step();
      expect(left.x).toBeGreaterThan(-300 + r * 0.85);
      expect(right.x).toBeLessThan(300 - r * 0.85);
    }
  });

  it('rescales the world into the next stage: the last cat becomes the first', () => {
    const world = new PhysicsWorld();
    expect(world.gravity).toBe(1);
    expect(world.speedLimit).toBeCloseTo(MAX_SPEED_BASE, 9);
    const half = world.wallInnerX;

    const last = world.addBall({ tier: 12, x: 20, y: -400, vx: 90, vy: 180 });
    expect(last.size).toBe(12);
    expect(last.radius).toBe(250);
    const angle = last.angle;
    const [vx, vy] = [last.vx, last.vy];
    world.setStage(2);
    expect(world.stage).toBe(2);
    // Same jar, same gravity, same speed limit: only the cat changed.
    expect(world.wallInnerX).toBe(half);
    expect(world.gravity).toBe(1);
    expect(world.speedLimit).toBeCloseTo(MAX_SPEED_BASE, 9);
    expect(last.tier).toBe(12);
    expect(last.size).toBe(1);
    expect(last.radius).toBeCloseTo(sizeRadius(1), 9);
    expect(last.targetRadius).toBe(sizeRadius(1));
    expect(last.x).toBeCloseTo(20 / STAGE_ZOOM, 9);
    expect(last.y).toBeCloseTo(-400 / STAGE_ZOOM, 9);
    expect(last.vx).toBeCloseTo(vx / STAGE_ZOOM, 6);
    expect(last.vy).toBeCloseTo(vy / STAGE_ZOOM, 6);
    expect(last.angle).toBe(angle);
    expect(last.body.mass).toBeCloseTo(
      new PhysicsWorld({ stage: 2 }).addBall({ tier: 12, x: 0, y: -50 }).body.mass,
      9,
    );
    // It lands like any size-1 cat, and stage 2's cats join it.
    const next = world.addBall({ tier: 13, x: 150, y: -300 });
    expect(next.size).toBe(2);
    run(world, 2);
    expect(last.y).toBeCloseTo(-sizeRadius(1), 0);
    expect(next.y).toBeCloseTo(-sizeRadius(2), 0);

    // One stage at a time, and only with cats the next stage can hold.
    expect(() => world.setStage(4)).toThrow(RangeError);
    expect(() => world.setStage(3)).toThrow(RangeError);
    expect(world.stage).toBe(2);
    expect(world.sizeOf(23)).toBe(12);
    expect(world.sizeOf(5)).toBeLessThan(1);
  });

  it('keeps a pile from spilling over the rim', () => {
    const world = new PhysicsWorld();
    const cats = Array.from({ length: 20 }, (_, i) =>
      world.addBall({ tier: 8, x: (i % 2) * 120 - 60, y: -120 - i * 230 }),
    );
    run(world, 6);
    for (const cat of cats) {
      expect(Math.abs(cat.x)).toBeLessThan(300);
      expect(cat.y).toBeLessThan(0);
    }
    expect(Math.min(...cats.map((c) => c.y))).toBeLessThan(world.geometry.rimY);
  });

  it('caps the speed and spin of every cat', () => {
    const world = new PhysicsWorld();
    const cat = world.addBall({ tier: 1, x: 0, y: -400, vx: 9000, vy: -9000 });
    expect(cat.speed).toBeCloseTo(MAX_SPEED_BASE, 6);
    world.step();
    expect(cat.speed).toBeLessThanOrEqual(MAX_SPEED_BASE + 1e-6);

    world.capSpeed(cat, 100);
    expect(cat.speed).toBeCloseTo(100, 6);

    Matter.Body.setAngularVelocity(cat.body, 5); // per 1000/60 ms: 300 rad/s
    world.step();
    expect(Math.abs(cat.body.angularVelocity) * 60).toBeCloseTo(MAX_ANGULAR_SPEED, 6);
  });

  it('records first contact once', () => {
    const world = new PhysicsWorld();
    const a = world.addBall({ tier: 2, x: 0, y: -33 });
    world.step();
    expect(a.landedMs).toBe(PHYSICS_STEP_MS);
    run(world, 1);
    expect(a.landedMs).toBe(PHYSICS_STEP_MS);
    const b = world.addBall({ tier: 2, x: 0, y: -200, landedMs: 5 });
    expect(b.landedMs).toBe(5);
  });

  it('lists same-tier contacts once per pair', () => {
    const world = new PhysicsWorld();
    const a = world.addBall({ tier: 2, x: -32, y: -33 });
    const b = world.addBall({ tier: 2, x: 32, y: -33 });
    const c = world.addBall({ tier: 3, x: 100, y: -40 });
    world.step();
    expect(world.sameTierContacts).toHaveLength(2);
    expect([...world.sameTierContacts].sort((x, y) => x.id - y.id)).toEqual([a, b]);
    expect(world.sameTierContacts).not.toContain(c);
  });

  it('grows a cat into its radius in MERGE_GROW_MS and pushes neighbours gently', () => {
    const world = new PhysicsWorld();
    const neighbour = world.addBall({ tier: 3, x: 90, y: -40 });
    const cat = world.addBall({ tier: 5, x: 0, y: -49, startRadius: sizeRadius(4) });
    expect(cat.radius).toBe(sizeRadius(4));
    expect(cat.growing).toBe(true);
    const massBefore = cat.body.mass;
    const steps = Math.ceil(MERGE_GROW_MS / PHYSICS_STEP_MS);
    let last = cat.radius;
    for (let i = 0; i < steps; i++) {
      world.step();
      expect(cat.radius).toBeGreaterThan(last);
      last = cat.radius;
      expect(neighbour.speed).toBeLessThanOrEqual(GROWTH_NEIGHBOUR_MAX_SPEED_BASE + 1e-6);
    }
    expect(cat.radius).toBe(sizeRadius(5));
    expect(cat.growing).toBe(false);
    expect(cat.body.mass).toBeGreaterThan(massBefore);
    run(world, 2);
    const gap = Math.hypot(neighbour.x - cat.x, neighbour.y - cat.y);
    expect(gap).toBeGreaterThan(sizeRadius(5) + sizeRadius(3) - 1);
  });

  it('adds and removes cats with increasing ids', () => {
    const world = new PhysicsWorld();
    const a = world.addBall({ tier: 1, x: 0, y: -100, golden: true });
    const b = world.addBall({ tier: 2, x: 100, y: -100 });
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(a.golden).toBe(true);
    expect(world.balls).toEqual([a, b]);
    world.removeBall(a);
    world.removeBall(a);
    expect(a.removed).toBe(true);
    expect(world.balls).toEqual([b]);
    expect(world.addBall({ tier: 1, x: 0, y: -100 }).id).toBe(3);
    expect(() => new PhysicsWorld().removeBall(b)).toThrow();
  });

  it('rejects invalid cats', () => {
    const world = new PhysicsWorld();
    expect(() => world.addBall({ tier: 0, x: 0, y: 0 })).toThrow(RangeError);
    expect(() => world.addBall({ tier: 13, x: 0, y: 0 })).toThrow(RangeError);
    expect(() => world.addBall({ tier: 57, x: 0, y: 0 })).toThrow(RangeError);
    expect(() => new PhysicsWorld({ stage: 2 }).addBall({ tier: 11, x: 0, y: 0 })).toThrow(
      RangeError,
    );
    expect(() => world.addBall({ tier: 1, x: Number.NaN, y: 0 })).toThrow(RangeError);
    expect(() => world.addBall({ tier: 1, x: 0, y: 0, startRadius: 0 })).toThrow(RangeError);
  });

  it('hashes the full state', () => {
    const build = () => {
      const world = new PhysicsWorld({ stage: 2 });
      world.addBall({ tier: 15, x: 10, y: -300 });
      world.addBall({ tier: 15, x: -10, y: -500 });
      run(world, 1);
      return world;
    };
    const digest = (world: PhysicsWorld) => {
      const h = new StateHasher();
      world.hashInto(h);
      return h.digest();
    };
    const a = build();
    const b = build();
    expect(digest(a)).toBe(digest(b));
    b.step();
    expect(digest(a)).not.toBe(digest(b));
  });
});
