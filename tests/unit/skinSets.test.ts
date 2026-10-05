import { describe, expect, it } from 'vitest';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { MAX_TIER } from '../../src/config/tiers';
import { PLACEHOLDER_PX_PER_UNIT, POP_STAGGER_MAX_MS, POP_STAGGER_MS } from '../../src/config/view';
import { cashOutBelow } from '../../src/core/economy';
import { fitCamera, worldToView } from '../../src/game/cameraFit';
import { popDelay } from '../../src/game/fx/PopFx';
import { stageSkinSet, texturePxPerUnit } from '../../src/game/skins/skinSets';
import { jarGeometry } from '../../src/physics/geometry';

describe('cat textures per stage (TECH_SPEC §6)', () => {
  it('covers every tier a stage can hold, and golden cats only where they are dropped', () => {
    expect(stageSkinSet(1)).toEqual({
      stage: 1,
      tiers: [1, 2, 3, 4, 5, 6, 7],
      golden: [1, 2, 3, 4],
    });
    expect(stageSkinSet(5)).toEqual({
      stage: 5,
      tiers: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      golden: [4, 5, 6, 7, 8],
    });
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      const set = stageSkinSet(stage);
      // Smaller cats were cashed out on the way here; bigger ones can't be made yet.
      expect(set.tiers[0]).toBe(cashOutBelow(stage));
      expect(set.tiers[set.tiers.length - 1]).toBe(stageInfo(stage).tierCap);
      expect(set.golden).toEqual(stageInfo(stage).dropPool);
    }
  });

  it("draws each stage's set at that stage's zoom", () => {
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      const { scale } = stageInfo(stage);
      for (const tier of stageSkinSet(stage).tiers) {
        expect(texturePxPerUnit(tier, stage)).toBeCloseTo(PLACEHOLDER_PX_PER_UNIT / scale, 12);
      }
    }
    // A tier bigger than the stage allows (a debug spawn) never gets a bigger texture than its
    // own first stage needs.
    expect(texturePxPerUnit(MAX_TIER, 1)).toBeCloseTo(
      PLACEHOLDER_PX_PER_UNIT / stageInfo(5).scale,
      12,
    );
  });

  it('shows textures at the same texture-to-screen ratio at every stage', () => {
    for (const [w, h] of [
      [975, 1750],
      [750, 1180],
      [1640, 2160],
    ] as const) {
      const ratios = Array.from({ length: STAGE_COUNT }, (_, i) => {
        const stage = i + 1;
        const zoom = fitCamera(jarGeometry(stage), w, h).zoom;
        return texturePxPerUnit(cashOutBelow(stage), stage) / zoom;
      });
      for (const ratio of ratios) expect(ratio / ratios[0]!).toBeCloseTo(1, 2);
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
  it('spaces pops of one tick out, but ends them within the reveal', () => {
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
