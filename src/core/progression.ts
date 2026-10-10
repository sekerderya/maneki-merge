/** Stage clears and HUD progress (GAME_DESIGN §7). Every stage is open, and they have no end. */
import { clearGrowsJar, stageInfo, tierSize } from '../config/stages';
import { SIZE_COUNT } from '../config/tiers';
import { clamp } from './math';

export interface NextStage {
  /** The stage that clearing the current one leads to: always the next. */
  readonly stage: number;
  /** True when the jar grows on the way (every JAR_GROWTH_STAGES stages); else the same jar. */
  readonly grows: boolean;
}

/** What clearing `currentStage` (making its last cat) leads to. */
export function nextStage(currentStage: number): NextStage {
  stageInfo(currentStage); // throws for an unknown stage
  return { stage: currentStage + 1, grows: clearGrowsJar(currentStage) };
}

export interface StageProgress {
  /**
   * How close the biggest cat in the jar is to the stage's last cat, 0–1: its size − 1 over the
   * sizes in between (0 with an empty jar or only size-1 cats, 1 once the last cat exists).
   */
  readonly fraction: number;
  /** The stage's last cat, the goal the HUD shows. */
  readonly goalTier: number;
  /** True when clearing this stage grows the jar. */
  readonly grows: boolean;
}

/** HUD progress for `stage`, given the biggest tier in the jar (0 when it is empty). */
export function stageProgress(biggestTier: number, stage: number): StageProgress {
  const size = biggestTier > 0 ? tierSize(biggestTier, stage) : 1;
  return {
    fraction: clamp((size - 1) / (SIZE_COUNT - 1), 0, 1),
    goalTier: stageInfo(stage).lastTier,
    grows: clearGrowsJar(stage),
  };
}
