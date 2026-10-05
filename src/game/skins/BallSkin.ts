/**
 * How cats look (TECH_SPEC §6). Gameplay never sees textures: the renderer asks the skin for a
 * frame per (tier, golden) and for the upright number, so placeholder art can be swapped for the
 * final art (ArtSkin, M13) without touching gameplay.
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
  /** The rotating body of a cat. */
  body(tier: number, golden: boolean): SkinFrame;
  /** The upright tier number drawn on top, or null when the art doesn't show one. */
  number(tier: number): SkinFrame | null;
  /** Creates every texture up to `maxTier` now, so the first merge into a tier doesn't hitch. */
  prewarm(maxTier: number): void;
  /** Rebuilds generated textures (after a WebGL context restore). */
  restore(): void;
}
