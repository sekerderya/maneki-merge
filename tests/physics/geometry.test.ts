import { describe, expect, it } from 'vitest';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { catRadius } from '../../src/config/stages';
import { clampDropX, floorRestY, jarGeometry } from '../../src/physics/geometry';

describe('jarGeometry (GAME_DESIGN §7, TECH_SPEC §4)', () => {
  it('is the same 600 × 870 jar at every stage, with the rim at y = −H', () => {
    for (let s = 1; s <= STAGE_COUNT; s++) {
      const g = jarGeometry(s);
      expect(g.stage).toBe(s);
      expect([g.width, g.height, g.rimY, g.halfWidth]).toEqual([600, 870, -870, 300]);
      expect(g.cornerRadius).toBe(168);
    }
  });

  it('puts the dropper in the middle of a 0.2 W band above the rim', () => {
    const g = jarGeometry(1);
    expect(g.headroom).toBeCloseTo(120, 10);
    expect(g.dropY).toBeCloseTo(-930, 10);
  });

  it('keeps every stage’s biggest dropped cat above the rim', () => {
    for (let s = 1; s <= STAGE_COUNT; s++) {
      const g = jarGeometry(s);
      const pool = stageInfo(s).dropPool;
      const biggest = catRadius(pool[pool.length - 1]!, s);
      expect(g.dropY + biggest).toBeLessThan(g.rimY);
    }
  });

  it('rejects unknown stages', () => {
    expect(() => jarGeometry(0)).toThrow(RangeError);
    expect(() => jarGeometry(6)).toThrow(RangeError);
  });

  it('is shared and frozen', () => {
    expect(jarGeometry(2)).toBe(jarGeometry(2));
    expect(Object.isFrozen(jarGeometry(2))).toBe(true);
  });
});

describe('clampDropX', () => {
  const g = jarGeometry(1);

  it('keeps the whole cat inside the walls', () => {
    expect(clampDropX(0, 27, g)).toBe(0);
    expect(clampDropX(1000, 27, g)).toBe(273);
    expect(clampDropX(-1000, 49, g)).toBe(-251);
    expect(clampDropX(100.5, 49, g)).toBe(100.5);
  });

  it('centres a cat wider than the jar', () => {
    expect(clampDropX(50, 400, g)).toBe(0);
  });
});

describe('floorRestY (GAME_DESIGN §6: the rounded bottom corners)', () => {
  const g = jarGeometry(1);

  it('rests a cat on the flat floor at −radius', () => {
    expect(floorRestY(0, 34, g)).toBe(-34);
    expect(floorRestY(-132, 34, g)).toBe(-34); // the corner starts at |x| = 300 − 168
  });

  it('holds a cat higher in a corner, touching the curve', () => {
    for (const x of [-266, -200, 200, 266]) {
      const y = floorRestY(x, 34, g);
      expect(y).toBeLessThan(-34);
      // The centre stays (corner − radius) from the corner's centre.
      const cx = Math.sign(x) * (300 - 168);
      expect(Math.hypot(x - cx, y + 168)).toBeCloseTo(168 - 34, 9);
    }
    // Against the wall, a cat sits where the curve meets the wall.
    expect(floorRestY(266, 34, g)).toBeCloseTo(-168, 9);
  });

  it('is continuous where the curve meets the floor', () => {
    expect(floorRestY(132.001, 40, g)).toBeCloseTo(-40, 3);
  });

  it('leaves cats at least as big as the corner on the flat floor', () => {
    expect(floorRestY(300 - 168, 168, g)).toBe(-168);
    expect(floorRestY(0, 205, g)).toBe(-205);
  });
});
