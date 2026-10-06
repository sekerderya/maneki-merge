/** Stage clears and HUD progress (GAME_DESIGN §7). Every stage is open. */
import { STAGE_COUNT, stageInfo, tierSize } from '../config/stages';
import { SIZE_COUNT } from '../config/tiers';
import { clamp } from './math';

export type NextStage =
  /** Making this stage's last cat grows the jar into the next stage. */
  | { readonly kind: 'expand'; readonly stage: number }
  /** Already at the last stage. */
  | { readonly kind: 'final' };

/** What clearing `currentStage` (making its last cat) leads to. */
export function nextStage(currentStage: number): NextStage {
  if (currentStage >= STAGE_COUNT) return { kind: 'final' };
  return { kind: 'expand', stage: currentStage + 1 };
}

export interface StageProgress {
  /**
   * How close the biggest cat in the jar is to the stage's last cat, 0–1: its size − 1 over the
   * sizes in between (0 with an empty jar or only size-1 cats, 1 once the last cat exists).
   */
  readonly fraction: number;
  /** The stage's last cat, the goal the HUD shows. */
  readonly goalTier: number;
  /** True at the last stage. */
  readonly final: boolean;
}

/** HUD progress for `stage`, given the biggest tier in the jar (0 when it is empty). */
export function stageProgress(biggestTier: number, stage: number): StageProgress {
  const size = biggestTier > 0 ? tierSize(biggestTier, stage) : 1;
  return {
    fraction: clamp((size - 1) / (SIZE_COUNT - 1), 0, 1),
    goalTier: stageInfo(stage).lastTier,
    final: nextStage(stage).kind === 'final',
  };
}
