import { describe, expect, it } from 'vitest';
import { stageInfo } from '../../src/config/stages';
import { nextStage, stageProgress } from '../../src/core/progression';

describe('nextStage (GAME_DESIGN §7)', () => {
  it('always leads on to the next stage: stages have no end', () => {
    for (let stage = 1; stage <= 30; stage++) {
      expect(nextStage(stage).stage).toBe(stage + 1);
    }
  });

  it('grows the jar every 5 stages', () => {
    const grows = Array.from({ length: 20 }, (_, i) => i + 1).filter((s) => nextStage(s).grows);
    expect(grows).toEqual([5, 10, 15, 20]);
  });

  it('rejects unknown stages', () => {
    expect(() => nextStage(0)).toThrow(RangeError);
    expect(() => nextStage(1.5)).toThrow(RangeError);
  });
});

describe('stageProgress (HUD bar)', () => {
  it('measures the biggest cat in the jar against the stage last cat', () => {
    expect(stageProgress(0, 1)).toEqual({ fraction: 0, goalTier: 9, grows: false });
    expect(stageProgress(1, 1).fraction).toBe(0);
    expect(stageProgress(6, 1).fraction).toBeCloseTo(5 / 8, 12);
    expect(stageProgress(8, 1).fraction).toBeCloseTo(7 / 8, 12);
    expect(stageProgress(9, 1).fraction).toBe(1);
  });

  it('counts sizes, so every stage fills the same way', () => {
    for (let stage = 1; stage <= 12; stage++) {
      const { firstTier, lastTier } = stageInfo(stage);
      const p = stageProgress(firstTier + 5, stage);
      expect(p.fraction).toBeCloseTo(5 / 8, 12);
      expect(p.goalTier).toBe(lastTier);
      expect(stageProgress(lastTier, stage).fraction).toBe(1);
    }
  });

  it('marks the stages whose clear grows the jar', () => {
    expect(stageProgress(17, 2)).toMatchObject({ goalTier: 18, grows: false });
    expect(stageProgress(40, 5)).toMatchObject({ goalTier: 45, grows: true });
    expect(stageProgress(50, 6)).toMatchObject({ goalTier: 54, grows: false });
    expect(stageProgress(90, 10)).toMatchObject({ goalTier: 90, grows: true });
  });
});
