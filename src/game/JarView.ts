/**
 * The jar (a simple rounded wooden box, GAME_DESIGN §13.1) and its rim, which is the danger line.
 * Redrawn only when its size or the danger flash changes. All lengths are world units.
 */
import type Phaser from 'phaser';
import {
  DANGER_RED,
  JAR_INTERIOR,
  JAR_INTERIOR_ALPHA,
  JAR_RIM,
  JAR_WOOD,
  JAR_WOOD_DARK,
} from '../config/skin';
import { JAR_CORNER_RATIO, JAR_RIM_RATIO, JAR_WALL_RATIO } from '../config/view';

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

  /** Interior behind the cats; walls and floor in front of them. */
  private drawBox(): void {
    const w = this.width;
    const h = this.height;
    const t = w * JAR_WALL_RATIO;
    const half = w / 2;
    const corner = w * JAR_CORNER_RATIO;

    const back = this.back.clear();
    back.fillStyle(JAR_INTERIOR, JAR_INTERIOR_ALPHA);
    back.fillRect(-half, -h, w, h);

    const g = this.front.clear();
    g.fillStyle(JAR_WOOD, 1);
    g.fillRect(-half - t, -h, t, h);
    g.fillRect(half, -h, t, h);
    g.fillRoundedRect(-half - t, -t * 0.01, w + 2 * t, t, { tl: 0, tr: 0, bl: corner, br: corner });
    // Inner edges: a darker line where the wood meets the inside.
    g.lineStyle(t * 0.18, JAR_WOOD_DARK, 1);
    g.lineBetween(-half, -h, -half, 0);
    g.lineBetween(half, -h, half, 0);
    g.lineBetween(-half, 0, half, 0);
    // Wood grain: a lighter stripe down each wall.
    g.lineStyle(t * 0.14, 0xffffff, 0.12);
    g.lineBetween(-half - t * 0.55, -h + t, -half - t * 0.55, -t * 0.4);
    g.lineBetween(half + t * 0.45, -h + t, half + t * 0.45, -t * 0.4);
  }

  private drawRim(danger: boolean | null): void {
    this.flash = danger;
    const w = this.width;
    const h = this.height;
    const t = w * JAR_WALL_RATIO;
    const lip = w * JAR_RIM_RATIO;
    const half = w / 2;
    // The rim lips sit on the walls; the dashed line across the opening is the danger line.
    const g = this.rim.clear();
    const color = danger ? DANGER_RED : JAR_RIM;
    g.fillStyle(color, 1);
    g.fillRoundedRect(-half - t - lip, -h - lip, t + 2 * lip, 2 * lip, lip);
    g.fillRoundedRect(half - lip, -h - lip, t + 2 * lip, 2 * lip, lip);

    const dash = w * 0.03;
    const alpha = danger ? 0.95 : danger === false ? 0.6 : 0.35;
    g.lineStyle(lip * (danger === null ? 0.6 : 1), color, alpha);
    for (let x = -half + dash * 0.5; x < half; x += dash * 2) {
      g.lineBetween(x, -h, Math.min(x + dash, half), -h);
    }
  }
}
