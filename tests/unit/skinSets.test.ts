import { describe, expect, it } from 'vitest';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { SIZE_COUNT } from '../../src/config/tiers';
import { POP_STAGGER_MAX_MS, POP_STAGGER_MS } from '../../src/config/view';
import { fitCamera, worldToView } from '../../src/game/cameraFit';
import { popDelay } from '../../src/game/fx/PopFx';
import { stageSkinSet } from '../../src/game/skins/skinSets';
import { jarGeometry } from '../../src/physics/geometry';

describe('cat textures per stage (TECH_SPEC §6)', () => {
  it('covers every tier a stage can hold, and golden cats only where they are dropped', () => {
    expect(stageSkinSet(1)).toEqual({
      stage: 1,
      tiers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      golden: [1, 2, 3, 4],
    });
    expect(stageSkinSet(2)).toEqual({
      stage: 2,
      tiers: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      golden: [12, 13, 14, 15],
    });
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      const set = stageSkinSet(stage);
      expect(set.tiers).toHaveLength(SIZE_COUNT);
      expect(set.tiers[0]).toBe(stageInfo(stage).firstTier);
      expect(set.tiers[set.tiers.length - 1]).toBe(stageInfo(stage).lastTier);
      expect(set.golden).toEqual(stageInfo(stage).dropPool);
    }
  });
});

describe('world to screen', () => {
  it('maps the camera centre to the middle of the view and scales by the zoom', () => {
    const fit = fitCamera(jarGeometry(2), 800, 1400);
    expect(worldToView(fit, 800, 1400, fit.centerX, fit.centerY)).toEqual({ x: 400, y: 700 });
    const p = worldToView(fit, 800, 1400, fit.centerX + 100, fit.centerY - 50);
    expect(p.x).toBeCloseTo(400 + 100 * fit.zoom, 9);
    expect(p.y).toBeCloseTo(700 - 50 * fit.zoom, 9);
  });
});

describe('pop stagger', () => {
  it('spaces pops of one tick out, but ends them before the zoom', () => {
    expect(popDelay(0, 1)).toBe(0);
    expect(popDelay(1, 2)).toBe(POP_STAGGER_MS);
    for (const count of [2, 5, 9, 40]) {
      const delays = Array.from({ length: count }, (_, i) => popDelay(i, count));
      expect(delays[0]).toBe(0);
      expect(delays[count - 1]).toBeLessThanOrEqual(POP_STAGGER_MAX_MS + 1e-9);
      for (let i = 1; i < count; i++) {
        const gap = delays[i]! - delays[i - 1]!;
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(POP_STAGGER_MS + 1e-9);
      }
    }
  });
});
