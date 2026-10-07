import Matter from 'matter-js';
import { describe, expect, it, vi } from 'vitest';
import {
  CORNER_CUSHION_KEEP,
  CORNER_CUSHION_MS,
  GRAVITY_BASE,
  GROWTH_NEIGHBOUR_MAX_SPEED_BASE,
  MAX_ANGULAR_SPEED,
  MAX_SPEED_BASE,
  PHYSICS_MAX_SUBSTEPS,
  PHYSICS_STEP_MS,
  stepsFor,
} from '../../src/config/physics';
import { sizeRadius, STAGE_ZOOM } from '../../src/config/tiers';
import { MERGE_GROW_MS } from '../../src/config/timings';
import { StateHasher } from '../../src/core/hash';
import { floorRestY } from '../../src/physics/geometry';
import {
  cushionFactors,
  CUSHION_FACTORS,
  FixedStepper,
  PhysicsWorld,
} from '../../src/physics/PhysicsWorld';

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

describe('the first-landing cushion (TECH_SPEC §5)', () => {
  it('brakes in and out over CORNER_CUSHION_MS, leaving about CORNER_CUSHION_KEEP', () => {
    expect(CUSHION_FACTORS).toHaveLength(stepsFor(CORNER_CUSHION_MS));
    const kept = CUSHION_FACTORS.reduce((product, f) => product * f, 1);
    expect(kept).toBeGreaterThan(0.95 * CORNER_CUSHION_KEEP);
    expect(kept).toBeLessThan(CORNER_CUSHION_KEEP);
    // No jolt: it starts and ends at almost nothing, peaks in the middle, never takes 5% a step.
    const n = CUSHION_FACTORS.length;
    expect(CUSHION_FACTORS[0]).toBeGreaterThan(0.999);
    expect(CUSHION_FACTORS[n - 1]).toBeGreaterThan(0.999);
    expect(Math.min(...CUSHION_FACTORS)).toBeGreaterThan(0.95);
    for (let i = 0; i < n; i++) {
      expect(CUSHION_FACTORS[i]).toBeCloseTo(CUSHION_FACTORS[n - 1 - i]!, 12);
      if (i > 0 && i < n / 2) expect(CUSHION_FACTORS[i]!).toBeLessThan(CUSHION_FACTORS[i - 1]!);
    }
    expect(cushionFactors(4, 1)).toEqual([1, 1, 1, 1]);
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

  it.each([-1, 1])(
    'cushions a cat dropped by a wall on the curve, without a jolt, and lets it roll to rest (side %i)',
    (side) => {
      const world = new PhysicsWorld();
      const g = world.geometry;
      const r = sizeRadius(2);
      const cat = world.addBall({ tier: 2, x: side * (g.halfWidth - r), y: g.dropY });
      let fall = 0;
      while (cat.landedMs < 0) {
        fall = cat.speed;
        world.step();
      }
      // The cushion starts gently: the landing keeps nearly all of the fall's speed.
      expect(fall).toBeGreaterThan(1000);
      expect(cat.speed).toBeGreaterThan(0.99 * fall);
      expect(cat.cushionStep).toBe(1);
      // No step takes more than 5% of the fall's speed (v0.19.3's dead landing took all of it at
      // once), and the cat never swings across the middle of the jar.
      let speed = cat.speed;
      for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) {
        world.step();
        expect(speed - cat.speed).toBeLessThan(0.05 * fall);
        expect(side * cat.x).toBeGreaterThan(-r);
        speed = cat.speed;
      }
      // The cushion is over and the floor's rolling resistance has stopped it.
      expect(cat.cushionStep).toBe(-1);
      expect(cat.speed).toBeLessThan(5);
      expect(cat.y).toBeCloseTo(floorRestY(cat.x, r, g), 0);
    },
  );

  it('cushions only a dropped cat whose first touch is a curve, and no cat', () => {
    const world = new PhysicsWorld();
    const g = world.geometry;
    // Rolling from the flat floor onto a curve: no cushion.
    const foot = g.halfWidth - g.cornerRadius;
    const roller = world.addBall({ tier: 2, x: foot - 40, y: -sizeRadius(2), vx: 500 });
    world.step();
    expect(roller.landedMs).toBe(PHYSICS_STEP_MS);
    while (roller.x < foot + 10) {
      world.step();
      expect(roller.cushionStep).toBe(-1);
    }
    // A cat that lands on a curve and on a cat at once is left to the physics.
    const pair = new PhysicsWorld();
    const x = foot + 60;
    const lower = pair.addBall({ tier: 1, x, y: floorRestY(x, sizeRadius(1), g) - 2, vy: 300 });
    pair.addBall({ tier: 2, x, y: lower.y - sizeRadius(1) - sizeRadius(2) + 1, vy: 300 });
    pair.step();
    expect(lower.landedMs).toBe(PHYSICS_STEP_MS);
    expect(lower.cushionStep).toBe(-1);
    expect(lower.speed).toBeGreaterThan(0);
  });

  it('rolls a lone cat on the floor and slows it evenly, like a ball on a rug', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    const cat = world.addBall({ tier: 2, x: -100, y: -r, vx: 300, landedMs: 0 });
    // A pushed cat rolls at once: its rim turns as fast as it moves (clockwise to the right).
    world.step();
    expect(cat.spin * r).toBeCloseTo(cat.vx, 6);
    expect(cat.speed).toBeGreaterThan(280);
    // It loses FLOOR_ROLLING_RESISTANCE (800 u/s²: 6.7 u/s a step, plus a little air friction)
    // on every step until it stops.
    let speed = cat.speed;
    let steps = 1;
    while (cat.speed > 0 && steps < STEPS_PER_SECOND) {
      world.step();
      steps++;
      expect(cat.spin * r).toBeCloseTo(cat.vx, 6);
      if (cat.speed > 0) expect(speed - cat.speed).toBeGreaterThan(6.6);
      expect(speed - cat.speed).toBeLessThan(8.5);
      speed = cat.speed;
    }
    expect(cat.spin).toBe(0);
    // 300 u/s at about 800 u/s² stops in about 0.37 s, about 55 units on.
    expect(steps / STEPS_PER_SECOND).toBeLessThan(0.4);
    expect(cat.x + 100).toBeGreaterThan(45);
    expect(cat.x + 100).toBeLessThan(60);
  });

  it('rolls a cat dropped by a wall down the curve and along the floor (v0.19.5)', () => {
    const world = new PhysicsWorld();
    const g = world.geometry;
    const r = sizeRadius(2);
    const cat = world.addBall({ tier: 2, x: g.halfWidth - r, y: g.dropY });
    const start = cat.angle;
    let path = 0;
    let [x, y] = [cat.x, cat.y];
    while (cat.landedMs < 0) {
      world.step();
      [x, y] = [cat.x, cat.y];
    }
    for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) {
      world.step();
      path += Math.hypot(cat.x - x, cat.y - y);
      [x, y] = [cat.x, cat.y];
      // Rolling to the left turns it anticlockwise, as fast as it goes (up to the spin limit).
      if (cat.speed > 1 && cat.speed < 0.9 * MAX_ANGULAR_SPEED * r) {
        expect(-cat.spin * r).toBeGreaterThan(0.95 * cat.speed);
      }
    }
    // Over 250+ units it turns about once (v0.19.4: an eighth of a turn, it slid).
    expect(path).toBeGreaterThan(250);
    const turns = (start - cat.angle) / (2 * Math.PI);
    expect(turns).toBeGreaterThan((0.85 * path) / (2 * Math.PI * r));
    expect(cat.speed).toBe(0);
  });

  it('keeps the spin of a cat that turns faster than it rolls, slowing it by the rug', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(3);
    // A merged cat is born at rest and turning (MERGE_SPIN_RIM_SPEED).
    const cat = world.addBall({ tier: 3, x: 0, y: -r, spin: 4, landedMs: 0 });
    world.step();
    expect(cat.spin).toBeGreaterThan(3.5);
    expect(cat.spin).toBeLessThan(4);
  });

  it('keeps cats spawned across the floor (as in the Lucky Save e2e test) from merging', () => {
    const world = new PhysicsWorld();
    // Neighbours differ in tier: the outer cats land on the curves and roll inwards.
    const cats = [-200, -70, 70, 200].map((x, i) =>
      world.addBall({ tier: 1 + (i % 2), x, y: world.geometry.dropY }),
    );
    for (let i = 0; i < 4 * STEPS_PER_SECOND; i++) {
      world.step();
      expect(world.sameTierContacts).toHaveLength(0);
    }
    expect(cats.map((cat) => Math.sign(cat.x))).toEqual([-1, -1, 1, 1]);
  });

  it('keeps every cat of a pile inside the curved corners', () => {
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
      expect(cat.y).toBeLessThanOrEqual(floorRestY(cat.x, cat.radius, g) + 0.1 * cat.radius);
    }
  });

  it.each([1, 2, 3, 4])(
    'drops a size-%i cat from the dropper to the empty floor in 1 s, without a bounce',
    (tier) => {
      const world = new PhysicsWorld();
      const cat = world.addBall({ tier, x: 0, y: world.geometry.dropY });
      let highest = Infinity;
      for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) {
        world.step();
        if (cat.landedMs >= 0) highest = Math.min(highest, cat.y);
      }
      // First contact on the step that reaches the floor: 1 s, give or take a step.
      expect(Math.abs(cat.landedMs - 1000)).toBeLessThanOrEqual(PHYSICS_STEP_MS + 1e-9);
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

  it('rescales the world into the next stage: the last cat becomes the first', () => {
    const world = new PhysicsWorld();
    expect(world.gravity).toBe(GRAVITY_BASE);
    expect(world.speedLimit).toBeCloseTo(MAX_SPEED_BASE, 9);
    const half = world.wallInnerX;

    const last = world.addBall({ tier: 10, x: 20, y: -400, vx: 90, vy: 180 });
    expect(last.size).toBe(10);
    expect(last.radius).toBe(163);
    const angle = last.angle;
    const [vx, vy] = [last.vx, last.vy];
    world.setStage(2);
    expect(world.stage).toBe(2);
    // Same jar, same gravity, same speed limit: only the cat changed.
    expect(world.wallInnerX).toBe(half);
    expect(world.gravity).toBe(GRAVITY_BASE);
    expect(world.speedLimit).toBeCloseTo(MAX_SPEED_BASE, 9);
    expect(last.tier).toBe(10);
    expect(last.size).toBe(1);
    expect(last.radius).toBeCloseTo(sizeRadius(1), 9);
    expect(last.targetRadius).toBe(sizeRadius(1));
    expect(last.x).toBeCloseTo(20 / STAGE_ZOOM, 9);
    expect(last.y).toBeCloseTo(-400 / STAGE_ZOOM, 9);
    expect(last.vx).toBeCloseTo(vx / STAGE_ZOOM, 6);
    expect(last.vy).toBeCloseTo(vy / STAGE_ZOOM, 6);
    expect(last.angle).toBe(angle);
    expect(last.body.mass).toBeCloseTo(
      new PhysicsWorld({ stage: 2 }).addBall({ tier: 10, x: 0, y: -50 }).body.mass,
      9,
    );
    // It lands like any size-1 cat, and stage 2's cats join it.
    const next = world.addBall({ tier: 11, x: 150, y: -300 });
    expect(next.size).toBe(2);
    run(world, 2);
    expect(last.y).toBeCloseTo(-sizeRadius(1), 0);
    expect(next.y).toBeCloseTo(-sizeRadius(2), 0);

    // One stage at a time, and only with cats the next stage can hold.
    expect(() => world.setStage(4)).toThrow(RangeError);
    expect(() => world.setStage(3)).toThrow(RangeError);
    expect(world.stage).toBe(2);
    expect(world.sizeOf(19)).toBe(10);
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
