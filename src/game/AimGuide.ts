/**
 * The aim guide (GAME_DESIGN §3): a dotted line from the dropper's cat down to where it first
 * touches something, and a faint ghost of the cat there, at its true size. For a katana (§15.16) it
 * is every blade's cut, one dotted line each, and a pulsing ring round each ball the cut would reach,
 * both in the katana's red.
 *
 * No Graphics and few images (TECH_SPEC §13): Phaser re-traces every Graphics arc as a 100-point
 * path each frame, and every image costs the renderer about the same whatever its size. The dots
 * are one texture holding a column of them, shown cropped to the dots the line needs (one image,
 * two for a line longer than the column), and the ghost is an image of a ring texture. Until
 * v0.42.12 the 50-odd dots were an image each and the ghost a Graphics circle: together about a
 * third of a slow phone's frame.
 */
import type Phaser from 'phaser';
import { AIM_LINE_ALPHA, AIM_LINE_COLOR, KATANA_TARGET_COLOR } from '../config/skin';
import { DROP_SIZES } from '../config/stages';
import { sizeRadius } from '../config/tiers';
import {
  AIM_DOT_RADIUS,
  AIM_DOT_SPACING,
  AIM_GHOST_ALPHA,
  AIM_LINE_WIDTH,
  CAT_PX_PER_UNIT,
  KATANA_TARGET,
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

/** A line of the guide, in world units: from (x0, y0) to (x1, y1). */
export interface GuideLine {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** A ball the katana's cut would reach: where it is drawn and its radius. */
export interface GuideTarget {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export class AimGuide {
  /** The columns of each line: the first line is the drop's, the others a katana's other blades. */
  private readonly lines: Column[][] = [];
  private readonly ghost: Phaser.GameObjects.Image;
  private ghostKey = '';
  private readonly rings: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    /** The katana's target rings, over the balls. */
    private readonly front: Phaser.GameObjects.Layer,
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
    this.dots(0, x, fromY, x, toY, AIM_LINE_COLOR);
    this.hideFrom(1);
    this.hideRings(0);
    const key = ringTexture(this.scene.textures, radius, AIM_LINE_WIDTH);
    if (key !== this.ghostKey) {
      this.ghostKey = key;
      this.ghost.setTexture(key);
    }
    this.ghost.setPosition(x, landY).setVisible(true);
  }

  /**
   * The katana's guide (GAME_DESIGN §15.16): a dotted line along each of `cuts` (the first straight
   * down from the paw, More Blades' diagonals and the one across) and a ring round each of
   * `targets`, pulsing with `nowMs`.
   */
  cuts(cuts: readonly GuideLine[], targets: readonly GuideTarget[], nowMs: number): void {
    cuts.forEach((c, i) => this.dots(i, c.x0, c.y0, c.x1, c.y1, KATANA_TARGET_COLOR));
    this.hideFrom(cuts.length);
    this.ghost.setVisible(false);
    const t = KATANA_TARGET;
    const wave = (Math.sin((2 * Math.PI * nowMs) / t.periodMs) + 1) / 2;
    const alpha = t.alphaMin + (1 - t.alphaMin) * wave;
    targets.forEach((target, i) => {
      const key = ringTexture(this.scene.textures, Math.round(target.radius + t.gap), t.width);
      const ring = this.ring(i);
      if (ring.texture.key !== key) ring.setTexture(key);
      ring.setPosition(target.x, target.y).setAlpha(alpha).setVisible(true);
    });
    this.hideRings(targets.length);
  }

  /** Dots of `color` along the line `index` from (x0, y0) to (x1, y1), AIM_DOT_SPACING apart. */
  private dots(index: number, x0: number, y0: number, x1: number, y1: number, color: number): void {
    const columns = (this.lines[index] ??= []);
    const length = Math.hypot(x1 - x0, y1 - y0);
    const count = length > 0 ? Math.ceil(length / AIM_DOT_SPACING) : 0;
    const needed = Math.ceil(count / COLUMN_DOTS);
    // The column runs down its texture: turn it from straight down onto the line.
    const ux = length > 0 ? (x1 - x0) / length : 0;
    const uy = length > 0 ? (y1 - y0) / length : 1;
    const rotation = Math.atan2(uy, ux) - Math.PI / 2;
    for (let i = 0; i < Math.max(needed, columns.length); i++) {
      const dots = Math.min(COLUMN_DOTS, count - i * COLUMN_DOTS);
      if (dots <= 0) {
        columns[i]?.image.setVisible(false);
        continue;
      }
      const column = this.column(columns, i);
      if (column.dots !== dots) {
        column.dots = dots;
        column.image.setCrop(0, 0, DOT_SIDE_PX, DOT_SIDE_PX + (dots - 1) * DOT_STEP_PX);
      }
      const along = i * COLUMN_DOTS * AIM_DOT_SPACING;
      column.image
        .setPosition(x0 + ux * along, y0 + uy * along)
        .setRotation(rotation)
        .setTint(color)
        .setVisible(true);
    }
  }

  /** Hides the lines from `index` on. */
  private hideFrom(index: number): void {
    for (let i = index; i < this.lines.length; i++) {
      for (const column of this.lines[i] ?? []) column.image.setVisible(false);
    }
  }

  private hideRings(from: number): void {
    for (let i = from; i < this.rings.length; i++) this.rings[i]?.setVisible(false);
  }

  hide(): void {
    this.hideFrom(0);
    this.hideRings(0);
    this.ghost.setVisible(false);
  }

  /** Re-uploads the dots' texture after the WebGL context comes back. */
  restore(): void {
    (this.scene.textures.get(DOT_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }

  private ring(index: number): Phaser.GameObjects.Image {
    const existing = this.rings[index];
    if (existing) return existing;
    const ring = this.scene.add
      .image(0, 0, DOT_KEY)
      .setScale(1 / RING_PX_PER_UNIT)
      .setTint(KATANA_TARGET_COLOR)
      .setVisible(false);
    this.front.add(ring);
    this.rings.push(ring);
    return ring;
  }

  private column(columns: Column[], index: number): Column {
    const existing = columns[index];
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
    columns.push(column);
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
