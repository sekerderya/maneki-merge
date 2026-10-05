/** Expansion thresholds, stage locks and HUD progress (GAME_DESIGN §7, §7.2, §10). */
import { FIRST_STAGE, STAGE_COUNT, stageInfo } from '../config/stages';
import { clamp, roundStable } from './math';

/** The score at which the jar expands into `stage`: base threshold × Quick Growth factor. */
export function stageThreshold(stage: number, thresholdFactor: number): number {
  return roundStable(stageInfo(stage).threshold * thresholdFactor);
}

export function isStageUnlocked(stage: number, maxStage: number): boolean {
  return stage <= Math.min(maxStage, STAGE_COUNT);
}

/** The lowest Shrine Expansion level that unlocks `stage`, given the base max stage. */
export function shrineLevelForStage(stage: number, baseMaxStage: number): number {
  return Math.max(0, stage - baseMaxStage);
}

export type NextExpansion =
  /** The score reached the next threshold and that stage is open: expand now. */
  | { readonly kind: 'expand'; readonly stage: number }
  /** The score reached the next threshold but the stage needs more Shrine Expansion. */
  | { readonly kind: 'locked'; readonly stage: number }
  /** Not there yet. */
  | { readonly kind: 'none'; readonly stage: number }
  /** Already at the last stage. */
  | { readonly kind: 'final' };

export interface ProgressionStats {
  readonly thresholdFactor: number;
  readonly maxStage: number;
}

/**
 * What the run should do about the next stage. It only ever looks one stage ahead: when several
 * thresholds are passed at once, the caller expands, then asks again (one stage at a time).
 */
export function nextExpansion(
  score: number,
  currentStage: number,
  stats: ProgressionStats,
): NextExpansion {
  if (currentStage >= STAGE_COUNT) return { kind: 'final' };
  const stage = currentStage + 1;
  if (score < stageThreshold(stage, stats.thresholdFactor)) return { kind: 'none', stage };
  return isStageUnlocked(stage, stats.maxStage)
    ? { kind: 'expand', stage }
    : { kind: 'locked', stage };
}

export interface StageProgress {
  /** Fraction of the way from the current stage's threshold to the next one, 0–1. */
  readonly fraction: number;
  /** The next stage's threshold, or null at the last stage. */
  readonly target: number | null;
  /** True when the next stage exists but isn't unlocked (the HUD shows a lock). */
  readonly locked: boolean;
}

/** HUD progress bar for the current stage. */
export function stageProgress(
  score: number,
  currentStage: number,
  stats: ProgressionStats,
): StageProgress {
  if (currentStage >= STAGE_COUNT) return { fraction: 1, target: null, locked: false };
  const next = currentStage + 1;
  const from =
    currentStage <= FIRST_STAGE ? 0 : stageThreshold(currentStage, stats.thresholdFactor);
  const target = stageThreshold(next, stats.thresholdFactor);
  const fraction = target > from ? clamp((score - from) / (target - from), 0, 1) : 1;
  return { fraction, target, locked: !isStageUnlocked(next, stats.maxStage) };
}
