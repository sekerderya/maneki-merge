import { describe, expect, it } from 'vitest';
import { BASE_MAX_STAGE } from '../../src/config/stages';
import {
  isStageUnlocked,
  nextExpansion,
  shrineLevelForStage,
  stageProgress,
  stageThreshold,
} from '../../src/core/progression';
import { defaultUpgradeLevels, deriveStats } from '../../src/core/upgrades';

const stats = (quickGrowth = 0, shrineExpansion = 0) =>
  deriveStats({ ...defaultUpgradeLevels(), quickGrowth, shrineExpansion });

describe('stageThreshold (GAME_DESIGN §7, §10)', () => {
  // Thresholds for stages 2–5 at Quick Growth 0–5 (factor 1 − 0.06 × level).
  const TABLE: readonly [number, number[]][] = [
    [0, [500, 3000, 12000, 40000]],
    [1, [470, 2820, 11280, 37600]],
    [2, [440, 2640, 10560, 35200]],
    [3, [410, 2460, 9840, 32800]],
    [4, [380, 2280, 9120, 30400]],
    [5, [350, 2100, 8400, 28000]],
  ];

  it.each(TABLE)('Quick Growth %i: %j', (level, thresholds) => {
    const factor = stats(level).thresholdFactor;
    expect([2, 3, 4, 5].map((s) => stageThreshold(s, factor))).toEqual(thresholds);
  });

  it('starts every run at stage 1 (threshold 0)', () => {
    expect(stageThreshold(1, 0.7)).toBe(0);
  });
});

describe('stage locks', () => {
  // The "Unlocked by" column: stages 1–2 are free, 3–5 need Shrine Expansion 1–3.
  it.each([
    [1, 0],
    [2, 0],
    [3, 1],
    [4, 2],
    [5, 3],
  ])('stage %i needs Shrine Expansion %i', (stage, level) => {
    expect(shrineLevelForStage(stage, BASE_MAX_STAGE)).toBe(level);
    expect(isStageUnlocked(stage, stats(0, level).maxStage)).toBe(true);
    if (level > 0) expect(isStageUnlocked(stage, stats(0, level - 1).maxStage)).toBe(false);
  });
});

describe('nextExpansion', () => {
  it('waits until the score reaches the threshold', () => {
    expect(nextExpansion(0, 1, stats())).toEqual({ kind: 'none', stage: 2 });
    expect(nextExpansion(499, 1, stats())).toEqual({ kind: 'none', stage: 2 });
    expect(nextExpansion(500, 1, stats())).toEqual({ kind: 'expand', stage: 2 });
    expect(nextExpansion(350, 1, stats(5))).toEqual({ kind: 'expand', stage: 2 });
  });

  it('reports a locked stage instead of expanding', () => {
    expect(nextExpansion(3000, 2, stats())).toEqual({ kind: 'locked', stage: 3 });
    expect(nextExpansion(3000, 2, stats(0, 1))).toEqual({ kind: 'expand', stage: 3 });
    expect(nextExpansion(99_999, 4, stats(0, 2))).toEqual({ kind: 'locked', stage: 5 });
  });

  it('expands one stage at a time when several thresholds pass at once', () => {
    const s = stats(0, 3);
    const steps: number[] = [];
    let stage = 1;
    for (let next = nextExpansion(50_000, stage, s); next.kind === 'expand';) {
      steps.push(next.stage);
      stage = next.stage;
      next = nextExpansion(50_000, stage, s);
    }
    expect(steps).toEqual([2, 3, 4, 5]);
    expect(nextExpansion(50_000, 5, s)).toEqual({ kind: 'final' });
  });
});

describe('stageProgress (HUD bar)', () => {
  it('fills from the current threshold to the next one', () => {
    expect(stageProgress(0, 1, stats())).toEqual({ fraction: 0, target: 500, locked: false });
    expect(stageProgress(250, 1, stats())).toEqual({ fraction: 0.5, target: 500, locked: false });
    expect(stageProgress(1750, 2, stats(0, 1))).toEqual({
      fraction: 0.5,
      target: 3000,
      locked: false,
    });
  });

  it('clamps to 0–1 and shows a lock when the next stage is closed', () => {
    expect(stageProgress(9000, 2, stats())).toEqual({ fraction: 1, target: 3000, locked: true });
    expect(stageProgress(100, 2, stats()).fraction).toBe(0);
  });

  it('is full with no target at the last stage', () => {
    expect(stageProgress(0, 5, stats(0, 3))).toEqual({ fraction: 1, target: null, locked: false });
  });
});
