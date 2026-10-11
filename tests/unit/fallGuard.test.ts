import { describe, expect, it } from 'vitest';
import { fallPullback } from '../../src/physics/fallGuard';

const jar = { halfWidth: 300 };

describe('the heavy drop guard (TECH_SPEC §5)', () => {
  it('leaves a move alone that is short enough, or meets nothing', () => {
    const ball = { x: 0, y: -500, radius: 41 };
    expect(fallPullback(ball, 0, 20, [], jar, 20.5)).toBe(0);
    expect(fallPullback(ball, 0, 40, [], jar, 20.5)).toBe(0);
    // A cat beside its path is never reached.
    expect(fallPullback(ball, 0, 40, [{ x: 100, y: -440, radius: 41 }], jar, 20.5)).toBe(0);
  });

  it('pulls a ball back so it sinks at most the depth into a cat below it', () => {
    const ball = { x: 0, y: -500, radius: 41 };
    // The cat's top is 30 units under the ball's bottom: a 40-unit move sinks 10 (fine), a 60-unit
    // one 30 (pulled back 9.5).
    const cat = { x: 0, y: -500 + 41 + 30 + 41, radius: 41 };
    expect(fallPullback(ball, 0, 40, [cat], jar, 20.5)).toBe(0);
    expect(fallPullback(ball, 0, 60, [cat], jar, 20.5)).toBeCloseTo(9.5, 9);
    // The ball itself is skipped.
    expect(fallPullback(ball, 0, 60, [ball], jar, 20.5)).toBe(0);
  });

  it('meets a cat on a slant where the circles first touch', () => {
    const ball = { x: 0, y: -500, radius: 40 };
    const cat = { x: 60, y: -380, radius: 40 };
    // They touch when the centres are 80 apart: 60² + (120 − s)² = 80² → s = 120 − √2800.
    const s = 120 - Math.sqrt(2800);
    expect(fallPullback(ball, 0, 100, [cat], jar, 10)).toBeCloseTo(100 - s - 10, 9);
  });

  it('stops at the floor and the walls too', () => {
    // 10 above the floor, moving 50 down: 40 past it.
    expect(fallPullback({ x: 0, y: -51, radius: 41 }, 0, 50, [], jar, 20.5)).toBeCloseTo(19.5, 9);
    // Moving sideways into either wall.
    expect(fallPullback({ x: 249, y: -500, radius: 41 }, 40, 0, [], jar, 20.5)).toBeCloseTo(9.5, 9);
    expect(fallPullback({ x: -249, y: -500, radius: 41 }, -40, 0, [], jar, 20.5)).toBeCloseTo(
      9.5,
      9,
    );
  });

  it('pulls a ball already overlapping a cat back by all but the depth, unless it moves away', () => {
    const ball = { x: 0, y: -500, radius: 41 };
    const cat = { x: 0, y: -430, radius: 41 };
    expect(fallPullback(ball, 0, 40, [cat], jar, 20.5)).toBeCloseTo(19.5, 9);
    expect(fallPullback(ball, 0, -40, [cat], jar, 20.5)).toBe(0);
  });
});
