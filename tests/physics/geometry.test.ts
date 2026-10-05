import { describe, expect, it } from 'vitest';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { tierRadius } from '../../src/config/tiers';
import { clampDropX, jarGeometry } from '../../src/physics/geometry';

describe('jarGeometry (GAME_DESIGN §7, TECH_SPEC §4)', () => {
  it('matches the stage table, with the rim at y = −H', () => {
    const sizes = [1, 2, 3, 4, 5].map((s) => {
      const g = jarGeometry(s);
      return [g.width, g.height, g.rimY, g.halfWidth];
    });
    expect(sizes).toEqual([
      [600, 870, -870, 300],
      [780, 1131, -1131, 390],
      [1014, 1470, -1470, 507],
      [1318, 1911, -1911, 659],
      [1714, 2485, -2485, 857],
    ]);
  });

  it('puts the dropper in the middle of a 0.18 W band above the rim', () => {
    const g = jarGeometry(1);
    expect(g.headroom).toBeCloseTo(108, 10);
    expect(g.dropY).toBeCloseTo(-924, 10);
    expect(g.scale).toBe(1);
  });

  it('keeps every stage’s biggest dropped cat above the rim', () => {
    for (let s = 1; s <= STAGE_COUNT; s++) {
      const g = jarGeometry(s);
      const pool = stageInfo(s).dropPool;
      const biggest = tierRadius(pool[pool.length - 1]!);
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
