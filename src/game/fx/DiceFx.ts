/**
 * Dice's look (GAME_DESIGN §15.14): when a merge's die is lucky or fizzles, the owner's gold or
 * grey die (docs/ART_ASSETS.md §4.13) pops up over the merge, rises a little and fades out over
 * DICE_MS; with reduced motion it only fades in and out where it is. Normal merges show nothing,
 * and so does a skin without the art. Pooled images, animated by hand.
 */
import type Phaser from 'phaser';
import type { DiceRoll } from '../../config/picks';
import { FX_ART } from '../../config/fxSprites';
import { DICE_MS, DICE_POP_MS, DICE_RISE, DICE_SIZE } from '../../config/view';
import { imageCanvas } from '../artImages';

const DIE_KEYS = ['die-lucky', 'die-unlucky'] as const;

interface Die {
  startMs: number;
  x: number;
  y: number;
  reduced: boolean;
  readonly image: Phaser.GameObjects.Image;
}

/** A die's look `t` (0–1) through its life: its scale share, its rise share and its alpha. */
export function diePose(t: number, reduced: boolean): { pop: number; rise: number; alpha: number } {
  const popT = Math.min(1, (t * DICE_MS) / DICE_POP_MS);
  // Out a little past full size, then back.
  const pop = reduced ? 1 : 0.6 + 0.4 * popT + 0.15 * Math.sin(Math.PI * popT);
  const rise = reduced ? 0 : 1 - (1 - t) * (1 - t);
  const alpha = reduced ? Math.min(1, 4 * t, 4 * (1 - t)) : t < 0.6 ? 1 : (1 - t) / 0.4;
  return { pop, rise, alpha: Math.max(0, alpha) };
}

export class DiceFx {
  private readonly dice: Die[] = [];
  private readonly available: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    images: readonly HTMLImageElement[] | null = null,
  ) {
    const list = images ?? [];
    list.forEach((image, i) => {
      const key = DIE_KEYS[i];
      if (key && !scene.textures.exists(key)) scene.textures.addCanvas(key, imageCanvas(image));
    });
    this.available = list.length >= DIE_KEYS.length;
  }

  /** A merge's die showed `roll`, with its new cat at (x, y) of `radius`. */
  show(
    roll: DiceRoll,
    x: number,
    y: number,
    radius: number,
    nowMs: number,
    reduced: boolean,
  ): void {
    if (!roll || !this.available) return;
    let die = this.dice.find((d) => d.startMs === -Infinity);
    if (!die) {
      const image = this.scene.add.image(0, 0, DIE_KEYS[0]).setVisible(false);
      this.layer.add(image);
      die = { startMs: nowMs, x, y, reduced, image };
      this.dice.push(die);
    }
    const index = roll === 'lucky' ? 0 : 1;
    die.startMs = nowMs;
    die.x = x;
    // Over the new cat, so it doesn't hide it.
    die.y = y - radius - DICE_SIZE / 2;
    die.reduced = reduced;
    die.image.setTexture(DIE_KEYS[index]).setVisible(true);
    this.layer.bringToTop(die.image);
  }

  update(nowMs: number): void {
    for (const die of this.dice) {
      if (die.startMs === -Infinity) continue;
      const t = (nowMs - die.startMs) / DICE_MS;
      if (t >= 1) {
        this.end(die);
        continue;
      }
      const sprite = FX_ART.dice[die.image.texture.key === DIE_KEYS[0] ? 0 : 1];
      const { pop, rise, alpha } = diePose(Math.max(0, t), die.reduced);
      die.image
        .setPosition(die.x, die.y - DICE_RISE * rise)
        .setScale((DICE_SIZE / (sprite?.height ?? DICE_SIZE)) * pop)
        .setAlpha(alpha);
    }
  }

  /** Re-uploads the textures after the WebGL context comes back. */
  restore(): void {
    for (const key of DIE_KEYS) {
      if (this.scene.textures.exists(key)) {
        (this.scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
      }
    }
  }

  clear(): void {
    for (const die of this.dice) this.end(die);
  }

  private end(die: Die): void {
    die.startMs = -Infinity;
    die.image.setVisible(false);
  }
}
