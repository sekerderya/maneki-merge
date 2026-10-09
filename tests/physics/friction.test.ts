import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { CAT_FRICTION, JAR_FRICTION } from '../../src/config/physics';
import { sizeRadius } from '../../src/config/tiers';
import { StateHasher } from '../../src/core/hash';
import type { Ball } from '../../src/physics/balls';
import { collides } from '../../src/physics/circleCollision';
import {
  frictionOf,
  installCoulombFriction,
  matterSolveVelocity,
  solveVelocity,
} from '../../src/physics/friction';
import type { SolverPair } from '../../src/physics/friction';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';

const STEPS_PER_SECOND = 120;
const STEP = 1000 / STEPS_PER_SECOND;

interface VerletBody {
  readonly position: Matter.Vector;
  readonly positionPrev: Matter.Vector;
  readonly angle: number;
  anglePrev: number;
}
const Resolver = Matter.Resolver as unknown as { solveVelocity: unknown };

/** Runs `fn` with matter-js's own velocity solver in place of the Coulomb friction. */
function withMatterSolver<T>(fn: () => T): T {
  Resolver.solveVelocity = matterSolveVelocity;
  try {
    return fn();
  } finally {
    Resolver.solveVelocity = solveVelocity;
  }
}

/** Gives a body a velocity of (vx, vy) world units per step and no spin. */
function move(body: Matter.Body, vx: number, vy: number): void {
  const verlet = body as unknown as VerletBody;
  verlet.positionPrev.x = verlet.position.x - vx;
  verlet.positionPrev.y = verlet.position.y - vy;
  verlet.anglePrev = verlet.angle;
}

/** How fast A's surface slips past B's at their contact, per step, along the tangent. */
function slip(pair: SolverPair): number {
  const { parentA: a, parentB: b, tangent } = pair.collision;
  const p = pair.contacts[0]!.vertex;
  const va = a as unknown as VerletBody;
  const vb = b as unknown as VerletBody;
  const wa = va.angle - va.anglePrev;
  const wb = vb.angle - vb.anglePrev;
  const dx =
    va.position.x -
    va.positionPrev.x -
    (p.y - a.position.y) * wa -
    (vb.position.x - vb.positionPrev.x - (p.y - b.position.y) * wb);
  const dy =
    va.position.y -
    va.positionPrev.y +
    (p.x - a.position.x) * wa -
    (vb.position.y - vb.positionPrev.y + (p.x - b.position.x) * wb);
  return dx * tangent.x + dy * tangent.y;
}

/**
 * Two size-2 cats, A resting on B (overlapping by one unit), as a matter-js pair whose contact
 * has already gathered `load` of normal impulse this step. A moves sideways at `speed` per step,
 * B at `approach` per step up into A.
 */
function stacked(load: number, speed: number, approach = 0) {
  const world = new PhysicsWorld();
  const r = sizeRadius(2);
  const a = world.addBall({ tier: 2, x: 0, y: -200 });
  const b = world.addBall({ tier: 2, x: 0, y: -200 + 2 * r - 1 });
  move(a.body, speed, 0);
  move(b.body, 0, -approach);
  const pair = Matter.Pair.create(collides(a.body, b.body)!, 0) as unknown as SolverPair;
  pair.contacts[0]!.normalImpulse = -load;
  return pair;
}

/**
 * Drops a cat of `small` on the shoulder of a resting cat of `big` and returns how much of their
 * sliding past each other was rolling (1: rolling only, 0: sliding only), over 2.5 s.
 */
function rollShare(big: number, small: number): number {
  const world = new PhysicsWorld();
  const rb = sizeRadius(big);
  const rs = sizeRadius(small);
  const base = world.addBall({ tier: big, x: 0, y: -rb });
  for (let i = 0; i < STEPS_PER_SECOND; i++) world.step();
  const top = world.addBall({ tier: small, x: 0.35 * (rb + rs), y: -2 * rb - rs - 40 });
  let sliding = 0;
  let moving = 0;
  for (let i = 0; i < 2.5 * STEPS_PER_SECOND; i++) {
    world.step();
    for (const pair of pairsOf(world)) {
      const cats = [pair.collision.parentA, pair.collision.parentB].map(
        (body) => body.plugin.circle as Ball,
      );
      if (!pair.isActive || !cats.includes(base) || !cats.includes(top)) continue;
      const { parentA: a, parentB: b, tangent } = pair.collision;
      const along = Math.abs(
        (a.velocity.x - b.velocity.x) * tangent.x + (a.velocity.y - b.velocity.y) * tangent.y,
      );
      // Velocities are per base tick (1/60 s): skip contacts slower than 30 u/s.
      if (along < 0.5) continue;
      sliding += Math.abs(slip(pair)) * 2;
      moving += along;
    }
  }
  expect(moving).toBeGreaterThan(0);
  return 1 - sliding / moving;
}

/** The world's matter-js pairs. */
function pairsOf(world: PhysicsWorld): readonly SolverPair[] {
  return (world as unknown as { engine: { pairs: { list: SolverPair[] } } }).engine.pairs.list;
}

function hash(world: PhysicsWorld): string {
  const hasher = new StateHasher();
  world.hashInto(hasher);
  return hasher.digest();
}

