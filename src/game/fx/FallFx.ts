/**
 * Heavy Drop's look (GAME_DESIGN §15.9), visual only: a falling ball trails speed lines (the way it
 * came); from HEAVY_FLAME_LEVEL it burns in the owner's small flame (docs/ART_ASSETS.md §4.12) and
 * sheds embers, and at HEAVY_FIREBALL_LEVEL it comes down in the big fireball, whose round head
 * sits under the ball and whose flames trail back along its path. Heavy Drop's top level lands in
 * a burst of fire sparks (the scene adds the shake). Without the flame art the speed lines stay at
 * every level. Pooled images, behind the balls, so nothing is allocated per frame once the pools
 * have warmed up.
 */
import type Phaser from 'phaser';
import { FX_ART } from '../../config/fxSprites';
import { HEAVY_FIREBALL_LEVEL, HEAVY_FLAME_LEVEL } from '../../config/picks';
import { HEAVY_TRAIL_TINT } from '../../config/skin';
import { HEAVY_FLAME, HEAVY_TRAIL } from '../../config/view';
import type { BallView } from '../../physics/balls';
import { imageCanvas } from '../artImages';
import type { SparkFx } from './SparkFx';

const LINE_KEY = 'fx-speed-line';
const LINE_W = 8;
const LINE_H = 128;
const FLAME_KEY = 'fx-flame-';

export class FallFx {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly flamePool: Phaser.GameObjects.Image[] = [];
  private lastEmberMs = -Infinity;
  /** How many flames the art has (0 without it). */
  private readonly flameCount: number;

  /** `flames`: the owner's flame images (ArtImages.fx.flames), or null to keep the lines. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly sparks: SparkFx,
    private readonly particles: (count: number) => number,
    flames: readonly HTMLImageElement[] | null = null,
  ) {
    createLineTexture(scene.textures);
    const images = flames ?? [];
    images.forEach((image, i) => {
      if (!scene.textures.exists(FLAME_KEY + i)) {
        scene.textures.addCanvas(FLAME_KEY + i, imageCanvas(image));
      }
    });
    this.flameCount = Math.min(images.length, FX_ART.flames.length);
  }

  /** Draws the trails of the falling balls at Heavy Drop's `level` (0: none). */
  update(nowMs: number, balls: readonly BallView[], level: number, paused: boolean): void {
    let used = 0;
    let burning = 0;
    const ember =
      !paused && level >= HEAVY_FLAME_LEVEL && nowMs - this.lastEmberMs >= HEAVY_TRAIL.emberMs;
    if (ember) this.lastEmberMs = nowMs;
    // The small flame from HEAVY_FLAME_LEVEL, the big fireball at the top level.
    const flame = level >= HEAVY_FIREBALL_LEVEL ? 1 : level >= HEAVY_FLAME_LEVEL ? 0 : -1;
    const sprite = flame >= 0 && flame < this.flameCount ? FX_ART.flames[flame] : undefined;
    if (level > 0) {
      for (const ball of balls) {
        if (ball.landedMs >= 0 || ball.speed < HEAVY_TRAIL.minSpeed) continue;
        // The way it came: back along its velocity, from its trailing edge.
        const ux = -ball.vx / ball.speed;
        const uy = -ball.vy / ball.speed;
        // The textures' top goes the way it came (lines: brightest at the bottom, flames: the
        // head at the bottom).
        const angle = Math.atan2(ux, -uy);
        if (ember) {
          const r = ball.radius * 0.8;
          this.sparks.embers(ball.x + ux * r, ball.y + uy * r, this.particles(2));
        }
        if (sprite) {
          const share: readonly number[] = HEAVY_FLAME.headShare;
          const scale = ((share[flame] ?? 1) * ball.radius) / sprite.headR;
          const swing = Math.sin((2 * Math.PI * nowMs) / HEAVY_FLAME.flickerMs + ball.id);
          this.flame(burning++, flame)
            .setOrigin(sprite.headX / sprite.width, sprite.headY / sprite.height)
            .setPosition(ball.x, ball.y)
            .setRotation(angle)
            .setScale(scale, scale * (1 + HEAVY_FLAME.flicker * swing));
          continue;
        }
        const length = Math.min(HEAVY_TRAIL.maxLength, HEAVY_TRAIL.lengthPerSpeed * ball.speed);
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
      }
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
    for (let i = burning; i < this.flamePool.length; i++) this.flamePool[i]!.setVisible(false);
  }

  /** Heavy Drop's top level landed at (x, y): a burst of fire sparks. */
  landing(x: number, y: number): void {
    this.sparks.fireBurst(x, y, this.particles(HEAVY_TRAIL.landingSparks));
  }

  clear(): void {
    for (const line of this.pool) line.setVisible(false);
    for (const flame of this.flamePool) flame.setVisible(false);
  }

  /** Re-uploads the textures after the WebGL context comes back. */
  restore(): void {
    const keys = [LINE_KEY, ...Array.from({ length: this.flameCount }, (_, i) => FLAME_KEY + i)];
    for (const key of keys) {
      if (this.scene.textures.exists(key)) {
        (this.scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
      }
    }
  }

  private flame(index: number, which: number): Phaser.GameObjects.Image {
    let image = this.flamePool[index];
    if (!image) {
      image = this.scene.add.image(0, 0, FLAME_KEY + which);
      this.layer.add(image);
      this.flamePool.push(image);
    }
    if (image.texture.key !== FLAME_KEY + which) image.setTexture(FLAME_KEY + which);
    return image.setVisible(true);
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
