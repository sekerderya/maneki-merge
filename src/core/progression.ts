/** Stage clears, stage locks and HUD progress (GAME_DESIGN §7, §7.2, §10). */
import { STAGE_COUNT, stageInfo, tierSize } from '../config/stages';
import { SIZE_COUNT } from '../config/tiers';
import { clamp } from './math';

export function isStageUnlocked(stage: number, maxStage: number): boolean {
  return stage <= Math.min(maxStage, STAGE_COUNT);
}

/** The lowest Shrine Expansion level that unlocks `stage`, given the base max stage. */
export function shrineLevelForStage(stage: number, baseMaxStage: number): number {
  return Math.max(0, stage - baseMaxStage);
}

export type NextStage =
  /** The next stage is open: making this stage's last cat grows the jar into it. */
  | { readonly kind: 'expand'; readonly stage: number }
  /** The next stage needs more Shrine Expansion. */
  | { readonly kind: 'locked'; readonly stage: number }
  /** Already at the last stage. */
  | { readonly kind: 'final' };

/** What clearing `currentStage` (making its last cat) leads to. */
export function nextStage(currentStage: number, maxStage: number): NextStage {
  if (currentStage >= STAGE_COUNT) return { kind: 'final' };
  const stage = currentStage + 1;
  return isStageUnlocked(stage, maxStage) ? { kind: 'expand', stage } : { kind: 'locked', stage };
}

export interface StageProgress {
  /**
   * How close the biggest cat in the jar is to the stage's last cat, 0–1: its size − 1 over the
   * sizes in between (0 with an empty jar or only size-1 cats, 1 once the last cat exists).
   */
  readonly fraction: number;
  /** The stage's last cat, the goal the HUD shows. */
  readonly goalTier: number;
  /** True when the next stage exists but isn't unlocked (the HUD shows a lock). */
  readonly locked: boolean;
  /** True at the last stage. */
  readonly final: boolean;
}

/** HUD progress for `stage`, given the biggest tier in the jar (0 when it is empty). */
export function stageProgress(biggestTier: number, stage: number, maxStage: number): StageProgress {
  const size = biggestTier > 0 ? tierSize(biggestTier, stage) : 1;
  const next = nextStage(stage, maxStage);
  return {
    fraction: clamp((size - 1) / (SIZE_COUNT - 1), 0, 1),
    goalTier: stageInfo(stage).lastTier,
    locked: next.kind === 'locked',
    final: next.kind === 'final',
  };
}
