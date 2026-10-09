/**
 * The aim guide (GAME_DESIGN §3): a dotted line from the dropper's cat down to where it first
 * touches something, and a faint ghost of the cat there, at its true size.
 *
 * The dots are pooled images of one small texture rather than Graphics circles: Phaser re-traces
 * every Graphics arc as a 100-point path each frame, and the 40-odd dots cost a slow phone about
 * as much as the physics (TECH_SPEC §13). The ghost stays a single stroked circle.
 */
import type Phaser from 'phaser';
import { AIM_LINE_ALPHA, AIM_LINE_COLOR } from '../config/skin';
import {
  AIM_DOT_RADIUS,
  AIM_DOT_SPACING,
  AIM_GHOST_ALPHA,
  AIM_LINE_WIDTH,
  CAT_PX_PER_UNIT,
} from '../config/view';

const DOT_KEY = 'aim-dot';
/** Round the dot, so its anti-aliased edge isn't cut. */
const PAD_PX = 2;

export class AimGuide {
  private readonly dots: Phaser.GameObjects.Image[] = [];
  private readonly ghost: Phaser.GameObjects.Graphics;
  private shown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    createDotTexture(scene.textures);
    this.ghost = scene.add.graphics();
    layer.add(this.ghost);
  }

  /**
   * Dots at world x from `fromY` down to (not including) `toY`, AIM_DOT_SPACING apart, and the
   * ghost of a cat of `radius` landing at `landY`.
   */
  draw(x: number, fromY: number, toY: number, landY: number, radius: number): void {
    let count = 0;
    for (let y = fromY; y < toY; y += AIM_DOT_SPACING) {
      this.dot(count++).setPosition(x, y).setVisible(true);
    }
    for (let i = count; i < this.shown; i++) this.dots[i]?.setVisible(false);
    this.shown = count;
    this.ghost
      .clear()
      .lineStyle(AIM_LINE_WIDTH, AIM_LINE_COLOR, AIM_LINE_ALPHA * AIM_GHOST_ALPHA)
      .strokeCircle(x, landY, radius);
  }

  hide(): void {
    for (let i = 0; i < this.shown; i++) this.dots[i]?.setVisible(false);
    this.shown = 0;
    this.ghost.clear();
  }

  /** Re-uploads the dot's texture after the WebGL context comes back. */
  restore(): void {
    (this.scene.textures.get(DOT_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }

  private dot(index: number): Phaser.GameObjects.Image {
    const existing = this.dots[index];
    if (existing) return existing;
    const dot = this.scene.add
      .image(0, 0, DOT_KEY)
      .setScale(1 / CAT_PX_PER_UNIT)
      .setTint(AIM_LINE_COLOR)
      .setAlpha(AIM_LINE_ALPHA);
    // Under the ghost, as when both were one Graphics.
    this.layer.add(dot);
    this.layer.sendToBack(dot);
    this.dots.push(dot);
    return dot;
  }
}

/** A white disc of AIM_DOT_RADIUS at CAT_PX_PER_UNIT texture pixels per world unit (tinted per use). */
function createDotTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(DOT_KEY)) return;
  const radius = AIM_DOT_RADIUS * CAT_PX_PER_UNIT;
  const side = Math.ceil(2 * (radius + PAD_PX));
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.beginPath();
  ctx.arc(side / 2, side / 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  textures.addCanvas(DOT_KEY, canvas);
}
