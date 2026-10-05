import { describe, expect, it } from 'vitest';
import { fillStage5, inJar, maxOverlap, maxWallPenetration, STEPS_PER_SECOND } from './fixtures';

/** "Settled": every cat slower than this fraction of the speed limit (a slow roll at most). */
const SETTLED_SPEED_FRACTION = 0.05;

describe('stability stress test (TECH_SPEC §5)', () => {
  it.each([1, 2, 3])(
    '150 random cats settle in a stage-5 jar within 10 s (seed %i)',
    (seed) => {
      const world = fillStage5(seed);
      const { halfWidth } = world.geometry;
      const limit = world.speedLimit;
      let settledAt = -1;
      let fastest = 0;
      // Simulate 12 s and require the jar to stay settled from (at most) 10 s on.
      for (let step = 1; step <= 12 * STEPS_PER_SECOND; step++) {
        world.step();
        let max = 0;
        for (const cat of world.balls) max = Math.max(max, cat.speed);
        fastest = Math.max(fastest, max);
        if (max < SETTLED_SPEED_FRACTION * limit) {
          if (settledAt < 0) settledAt = step / STEPS_PER_SECOND;
        } else {
          settledAt = -1;
        }
      }
      expect(settledAt).toBeGreaterThan(0);
      expect(settledAt).toBeLessThanOrEqual(10);
      expect(fastest).toBeLessThanOrEqual(limit + 1e-6);

      const cats = world.balls;
      expect(cats).toHaveLength(150);
      expect(cats.every((cat) => inJar(cat, halfWidth))).toBe(true);
      expect(maxOverlap(cats)).toBeLessThan(0.15);
      expect(maxWallPenetration(cats, halfWidth)).toBeLessThan(0.15);
    },
    60_000,
  );
});
