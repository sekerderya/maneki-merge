import { describe, expect, it } from 'vitest';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { catRadius } from '../../src/config/stages';
import { clampDropX, jarGeometry } from '../../src/physics/geometry';

describe('jarGeometry (GAME_DESIGN §7, TECH_SPEC §4)', () => {
  it('is the same 600 × 870 jar at every stage, with the rim at y = −H', () => {
    for (let s = 1; s <= STAGE_COUNT; s++) {
      const g = jarGeometry(s);
      expect(g.stage).toBe(s);
      expect([g.width, g.height, g.rimY, g.halfWidth]).toEqual([600, 870, -870, 300]);
    }
  });

  it('puts the dropper in the middle of a 0.4 W band above the rim', () => {
    const g = jarGeometry(1);
    expect(g.headroom).toBeCloseTo(240, 10);
    expect(g.dropY).toBeCloseTo(-990, 10);
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
