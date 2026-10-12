import { describe, expect, it } from 'vitest';
import { drawnAngle, drawnX, drawnY } from '../../src/game/drawnPose';
import type { BallView } from '../../src/physics/balls';

const ball = {
  fromX: 10,
  fromY: -400,
  fromAngle: 0.5,
  x: 14,
  y: -380,
  angle: 0.7,
} as unknown as BallView;

describe('drawn poses (TECH_SPEC §5)', () => {
  it("draws a ball the frame's share of the way through the latest tick", () => {
    expect([drawnX(ball, 0), drawnY(ball, 0), drawnAngle(ball, 0)]).toEqual([10, -400, 0.5]);
    expect(drawnX(ball, 0.25)).toBeCloseTo(11, 9);
    expect(drawnY(ball, 0.25)).toBeCloseTo(-395, 9);
    expect(drawnAngle(ball, 0.25)).toBeCloseTo(0.55, 9);
    // Alpha 1 (?interp=0) is where the latest tick left it.
    expect([drawnX(ball, 1), drawnY(ball, 1), drawnAngle(ball, 1)]).toEqual([14, -380, 0.7]);
  });
});
