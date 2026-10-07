import { describe, expect, it } from 'vitest';
import { sizeRadius } from '../../src/config/tiers';
import { landingY } from '../../src/game/aim';
import { floorRestY, jarGeometry } from '../../src/physics/geometry';
import { RunController } from '../../src/run/RunController';

describe('aim guide landing point', () => {
  const from = -1000;

  it('lands on the floor when nothing is below', () => {
    expect(landingY(0, 27, from, [])).toBe(-27);
    expect(landingY(0, 27, from, [{ x: 200, y: -40, radius: 40 }])).toBe(-27);
  });

  it('lands on the curve of a rounded corner when told where the floor is', () => {
    const geo = jarGeometry(1);
    const x = 260;
    const floor = floorRestY(x, 28, geo);
    expect(landingY(x, 28, from, [], floor)).toBe(floor);
    expect(floor).toBeLessThan(-28);
  });

  it('lands on top of a cat straight below', () => {
    expect(landingY(0, 30, from, [{ x: 0, y: -40, radius: 40 }])).toBeCloseTo(-110);
  });

  it('touches a cat off to the side at the right height', () => {
    const y = landingY(30, 30, from, [{ x: 0, y: -40, radius: 40 }]);
    // Centre distance at contact is exactly the sum of the radii.
    expect(Math.hypot(30 - 0, y - -40)).toBeCloseTo(70);
  });

  it('picks the highest cat in the way and ignores cats above the start', () => {
    const balls = [
      { x: 0, y: -40, radius: 40 },
      { x: 10, y: -150, radius: 40 },
      { x: 0, y: -1200, radius: 40 },
    ];
    expect(landingY(0, 30, from, balls)).toBeLessThan(-150);
    expect(landingY(0, 30, from, balls)).toBeGreaterThan(-1000);
  });

  it('matches where a dropped cat first lands in the real physics', () => {
    const run = new RunController({ seed: 7 });
    const geo = jarGeometry(1);
    run.spawnBall(5, 0, -sizeRadius(5));
    for (let i = 0; i < 240; i++) run.tick();
    const predicted = landingY(20, run.radiusOf(run.current.tier), geo.dropY, run.balls);
    const before = run.balls.length;
    expect(run.drop(20)).toBe(true);
    const cat = run.balls[before];
    let landedAt = Number.NaN;
    for (let i = 0; i < 600 && cat && Number.isNaN(landedAt); i++) {
      run.tick();
      if (cat.landedMs >= 0) landedAt = cat.y;
    }
    // First contact is detected on the step after the overlap, so allow one step of fall.
    expect(Math.abs(landedAt - predicted)).toBeLessThan(15);
  });
});
