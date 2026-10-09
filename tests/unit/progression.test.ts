import { describe, expect, it } from 'vitest';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { nextStage, stageProgress } from '../../src/core/progression';

describe('nextStage (GAME_DESIGN §7)', () => {
  it('always grows into the next stage: every stage is open', () => {
    for (let stage = 1; stage < STAGE_COUNT; stage++) {
      expect(nextStage(stage)).toEqual({ kind: 'expand', stage: stage + 1 });
    }
  });

  it('knows the last stage', () => {
    expect(nextStage(STAGE_COUNT)).toEqual({ kind: 'final' });
  });
});

describe('stageProgress (HUD bar)', () => {
  it('measures the biggest cat in the jar against the stage last cat', () => {
    expect(stageProgress(0, 1)).toEqual({ fraction: 0, goalTier: 9, final: false });
    expect(stageProgress(1, 1).fraction).toBe(0);
    expect(stageProgress(6, 1).fraction).toBeCloseTo(5 / 8, 12);
    expect(stageProgress(8, 1).fraction).toBeCloseTo(7 / 8, 12);
    expect(stageProgress(9, 1).fraction).toBe(1);
  });

  it('counts sizes, so every stage fills the same way', () => {
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      const { firstTier, lastTier } = stageInfo(stage);
      const p = stageProgress(firstTier + 5, stage);
      expect(p.fraction).toBeCloseTo(5 / 8, 12);
      expect(p.goalTier).toBe(lastTier);
      expect(stageProgress(lastTier, stage).fraction).toBe(1);
    }
  });

  it('marks the last stage', () => {
    expect(stageProgress(17, 2)).toMatchObject({ goalTier: 18, final: false });
    expect(stageProgress(40, 5)).toMatchObject({ goalTier: 45, final: true });
  });
});
