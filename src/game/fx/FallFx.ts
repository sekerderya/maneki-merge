/**
 * Heavy Drop's look (GAME_DESIGN §15.9), visual only: a falling ball trails speed lines (the way it
 * came) and, from HEAVY_FLAME_LEVEL, sheds embers; Heavy Drop's top level lands in a burst of fire
 * sparks (the scene adds the shake). The owner's flame art takes the lines' place once it comes
 * (docs/ART_ASSETS.md §4.12). Pooled images of one small canvas texture, behind the balls, so
 * nothing is allocated per frame once the pool has warmed up.
 */
import type Phaser from 'phaser';
import { HEAVY_FLAME_LEVEL } from '../../config/picks';
import { HEAVY_TRAIL_TINT } from '../../config/skin';
import { HEAVY_TRAIL } from '../../config/view';
import type { BallView } from '../../physics/balls';
import type { SparkFx } from './SparkFx';

const LINE_KEY = 'fx-speed-line';
const LINE_W = 8;
const LINE_H = 128;

export class FallFx {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private lastEmberMs = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly sparks: SparkFx,
    private readonly particles: (count: number) => number,
  ) {
    createLineTexture(scene.textures);
  }

  /** Draws the trails of the falling balls at Heavy Drop's `level` (0: none). */
  update(nowMs: number, balls: readonly BallView[], level: number, paused: boolean): void {
    let used = 0;
    const ember =
      !paused && level >= HEAVY_FLAME_LEVEL && nowMs - this.lastEmberMs >= HEAVY_TRAIL.emberMs;
    if (ember) this.lastEmberMs = nowMs;
    if (level > 0) {
      for (const ball of balls) {
        if (ball.landedMs >= 0 || ball.speed < HEAVY_TRAIL.minSpeed) continue;
        // The way it came: back along its velocity, from its trailing edge.
        const ux = -ball.vx / ball.speed;
        const uy = -ball.vy / ball.speed;
        const length = Math.min(HEAVY_TRAIL.maxLength, HEAVY_TRAIL.lengthPerSpeed * ball.speed);
        // The texture is brightest at its bottom: that end goes to the ball.
        const angle = Math.atan2(ux, -uy);
        const middle = (HEAVY_TRAIL.lines - 1) / 2;
        for (let i = 0; i < HEAVY_TRAIL.lines; i++) {
          // Spread across the ball, the middle one longest.
          const side = ((i - middle) / Math.max(1, middle)) * 0.6 * ball.radius;
          const long = (i === middle ? 1 : 0.7) * length;
          const back = ball.radius * 0.6 + long / 2;
          this.line(used++)
            .setPosition(ball.x - uy * side + ux * back, ball.y + ux * side + uy * back)
            .setRotation(angle)
            .setScale(HEAVY_TRAIL.width / LINE_W, long / LINE_H)
            .setAlpha(HEAVY_TRAIL.alpha);
        }
        if (ember) {
          const r = ball.radius * 0.8;
          this.sparks.embers(ball.x + ux * r, ball.y + uy * r, this.particles(2));
        }
      }
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }

  /** Heavy Drop's top level landed at (x, y): a burst of fire sparks. */
  landing(x: number, y: number): void {
    this.sparks.fireBurst(x, y, this.particles(HEAVY_TRAIL.landingSparks));
  }

  clear(): void {
    for (const line of this.pool) line.setVisible(false);
  }

  private line(index: number): Phaser.GameObjects.Image {
    let line = this.pool[index];
    if (!line) {
      line = this.scene.add.image(0, 0, LINE_KEY).setTint(HEAVY_TRAIL_TINT);
      this.layer.add(line);
      this.pool.push(line);
    }
    return line.setVisible(true);
  }
}

/** A soft streak, clear at its far end (the top) and brightest at the ball. */
function createLineTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(LINE_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = LINE_W;
  canvas.height = LINE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const fade = ctx.createLinearGradient(0, 0, 0, LINE_H);
  fade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  fade.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
  ctx.fillStyle = fade;
  ctx.beginPath();
  ctx.roundRect(1, 0, LINE_W - 2, LINE_H, (LINE_W - 2) / 2);
  ctx.fill();
  textures.addCanvas(LINE_KEY, canvas);
}
