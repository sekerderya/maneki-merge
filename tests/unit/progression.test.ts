import { describe, expect, it } from 'vitest';
import { BASE_MAX_STAGE, STAGE_COUNT, stageInfo } from '../../src/config/stages';
import {
  isStageUnlocked,
  nextStage,
  shrineLevelForStage,
  stageProgress,
} from '../../src/core/progression';
import { defaultUpgradeLevels, deriveStats } from '../../src/core/upgrades';

const maxStage = (shrineExpansion = 0) =>
  deriveStats({ ...defaultUpgradeLevels(), shrineExpansion }).maxStage;

describe('stage locks (GAME_DESIGN §7.2, §10)', () => {
  it('opens stages 1–2 for free and one more per Shrine Expansion level', () => {
    expect([0, 1, 2, 3].map(maxStage)).toEqual([2, 3, 4, 5]);
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      expect(isStageUnlocked(stage, maxStage(0))).toBe(stage <= 2);
      expect(isStageUnlocked(stage, maxStage(3))).toBe(true);
    }
    expect(isStageUnlocked(6, 99)).toBe(false);
    expect([1, 2, 3, 4, 5].map((s) => shrineLevelForStage(s, BASE_MAX_STAGE))).toEqual([
      0, 0, 1, 2, 3,
    ]);
  });
});

describe('nextStage (GAME_DESIGN §7)', () => {
  it('grows into the next stage when it is open', () => {
    expect(nextStage(1, maxStage(0))).toEqual({ kind: 'expand', stage: 2 });
    expect(nextStage(4, maxStage(3))).toEqual({ kind: 'expand', stage: 5 });
  });

  it('reports a locked next stage', () => {
    expect(nextStage(2, maxStage(0))).toEqual({ kind: 'locked', stage: 3 });
    expect(nextStage(4, maxStage(2))).toEqual({ kind: 'locked', stage: 5 });
  });

  it('knows the last stage', () => {
    expect(nextStage(STAGE_COUNT, maxStage(3))).toEqual({ kind: 'final' });
  });
});

describe('stageProgress (HUD bar)', () => {
  it('measures the biggest cat in the jar against the stage last cat', () => {
    expect(stageProgress(0, 1, 2)).toEqual({
      fraction: 0,
      goalTier: 12,
      locked: false,
      final: false,
    });
    expect(stageProgress(1, 1, 2).fraction).toBe(0);
    expect(stageProgress(6, 1, 2).fraction).toBeCloseTo(5 / 11, 12);
    expect(stageProgress(11, 1, 2).fraction).toBeCloseTo(10 / 11, 12);
    expect(stageProgress(12, 1, 2).fraction).toBe(1);
  });

  it('counts sizes, so every stage fills the same way', () => {
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      const { firstTier, lastTier } = stageInfo(stage);
      const p = stageProgress(firstTier + 5, stage, 5);
      expect(p.fraction).toBeCloseTo(5 / 11, 12);
      expect(p.goalTier).toBe(lastTier);
      expect(stageProgress(lastTier, stage, 5).fraction).toBe(1);
    }
  });

  it('shows the lock and the last stage', () => {
    expect(stageProgress(20, 2, 2)).toMatchObject({ goalTier: 23, locked: true, final: false });
    expect(stageProgress(20, 2, 3)).toMatchObject({ locked: false, final: false });
    expect(stageProgress(50, 5, 5)).toMatchObject({ goalTier: 56, locked: false, final: true });
  });
});
