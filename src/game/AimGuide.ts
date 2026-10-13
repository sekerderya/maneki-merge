/**
 * The aim guide (GAME_DESIGN §3): a dotted line from the dropper's cat down to where it first
 * touches something, and a faint ghost of the cat there, at its true size.
 *
 * No Graphics and few images (TECH_SPEC §13): Phaser re-traces every Graphics arc as a 100-point
 * path each frame, and every image costs the renderer about the same whatever its size. The dots
 * are one texture holding a column of them, shown cropped to the dots the line needs (one image,
 * two for a line longer than the column), and the ghost is an image of a ring texture. Until
 * v0.42.12 the 50-odd dots were an image each and the ghost a Graphics circle: together about a
 * third of a slow phone's frame.
 */
import type Phaser from 'phaser';
import { AIM_LINE_ALPHA, AIM_LINE_COLOR } from '../config/skin';
import { DROP_SIZES } from '../config/stages';
import { sizeRadius } from '../config/tiers';
import {
  AIM_DOT_RADIUS,
  AIM_DOT_SPACING,
  AIM_GHOST_ALPHA,
  AIM_LINE_WIDTH,
  CAT_PX_PER_UNIT,
} from '../config/view';
import { RING_PX_PER_UNIT, ringTexture } from './ringTexture';

const DOT_KEY = 'aim-dots';
/** Round each dot, so its anti-aliased edge isn't cut. */
const PAD_PX = 2;
/** A dot's square in the column, padding included (texture pixels). */
const DOT_SIDE_PX = Math.ceil(2 * (AIM_DOT_RADIUS * CAT_PX_PER_UNIT + PAD_PX));
/**
 * From one dot's centre to the next (texture pixels): a whole number (45), so every dot sits on
 * the pixel grid as the first one does and they all look alike.
 */
const DOT_STEP_PX = AIM_DOT_SPACING * CAT_PX_PER_UNIT;
/** The column's texture stays within this height. */
const COLUMN_MAX_PX = 2048;
/** Dots in the column. */
const COLUMN_DOTS = Math.floor((COLUMN_MAX_PX - DOT_SIDE_PX) / DOT_STEP_PX) + 1;
const COLUMN_HEIGHT_PX = DOT_SIDE_PX + (COLUMN_DOTS - 1) * DOT_STEP_PX;

/** An image of the column and how many of its dots it shows. */
interface Column {
  readonly image: Phaser.GameObjects.Image;
  dots: number;
}

export class AimGuide {
  private readonly columns: Column[] = [];
  private readonly ghost: Phaser.GameObjects.Image;
  private ghostKey = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    createColumnTexture(scene.textures);
    // The dropped sizes' ghosts are ready before play; a bigger ball's (a magnet's catch) is drawn
    // the first time it comes.
    for (let size = 1; size <= DROP_SIZES; size++) {
      ringTexture(scene.textures, sizeRadius(size), AIM_LINE_WIDTH);
    }
    this.ghost = scene.add
      .image(0, 0, DOT_KEY)
      .setScale(1 / RING_PX_PER_UNIT)
      .setTint(AIM_LINE_COLOR)
      .setAlpha(AIM_LINE_ALPHA * AIM_GHOST_ALPHA)
      .setVisible(false);
    layer.add(this.ghost);
  }

  /**
   * Dots at world x from `fromY` down to (not including) `toY`, AIM_DOT_SPACING apart, and the
   * ghost of a cat of `radius` landing at `landY`.
   */
  draw(x: number, fromY: number, toY: number, landY: number, radius: number): void {
    const count = toY > fromY ? Math.ceil((toY - fromY) / AIM_DOT_SPACING) : 0;
    const needed = Math.ceil(count / COLUMN_DOTS);
    for (let i = 0; i < Math.max(needed, this.columns.length); i++) {
      const dots = Math.min(COLUMN_DOTS, count - i * COLUMN_DOTS);
      if (dots <= 0) {
        this.columns[i]?.image.setVisible(false);
        continue;
      }
      const column = this.column(i);
      if (column.dots !== dots) {
        column.dots = dots;
        column.image.setCrop(0, 0, DOT_SIDE_PX, DOT_SIDE_PX + (dots - 1) * DOT_STEP_PX);
      }
      column.image.setPosition(x, fromY + i * COLUMN_DOTS * AIM_DOT_SPACING).setVisible(true);
    }
    const key = ringTexture(this.scene.textures, radius, AIM_LINE_WIDTH);
    if (key !== this.ghostKey) {
      this.ghostKey = key;
      this.ghost.setTexture(key);
    }
    this.ghost.setPosition(x, landY).setVisible(true);
  }

  hide(): void {
    for (const column of this.columns) column.image.setVisible(false);
    this.ghost.setVisible(false);
  }

  /** Re-uploads the dots' texture after the WebGL context comes back. */
  restore(): void {
    (this.scene.textures.get(DOT_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }

  private column(index: number): Column {
    const existing = this.columns[index];
    if (existing) return existing;
    // The first dot's centre is the image's origin; the crop keeps it there.
    const image = this.scene.add
      .image(0, 0, DOT_KEY)
      .setOrigin(0.5, DOT_SIDE_PX / 2 / COLUMN_HEIGHT_PX)
      .setScale(1 / CAT_PX_PER_UNIT)
      .setTint(AIM_LINE_COLOR)
      .setAlpha(AIM_LINE_ALPHA);
    // Under the ghost.
    this.layer.add(image);
    this.layer.sendToBack(image);
    const column = { image, dots: COLUMN_DOTS };
    this.columns.push(column);
    return column;
  }
}

/**
 * COLUMN_DOTS white discs of AIM_DOT_RADIUS, DOT_STEP_PX apart down one texture at CAT_PX_PER_UNIT
 * texture pixels per world unit (tinted per use).
 */
function createColumnTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(DOT_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = DOT_SIDE_PX;
  canvas.height = COLUMN_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < COLUMN_DOTS; i++) {
    ctx.beginPath();
    ctx.arc(
      DOT_SIDE_PX / 2,
      DOT_SIDE_PX / 2 + i * DOT_STEP_PX,
      AIM_DOT_RADIUS * CAT_PX_PER_UNIT,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  textures.addCanvas(DOT_KEY, canvas);
}
