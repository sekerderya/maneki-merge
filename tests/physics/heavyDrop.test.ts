import type Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import {
  FALL_GUARD_DEPTH,
  HEAVY_DROP_GRAVITY_BONUS,
  HEAVY_DROP_MAX_SPEED,
  HEAVY_DROP_START_SPEED,
  MAX_SPEED_BASE,
  PHYSICS_STEP_MS,
} from '../../src/config/physics';
import { HEAVY_DROP_FALL_TIMES } from '../../src/config/picks';
import { sizeRadius } from '../../src/config/tiers';
import { dropWeights } from '../../src/core/dropQueue';
import { Rng } from '../../src/core/rng';
import type { Ball } from '../../src/physics/balls';
import { clampDropX, dropStartY } from '../../src/physics/geometry';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';
import { fillJar, inJar } from './fixtures';

/** A world with Heavy Drop at `level`, as RunController sets it. */
function heavyWorld(level: number, world = new PhysicsWorld()): PhysicsWorld {
  world.setFallForces({
    windAccel: 0,
    gravityBonus: HEAVY_DROP_GRAVITY_BONUS[level]!,
    maxFallSpeed: level > 0 ? HEAVY_DROP_MAX_SPEED : MAX_SPEED_BASE,
  });
  return world;
}

/** Drops a cat of `size` from the paw as Heavy Drop at `level` does. */
function drop(world: PhysicsWorld, level: number, size: number, x = 0): Ball {
  const r = sizeRadius(size);
  return world.addBall({
    tier: size,
    x: clampDropX(x, r, world.geometry),
    y: dropStartY(r, world.geometry),
    vy: HEAVY_DROP_START_SPEED[level]!,
  });
}

/** The deepest contact `ball` has right now, as matter-js found it this step. */
function contactDepth(world: PhysicsWorld, ball: Ball): number {
  const engine = (world as unknown as { engine: Matter.Engine }).engine;
  let deepest = 0;
  for (const pair of (engine.pairs as unknown as { list: Matter.Pair[] }).list) {
    if (!pair.isActive || (pair.bodyA !== ball.body && pair.bodyB !== ball.body)) continue;
    deepest = Math.max(deepest, pair.collision.depth);
  }
  return deepest;
}

describe('Heavy Drop (GAME_DESIGN §15.9)', () => {
  it.each([1, 2, 3, 4, 5])("at level %i falls to the empty floor in its card's time", (level) => {
    const target = HEAVY_DROP_FALL_TIMES[level]! * 1000;
    for (const size of [1, 4]) {
      const world = heavyWorld(level);
      const ball = drop(world, level, size);
      for (let i = 0; i < 240 && ball.landedMs < 0; i++) world.step();
      // Within a step (a size 4 touches down a step earlier than a size 1).
      expect(ball.landedMs).toBeLessThanOrEqual(target + 1e-6);
      expect(ball.landedMs).toBeGreaterThan(target - 1.5 * PHYSICS_STEP_MS);
    }
  });

  it('may fall faster than the speed limit, but bounces off within it', () => {
    const world = heavyWorld(5);
    const ball = drop(world, 5, 1);
    let fastest = 0;
    while (ball.landedMs < 0) {
      fastest = Math.max(fastest, ball.speed);
      world.step();
    }
    expect(fastest).toBeGreaterThan(MAX_SPEED_BASE);
    expect(fastest).toBeLessThanOrEqual(HEAVY_DROP_MAX_SPEED);
    // From its first contact the normal limit applies again.
    for (let i = 0; i < 60; i++) {
      expect(ball.speed).toBeLessThanOrEqual(MAX_SPEED_BASE + 1e-9);
      world.step();
    }
  });

  it('never starts a contact deeper than half a size-1 radius, on the floor or on a cat', () => {
    for (const onCat of [false, true]) {
      const world = heavyWorld(5);
      if (onCat) world.addBall({ tier: 1, x: 0, y: -sizeRadius(1), landedMs: 0 });
      const ball = drop(world, 5, 1);
      let stepMove = 0;
      while (ball.landedMs < 0) {
        stepMove = ball.speed / 120;
        world.step();
      }
      // It was moving faster than the depth per step: without the guard it would sink deeper.
      expect(stepMove).toBeGreaterThan(FALL_GUARD_DEPTH);
      expect(contactDepth(world, ball)).toBeLessThanOrEqual(FALL_GUARD_DEPTH + 1e-6);
      expect(contactDepth(world, ball)).toBeGreaterThan(0);
    }
  });

  it('announces each heavy landing, once, where the ball first touched', () => {
    const run = new RunController({ seed: 3 });
    const landed: { id: number; level: number }[] = [];
    run.events.on('heavyLanded', (e) => landed.push({ id: e.id, level: e.level }));
    run.setPickLevel('heavyDrop', 5);
    while (!run.canDrop) run.tick();
    run.drop(0);
    const ball = run.balls[0]!;
    for (let i = 0; i < 120; i++) run.tick();
    expect(landed).toEqual([{ id: ball.id, level: 5 }]);
  });

  it('changes nothing at level 0', () => {
    const run = new RunController({ seed: 3 });
    while (!run.canDrop) run.tick();
    run.drop(0);
    const ball = run.balls[0]!;
    while (ball.landedMs < 0) run.tick();
    expect(ball.landedMs).toBeCloseTo(1041.7, 0);
  });

  it('keeps every cat in the jar under 100 heavy drops on a full jar, and launches none', () => {
    // A jar filled to the rim; each dropped cat is taken away 0.25 s after it lands, as a merge
    // would, so the jar stays full. Ordinary drops push no other cat over the rim here (measured
    // over six seeds, TECH_SPEC §5), and neither may the fireballs.
    const world = heavyWorld(5, fillJar(2, 45, 1));
    for (let i = 0; i < 900; i++) world.step();
    const rng = new Rng(3);
    const { halfWidth, rimY } = world.geometry;
    let othersOverRim = 0;
    let ownRebound = 0;
    let deepest = 0;
    let escaped = 0;
    let sunk = 0;
    const tops = new Map<Ball, number>();
    for (let d = 0; d < 100; d++) {
      const size = 1 + rng.weightedIndex(dropWeights(0));
      const ball = drop(world, 5, size, (rng.next() * 2 - 1) * 300);
      let landedAt = -1;
      for (let i = 0; i < 200 && (landedAt < 0 || i < landedAt + 30); i++) {
        for (const b of world.balls) tops.set(b, b.y - b.radius);
        world.step();
        if (landedAt < 0 && ball.landedMs >= 0) {
          landedAt = i;
          deepest = Math.max(deepest, contactDepth(world, ball));
        }
        for (const b of world.balls) {
          if (!inJar(b, halfWidth)) escaped++;
          // Nothing sinks through the floor.
          if (b.y + b.radius > 0.1 * b.radius) sunk++;
          const crossed = tops.get(b)! > rimY && b.y - b.radius <= rimY;
          if (!crossed || b.landedMs < 0) continue;
          if (b === ball) ownRebound = Math.max(ownRebound, -b.vy);
          else othersOverRim = Math.max(othersOverRim, -b.vy);
        }
      }
      world.removeBall(ball);
    }
    expect([escaped, sunk, othersOverRim]).toEqual([0, 0, 0]);
    expect(deepest).toBeLessThanOrEqual(FALL_GUARD_DEPTH + 1e-6);
    // A heavy cat that lands on a pile at the rim may bounce back over it, but only a little:
    // the normal limit applies from its first contact (a few units above the rim).
    expect(ownRebound).toBeLessThan(300);
  }, 60_000);
});
