/**
 * How cats look (TECH_SPEC §6). Gameplay never sees textures: the renderer asks the skin for a
 * frame per (tier, golden) and for the upright number, so placeholder art can be swapped for the
 * final art (ArtSkin, M13) without touching gameplay.
 *
 * Frames belong to the active stage: a tier's size, and so its radius and look, depends on the
 * stage (game/skins/skinSets.ts), and so do the numbers a stage needs.
 */

/**
 * A texture plus its scale: world units per texture pixel when the cat has the radius of its size
 * at the active stage.
 */
export interface SkinFrame {
  readonly key: string;
  /**
   * Includes the hit-radius ratio: a frame whose visible circle is smaller than its texture
   * (padding, outline, art that doesn't touch the edges) gets a larger value.
   */
  readonly unitsPerPixel: number;
}

/** An upright number frame and where it sits on its cat. */
export interface NumberFrame extends SkinFrame {
  /**
   * How far below the cat's centre the number sits, as a fraction of the radius, along the cat's
   * own down axis: the number rides on its plate as the cat rolls, but stays upright.
   */
  readonly offset: number;
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
  number(tier: number): NumberFrame | null;
  /** The cat's main colour as `#rrggbb` (merge particles, the pop ring). */
  color(tier: number): string;
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
