/**
 * The jar (GAME_DESIGN §13): glass in a bamboo frame on a wooden floor. Gold knobs on top of the
 * posts and a dashed line across the opening mark the rim, which is the danger line. Redrawn only
 * when its size or the danger flash changes. All lengths are world units, and every line is a
 * fraction of the jar's width, so the jar keeps its look while it grows.
 */
import type Phaser from 'phaser';
import {
  DANGER_RED,
  JAR_BAMBOO,
  JAR_BAMBOO_NODE,
  JAR_FLOOR,
  JAR_FLOOR_LINE,
  JAR_GLASS,
  JAR_GLASS_ALPHA,
  JAR_INK,
  JAR_RIM,
  JAR_RIM_LINE_ALPHA,
  JAR_SHADOW_ALPHA,
  JAR_SHEEN_ALPHA,
} from '../config/skin';
import {
  JAR_KNOB_RATIO,
  JAR_NODE_SPACING,
  JAR_OUTLINE_RATIO,
  JAR_RIM_RATIO,
  JAR_WALL_RATIO,
} from '../config/view';

/** The floor reaches this many jar widths to each side and jar heights down, past any frame. */
const FLOOR_REACH = 12;

export class JarView {
  private width = -1;
  private height = -1;
  private flash: boolean | null = null;

  constructor(
    private readonly back: Phaser.GameObjects.Graphics,
    private readonly front: Phaser.GameObjects.Graphics,
    private readonly rim: Phaser.GameObjects.Graphics,
  ) {}

  /** `danger` is null while safe, otherwise whether the flash is in its red phase. */
  draw(width: number, height: number, danger: boolean | null): void {
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.drawBox();
      this.flash = null;
      this.drawRim(danger);
    } else if (danger !== this.flash) {
      this.drawRim(danger);
    }
  }

  /** Floor and glass behind the cats; the bamboo frame and the glass sheen in front of them. */
  private drawBox(): void {
    const w = this.width;
    const h = this.height;
    const t = w * JAR_WALL_RATIO;
    const line = w * JAR_OUTLINE_RATIO;
    const half = w / 2;

    const back = this.back.clear();
    back.fillStyle(JAR_FLOOR, 1);
    back.fillRect(-FLOOR_REACH * w, t * 0.5, 2 * FLOOR_REACH * w, FLOOR_REACH * h);
    back.lineStyle(line, JAR_FLOOR_LINE, 1);
    back.lineBetween(-FLOOR_REACH * w, t * 2.6, FLOOR_REACH * w, t * 2.6);
    back.fillStyle(JAR_INK, JAR_SHADOW_ALPHA);
    back.fillEllipse(0, t * 1.1, w + 4 * t, t * 1.2);
    back.fillStyle(JAR_GLASS, JAR_GLASS_ALPHA);
    back.fillRect(-half, -h, w, h);

    const g = this.front.clear();
    // A soft sheen on the glass near the left wall.
    g.fillStyle(0xffffff, JAR_SHEEN_ALPHA);
    g.fillRoundedRect(-half + t * 0.7, -h + t, t * 0.42, h * 0.48, t * 0.21);
    g.fillRoundedRect(-half + t * 0.7, -h * 0.47, t * 0.42, h * 0.06, t * 0.21);

    // Bamboo posts from the rim down to the floor beam, with their nodes.
    for (const x of [-half - t, half]) {
      g.fillStyle(JAR_BAMBOO, 1);
      g.fillRoundedRect(x, -h, t, h + t, t / 2);
      g.lineStyle(line, JAR_INK, 1);
      g.strokeRoundedRect(x, -h, t, h + t, t / 2);
      for (let y = -h + h * JAR_NODE_SPACING * 0.6; y < -t; y += h * JAR_NODE_SPACING) {
        g.fillStyle(JAR_BAMBOO_NODE, 1);
        g.fillRect(x, y, t, t * 0.32);
        g.lineBetween(x, y, x + t, y);
      }
    }
    // The floor beam across the bottom, with two nodes.
    g.fillStyle(JAR_BAMBOO, 1);
    g.fillRoundedRect(-half - t, 0, w + 2 * t, t, t / 2);
    g.lineStyle(line, JAR_INK, 1);
    g.strokeRoundedRect(-half - t, 0, w + 2 * t, t, t / 2);
    for (const x of [-w * 0.22, w * 0.22]) {
      g.fillStyle(JAR_BAMBOO_NODE, 1);
      g.fillRect(x, 0, t * 0.32, t);
      g.lineBetween(x, 0, x, t);
    }
  }

  private drawRim(danger: boolean | null): void {
    this.flash = danger;
    const w = this.width;
    const h = this.height;
    const t = w * JAR_WALL_RATIO;
    const knob = w * JAR_KNOB_RATIO;
    const line = w * JAR_RIM_RATIO;
    const half = w / 2;
    const color = danger ? DANGER_RED : JAR_RIM;

    // Gold knobs on the posts (red while the danger flash is on).
    const g = this.rim.clear();
    for (const x of [-half - t / 2, half + t / 2]) {
      g.fillStyle(color, 1);
      g.fillCircle(x, -h, knob);
      g.lineStyle(w * JAR_OUTLINE_RATIO, JAR_INK, 1);
      g.strokeCircle(x, -h, knob);
    }

    // The dashed danger line across the opening.
    const dash = w * 0.024;
    const lineColor = danger === null ? JAR_INK : DANGER_RED;
    const alpha = danger ? 1 : danger === false ? 0.6 : JAR_RIM_LINE_ALPHA;
    g.lineStyle(line * (danger === null ? 1 : 1.4), lineColor, alpha);
    for (let x = -half + dash * 0.5; x < half; x += dash * 1.9) {
      g.lineBetween(x, -h, Math.min(x + dash, half), -h);
    }
  }
}
