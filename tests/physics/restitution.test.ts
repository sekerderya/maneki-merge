import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import {
  installRestitutionOverride,
  restitutionOverride,
  updatePair,
} from '../../src/physics/restitution';

/** Two overlapping boxes and their collision, as matter-js's own SAT finds it. */
function overlapping(
  a: Matter.IChamferableBodyDefinition,
  b: Matter.IChamferableBodyDefinition,
): Matter.Collision {
  const bodyA = Matter.Bodies.rectangle(0, 0, 40, 40, a);
  const bodyB = Matter.Bodies.rectangle(30, 0, 40, 40, b);
  return Matter.Collision.collides(bodyA, bodyB)!;
}

describe('restitution override (TECH_SPEC §5)', () => {
  it('keeps matter-js rule (the larger restitution) for ordinary bodies', () => {
    installRestitutionOverride();
    const pair = Matter.Pair.create(overlapping({ restitution: 0.25 }, { restitution: 0.6 }), 0);
    expect(pair.restitution).toBe(0.6);
  });

  it('lets a body force its own restitution on its pairs, on every update', () => {
    installRestitutionOverride();
    const dead = { restitution: 0.8, plugin: { restitution: 0 } };
    const collision = overlapping({ restitution: 0.25 }, dead);
    expect(restitutionOverride(collision.parentB)).toBe(0);
    expect(restitutionOverride(collision.parentA)).toBeUndefined();
    const pair = Matter.Pair.create(collision, 0);
    expect(pair.restitution).toBe(0);
    // matter-js sets the restitution again each step the pair stays active.
    pair.restitution = 0.5;
    updatePair(pair, collision, 1);
    expect(pair.restitution).toBe(0);
    // Either side of the pair can carry it.
    expect(Matter.Pair.create(overlapping(dead, { restitution: 0.9 }), 0).restitution).toBe(0);
  });

  it('installs once', () => {
    installRestitutionOverride();
    installRestitutionOverride();
    expect(Matter.Pair.update).toBe(updatePair);
  });
});
