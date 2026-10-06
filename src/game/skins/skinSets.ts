/**
 * Which cat textures a stage needs (TECH_SPEC §6). Pure data, no Phaser, so it is unit-tested in
 * Node.
 *
 * The world has the same scale at every stage and the colours repeat with the sizes, so a cat of a
 * given size looks the same at every stage: bodies are shared by size, drawn once, and only the
 * numbers (the tiers) differ from stage to stage.
 */
import { stageInfo } from '../../config/stages';
import { SIZE_COUNT } from '../../config/tiers';

export interface StageSkinSet {
  readonly stage: number;
  /** Tiers the jar can hold at this stage: its first to its last cat, smallest first. */
  readonly tiers: readonly number[];
  /** Tiers that can be golden here: only dropped cats are golden, so the stage's drop pool. */
  readonly golden: readonly number[];
}

export function stageSkinSet(stage: number): StageSkinSet {
  const info = stageInfo(stage);
  return {
    stage,
    tiers: Array.from({ length: SIZE_COUNT }, (_, i) => info.firstTier + i),
    golden: info.dropPool,
  };
}