describe('Coulomb friction (TECH_SPEC §5)', () => {
  it('is installed once, by the world', () => {
    new PhysicsWorld();
    installCoulombFriction();
    expect(Matter.Resolver.solveVelocity).toBe(solveVelocity);
  });

  it('uses CAT_FRICTION between two cats and JAR_FRICTION against the jar', () => {
    const world = new PhysicsWorld();
    world.addBall({ tier: 3, x: 0, y: -sizeRadius(3) });
    world.addBall({ tier: 2, x: 0, y: -2 * sizeRadius(3) - sizeRadius(2) });
    for (let i = 0; i < STEPS_PER_SECOND; i++) world.step();
    const pairs = pairsOf(world).filter((pair) => pair.isActive);
    expect(pairs.map(frictionOf).sort()).toEqual([JAR_FRICTION, CAT_FRICTION].sort());
  });

  it('stops a slip at once when the load can hold it, sizing the impulse with mass and inertia', () => {
    const pair = stacked(1, 0.01);
    expect(slip(pair)).toBeCloseTo(0.01, 12);
    solveVelocity([pair], STEP);
    expect(slip(pair)).toBeCloseTo(0, 12);
    expect(Math.abs(pair.contacts[0]!.tangentImpulse)).toBeLessThan(CAT_FRICTION);
  });

  it('holds back at most CAT_FRICTION times the load', () => {
    const pair = stacked(0.001, 1);
    solveVelocity([pair], STEP);
    expect(Math.abs(pair.contacts[0]!.tangentImpulse)).toBeCloseTo(CAT_FRICTION * 0.001, 12);
    expect(slip(pair)).toBeGreaterThan(0.5);
    expect(slip(pair)).toBeLessThan(1);
  });

  it('gives an impact no friction, so a landing cat shoves as before', () => {
    // B comes up at 2 units per step, 240 u/s: faster than matter-js's resting threshold.
    const pair = stacked(1, 0.01, 2);
    solveVelocity([pair], STEP);
    expect(pair.contacts[0]!.normalImpulse).toBe(0);
    expect(Math.abs(pair.contacts[0]!.tangentImpulse)).toBe(0);
    expect(slip(pair)).toBeCloseTo(0.01, 12);

    // A size-3 cat dropped on a size-5's shoulder pushes it well aside (197 units since v0.23.7,
    // 188 before; 10 if the impact carried friction).
    const world = new PhysicsWorld();
    const big = world.addBall({ tier: 5, x: 0, y: -sizeRadius(5) });
    for (let i = 0; i < 0.5 * STEPS_PER_SECOND; i++) world.step();
    world.addBall({ tier: 3, x: 0.6 * (sizeRadius(5) + sizeRadius(3)), y: -500 });
    for (let i = 0; i < 3 * STEPS_PER_SECOND; i++) world.step();
    expect(Math.abs(big.x)).toBeGreaterThan(150);
  });

  it('rolls a cat over another instead of letting it slide like on ice', () => {
    // matter-js's own friction lets a cat slide down another's shoulder about a quarter of the way.
    expect(rollShare(3, 3)).toBeGreaterThan(0.95);
    expect(rollShare(5, 2)).toBeGreaterThan(0.95);
    expect(withMatterSolver(() => rollShare(3, 3))).toBeLessThan(0.8);
  });

  it("keeps matter-js's normal impulses: a straight stack matches it exactly", () => {
    // Nothing slips in a stack dropped straight down, so friction never acts.
    const setup = (): PhysicsWorld => {
      const world = new PhysicsWorld();
      [4, 2, 3].forEach((tier, i) => world.addBall({ tier, x: 0, y: -100 - 250 * i }));
      return world;
    };
    const ours = setup();
    const theirs = setup();
    for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) {
      ours.step();
      withMatterSolver(() => theirs.step());
      expect(hash(ours)).toBe(hash(theirs));
    }
    expect(pairsOf(ours).filter((pair) => pair.isActive)).toHaveLength(3);
  });

  it('rolls a pushed cat along the floor within a tenth of a second, as a disc does', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    const cat = world.addBall({ tier: 2, x: -100, y: -r, vx: 300, landedMs: 0 });
    for (let i = 0; i < 0.12 * STEPS_PER_SECOND; i++) world.step();
    expect(Math.abs(cat.spin * r - cat.vx)).toBeLessThan(0.05 * cat.speed);
    // A sliding disc that starts to roll keeps two thirds of its speed (less a little air friction).
    expect(cat.speed).toBeGreaterThan(180);
    expect(cat.speed).toBeLessThan(200);
  });

  it('keeps cats resting on the floor and in a corner still', () => {
    const world = new PhysicsWorld();
    const g = world.geometry;
    [1, 2, 3, 4].forEach((tier, i) => {
      world.addBall({ tier, x: -230 + i * 150, y: -sizeRadius(tier) });
    });
    world.addBall({ tier: 2, x: g.halfWidth - sizeRadius(2), y: -200 });
    for (let i = 0; i < 3 * STEPS_PER_SECOND; i++) world.step();
    let speed = 0;
    let spin = 0;
    for (let i = 0; i < 3 * STEPS_PER_SECOND; i++) {
      world.step();
      for (const cat of world.balls) {
        speed = Math.max(speed, cat.speed);
        spin = Math.max(spin, Math.abs(cat.spin));
      }
    }
    // No shiver: under 20 u/s and half a radian per second, at most.
    expect(speed).toBeLessThan(20);
    expect(spin).toBeLessThan(0.5);
  });
});
