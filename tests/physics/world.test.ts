import Matter from 'matter-js';
import { describe, expect, it, vi } from 'vitest';
import {
  GRAVITY_BASE,
  GROWTH_NEIGHBOUR_MAX_SPEED_BASE,
  MAX_ANGULAR_SPEED,
  MAX_SPEED_BASE,
  PHYSICS_MAX_SUBSTEPS,
  PHYSICS_STEP_MS,
} from '../../src/config/physics';
import { sizeRadius } from '../../src/config/tiers';
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
  });

  it.each([-1, 1])('lands a cat dropped by a wall dead in the square corner (side %i)', (side) => {
    const world = new PhysicsWorld();
    const g = world.geometry;
    const r = sizeRadius(2);
    const x = side * (g.halfWidth - r);
    const cat = world.addBall({ tier: 2, x, y: g.dropY });
    run(world, 2);
    // No curve swings it across the jar: it stays in the corner, against the wall.
    expect(cat.x).toBeCloseTo(x, 0);
    expect(cat.y).toBeCloseTo(-r, 0);
    expect(cat.speed).toBeLessThan(1);
  });

  it('lets a pushed lone cat roll on, slowed only by air friction (v0.23.6)', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    const cat = world.addBall({ tier: 2, x: -100, y: -r, vx: 300, landedMs: 0 });
    run(world, 1);
    // No rug: a second later it still rolls on at over a third of its speed, turning as fast as
    // it moves (the floor's friction), and it has gone a quarter of the jar's width.
    expect(cat.speed).toBeGreaterThan(100);
    expect(cat.speed).toBeLessThan(150);
    expect(cat.x + 100).toBeGreaterThan(140);
    expect(Math.abs(cat.spin * r - cat.vx)).toBeLessThan(0.1 * cat.speed);
  });

  it('keeps cats spawned across the floor (as in the Lucky Save e2e test) from merging', () => {
    const world = new PhysicsWorld();
    // Neighbours differ in tier, so cats that roll together don't merge.
    const cats = [-200, -70, 70, 200].map((x, i) =>
      world.addBall({ tier: 1 + (i % 2), x, y: world.geometry.dropY }),
    );
    for (let i = 0; i < 4 * STEPS_PER_SECOND; i++) {
      world.step();
      expect(world.mergeContacts).toHaveLength(0);
    }
    expect(cats.map((cat) => Math.sign(cat.x))).toEqual([-1, -1, 1, 1]);
  });

  it('keeps every cat of a pile inside the jar, corners included', () => {
    const world = new PhysicsWorld();
    const g = world.geometry;
    for (let i = 0; i < 40; i++) {
      const tier = 1 + (i % 4);
      const side = i % 2 === 0 ? -1 : 1;
      world.addBall({
        tier,
        x: side * (g.halfWidth - sizeRadius(tier) - (i % 5) * 9),
        y: -500 - i * 90,
      });
    }
    run(world, 8);
    for (const cat of world.balls) {
      expect(cat.y).toBeLessThanOrEqual(-cat.radius + 0.1 * cat.radius);
      expect(Math.abs(cat.x)).toBeLessThanOrEqual(g.halfWidth - cat.radius + 0.1 * cat.radius);
    }
  });

  it.each([1, 2, 3, 4])(
    'drops a size-%i cat from the dropper to the empty floor in about 1 s, without a bounce',
    (tier) => {
      const world = new PhysicsWorld();
      const cat = world.addBall({ tier, x: 0, y: world.geometry.dropY });
      let highest = Infinity;
      for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) {
        world.step();
        if (cat.landedMs >= 0) highest = Math.min(highest, cat.y);
      }
      // First contact on the step that reaches the floor: 1.025 s (size 4) to 1.042 s (size 1)
      // since v0.21.1 raised the dropper (1 s before), give or take a step.
      expect(cat.landedMs).toBeGreaterThanOrEqual(1025 - PHYSICS_STEP_MS - 1e-9);
      expect(cat.landedMs).toBeLessThanOrEqual(1042 + PHYSICS_STEP_MS + 1e-9);
      // The floor never bounces: after landing the cat only sinks into place.
      expect(highest).toBeGreaterThan(-sizeRadius(tier) - 0.5);
    },
  );

  it('still lets cats bounce off each other', () => {
    const world = new PhysicsWorld();
    // Head-on, in the air: restitution 0.25 sends them apart at a quarter of the closing speed.
    const left = world.addBall({ tier: 2, x: -100, y: -600, vx: 500 });
    const right = world.addBall({ tier: 2, x: 100, y: -600, vx: -500 });
    run(world, 0.25);
    expect(right.vx - left.vx).toBeGreaterThan(0.2 * 1000);
    expect(right.vx - left.vx).toBeLessThan(0.3 * 1000);
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

  it('moves into the next stage with an empty jar, the same jar as before', () => {
    const world = new PhysicsWorld();
    expect(world.gravity).toBe(GRAVITY_BASE);
    expect(world.speedLimit).toBeCloseTo(MAX_SPEED_BASE, 9);
    const half = world.wallInnerX;

    const last = world.addBall({ tier: 9, x: 20, y: -400 });
    expect(last.size).toBe(9);
    expect(last.radius).toBe(165);
    // The jar must be empty: the run pops every ball first.
    expect(() => world.setStage(2)).toThrow(RangeError);
    world.removeBall(last);
    world.setStage(2);
    expect(world.stage).toBe(2);
    // Same jar, same gravity, same speed limit.
    expect(world.wallInnerX).toBe(half);
    expect(world.gravity).toBe(GRAVITY_BASE);
    expect(world.speedLimit).toBeCloseTo(MAX_SPEED_BASE, 9);
    // Stage 2's cats start at tier 10, size 1.
    const first = world.addBall({ tier: 10, x: -150, y: -300 });
    const next = world.addBall({ tier: 11, x: 150, y: -300 });
    expect([first.size, next.size]).toEqual([1, 2]);
    run(world, 2);
    expect(first.y).toBeCloseTo(-sizeRadius(1), 0);
    expect(next.y).toBeCloseTo(-sizeRadius(2), 0);

    // One stage at a time.
    world.removeBall(first);
    world.removeBall(next);
    expect(() => world.setStage(4)).toThrow(RangeError);
    expect(world.stage).toBe(2);
    expect(world.sizeOf(18)).toBe(9);
    expect(world.sizeOf(9)).toBeLessThan(1);
    expect(world.sizeOf(19)).toBeGreaterThan(9);
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
    expect(world.mergeContacts).toHaveLength(2);
    expect([...world.mergeContacts].sort((x, y) => x.id - y.id)).toEqual([a, b]);
    expect(world.mergeContacts).not.toContain(c);
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
    const a = world.addBall({ tier: 1, x: 0, y: -100 });
    const b = world.addBall({ tier: 2, x: 100, y: -100 });
    expect([a.id, b.id]).toEqual([1, 2]);
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
    expect(() => world.addBall({ tier: 11, x: 0, y: 0 })).toThrow(RangeError);
    expect(() => world.addBall({ tier: 47, x: 0, y: 0 })).toThrow(RangeError);
    expect(() => new PhysicsWorld({ stage: 2 }).addBall({ tier: 9, x: 0, y: 0 })).toThrow(
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
