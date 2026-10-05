/**
 * Gold sparks: along the rim when the shrine grows (GAME_DESIGN §7.1), and bursts for golden
 * merges and Jackpots. Two pooled Phaser particle emitters in stage-1 units; each emitter's scale
 * is set to the stage's, so sparks look the same at every zoom. M9 adds the rest of the polish.
 */
import type Phaser from 'phaser';
import { BURST_SPARKS, EXPANSION_SPARKS } from '../../config/view';

const SPARK_KEY = 'fx-spark';
const SPARK_PX = 64;

const SPARK_TINTS = [0xfff4c2, 0xf6c343, 0xffd36b, 0xffffff];

export class SparkFx {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bursts: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    createSparkTexture(scene.textures);
    this.emitter = scene.add.particles(0, 0, SPARK_KEY, {
      emitting: false,
      lifespan: { ...EXPANSION_SPARKS.lifespanMs },
      speed: { ...EXPANSION_SPARKS.speed },
      // Phaser angles: 270° is straight up.
      angle: { min: 240, max: 300 },
      gravityY: EXPANSION_SPARKS.gravity,
      scale: { start: EXPANSION_SPARKS.scale, end: 0 },
      alpha: { start: 1, end: 0.2 },
      tint: SPARK_TINTS,
      blendMode: 'ADD',
    });
    this.bursts = scene.add.particles(0, 0, SPARK_KEY, {
      emitting: false,
      lifespan: { ...BURST_SPARKS.lifespanMs },
      speed: { ...BURST_SPARKS.speed },
      angle: { min: 0, max: 360 },
      gravityY: BURST_SPARKS.gravity,
      scale: { start: BURST_SPARKS.scale, end: 0 },
      alpha: { start: 1, end: 0.2 },
      tint: SPARK_TINTS,
      blendMode: 'ADD',
    });
    layer.add([this.emitter, this.bursts]);
  }

  /** A round burst of `count` sparks at a world point of a stage with `scale`. */
  burst(x: number, y: number, count: number, scale: number): void {
    this.bursts.setScale(scale);
    this.bursts.emitParticleAt(x / scale, y / scale, count);
  }

  /** Sparks along a rim `width` wide at height `rimY` (world units) of a stage with `scale`. */
  rim(width: number, rimY: number, scale: number): void {
    this.emitter.setScale(scale);
    const half = width / 2 / scale;
    const y = rimY / scale;
    const count = EXPANSION_SPARKS.count;
    for (let i = 0; i < count; i++) {
      const x = -half + (2 * half * (i + 0.5)) / count;
      this.emitter.emitParticleAt(x, y, 1);
    }
  }

  pause(): void {
    this.emitter.pause();
    this.bursts.pause();
  }

  resume(): void {
    this.emitter.resume();
    this.bursts.resume();
  }

  clear(): void {
    for (const emitter of [this.emitter, this.bursts]) {
      emitter.killAll();
      emitter.resume();
    }
  }
}

/** A soft round glow with a bright centre; tinted per spark. */
function createSparkTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(SPARK_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = SPARK_PX;
  canvas.height = SPARK_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const c = SPARK_PX / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glow.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)');
  glow.addColorStop(0.6, 'rgba(255, 255, 255, 0.25)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SPARK_PX, SPARK_PX);
  textures.addCanvas(SPARK_KEY, canvas);
}
