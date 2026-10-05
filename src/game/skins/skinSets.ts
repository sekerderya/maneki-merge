/**
 * Which cat textures a stage needs, and how detailed they are (TECH_SPEC §6). Pure data, no
 * Phaser, so it is unit-tested in Node.
 *
 * The camera zooms out by the stage's scale, so a texture drawn for stage 1 would be shrunk almost
 * 3× further at stage 5 (canvas textures get no mipmaps in WebGL1) and look jagged. Each stage
 * therefore gets its own set, drawn at PLACEHOLDER_PX_PER_UNIT / scale: every stage then shows its
 * textures at the same texture-to-screen ratio as stage 1.
 */
import { stageInfo, STAGES } from '../../config/stages';
import { PLACEHOLDER_PX_PER_UNIT } from '../../config/view';

export interface StageSkinSet {
  readonly stage: number;
  /** Tiers that can be in the jar at this stage: its smallest drop up to its cap. */
  readonly tiers: readonly number[];
  /** Tiers that can be golden here: only dropped cats are golden, so the stage's drop pool. */
  readonly golden: readonly number[];
}

export function stageSkinSet(stage: number): StageSkinSet {
  const info = stageInfo(stage);
  const smallest = info.dropPool[0] ?? 1;
  return {
    stage,
    tiers: Array.from({ length: info.tierCap - smallest + 1 }, (_, i) => smallest + i),
    golden: info.dropPool,
  };
}

/**
 * Texture pixels per world unit for a tier drawn at a stage. Inside the stage's set this is the
 * stage's density. A bigger tier than the stage allows (debug spawns) is capped at the density of
 * the first stage that holds it, so a texture never gets larger than its own stage needs.
 */
export function texturePxPerUnit(tier: number, stage: number): number {
  const first = STAGES.find((s) => s.tierCap >= tier) ?? STAGES[STAGES.length - 1];
  const scale = Math.max(stageInfo(stage).scale, first?.scale ?? 1);
  return PLACEHOLDER_PX_PER_UNIT / scale;
}
