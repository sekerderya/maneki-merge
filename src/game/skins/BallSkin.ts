/**
 * How cats look (TECH_SPEC §6). Gameplay never sees textures: the renderer asks the skin for a
 * frame per (tier, golden) and for the upright number, so placeholder art can be swapped for the
 * final art (ArtSkin, M13) without touching gameplay.
 *
 * Frames belong to the active stage: a skin may draw each stage's textures at that stage's zoom
 * (game/skins/skinSets.ts), so they stay sharp as the camera zooms out.
 */

/** A texture plus its scale: world units per texture pixel when the cat has its tier's radius. */
export interface SkinFrame {
  readonly key: string;
  /**
   * Includes the hit-radius ratio: a frame whose visible circle is smaller than its texture
   * (padding, outline, art that doesn't touch the edges) gets a larger value.
   */
  readonly unitsPerPixel: number;
}

export interface BallSkin {
  readonly id: string;
  /** The stage whose frames `body` and `number` return. */
  readonly stage: number;
  /** Changes whenever the frames change (`setStage`), so renderers know to swap textures. */
  readonly revision: number;
  /** The rotating body of a cat. */
  body(tier: number, golden: boolean): SkinFrame;
  /** The upright tier number drawn on top, or null when the art doesn't show one. */
  number(tier: number): SkinFrame | null;
  /**
   * Creates the textures `stage` needs ahead of time, spending about `budgetMs` (at least one
   * texture per call). Returns true once they all exist.
   */
  prepare(stage: number, budgetMs: number): boolean;
  /** Switches to `stage`'s frames (finishing them now if needed) and frees unneeded ones. */
  setStage(stage: number): void;
  /** Rebuilds generated textures (after a WebGL context restore). */
  restore(): void;
}
