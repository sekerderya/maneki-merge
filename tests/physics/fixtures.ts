/** Shared setups for the headless physics tests. */
import { catRadius, stageInfo } from '../../src/config/stages';
import { dropWeights } from '../../src/core/dropQueue';
import { Rng } from '../../src/core/rng';
import { defaultUpgradeLevels } from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';
import type { BallView } from '../../src/physics/balls';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';

export const STEPS_PER_SECOND = 120;

export function upgrades(levels: Partial<UpgradeLevels>): UpgradeLevels {
  return { ...defaultUpgradeLevels(), ...levels };
}

/**
 * TECH_SPEC §5 stress setup: `count` cats rolled from a stage's drop pool with its weights,
 * spread over a grid that starts at the floor and reaches about four jar heights, so they all
 * fall at once. 150 of them overfill the jar: the pile rises past the rim.
 */
export function fillJar(seed: number, count = 150, stage = 5): PhysicsWorld {
  const world = new PhysicsWorld({ stage });
  const rng = new Rng(seed);
  const pool = stageInfo(stage).dropPool;
  const weights = dropWeights(0);
  const { halfWidth } = world.geometry;
  const cell = 2 * catRadius(pool[pool.length - 1]!, stage) + 6;
  const perRow = Math.floor((2 * halfWidth) / cell);
  for (let i = 0; i < count; i++) {
    const tier = pool[rng.weightedIndex(weights)]!;
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = -halfWidth + cell / 2 + col * cell + (rng.next() - 0.5) * 10;
    world.addBall({ tier, x, y: -cell / 2 - row * cell });
  }
  return world;
}

/** The largest overlap between two cats, as a fraction of the smaller radius. */
export function maxOverlap(cats: readonly BallView[]): number {
  let worst = 0;
  for (let i = 0; i < cats.length; i++) {
    const a = cats[i]!;
    for (let j = i + 1; j < cats.length; j++) {
      const b = cats[j]!;
      const overlap = a.radius + b.radius - Math.hypot(a.x - b.x, a.y - b.y);
      worst = Math.max(worst, overlap / Math.min(a.radius, b.radius));
    }
  }
  return worst;
}

/** How deep any cat sits in a wall or the floor, as a fraction of its radius. */
export function maxWallPenetration(cats: readonly BallView[], halfWidth: number): number {
  let worst = 0;
  for (const cat of cats) {
    const side = Math.abs(cat.x) + cat.radius - halfWidth;
    const floor = cat.y + cat.radius;
    worst = Math.max(worst, side / cat.radius, floor / cat.radius);
  }
  return worst;
}

/** True when the cat's centre is still inside the jar (between the walls, above the floor). */
export function inJar(cat: BallView, halfWidth: number): boolean {
  return (
    Number.isFinite(cat.x) && Number.isFinite(cat.y) && Math.abs(cat.x) < halfWidth && cat.y < 0
  );
}
