/**
 * Sparks and particles: gold along the rim when the shrine grows and again when the new jar is
 * revealed (GAME_DESIGN §7.1), gold bursts for golden merges and Jackpots, and a burst in the new
 * cat's colour for every merge (§12). Three pooled Phaser particle emitters in stage-1 units; each
 * emitter's scale is set to the stage's, so particles look the same at every zoom.
 */
import type Phaser from 'phaser';
import { BURST_SPARKS, EXPANSION_SPARKS, MERGE_PARTICLES } from '../../config/view';

const SPARK_KEY = 'fx-spark';
const SPARK_PX = 64;

const SPARK_TINTS = [0xfff4c2, 0xf6c343, 0xffd36b, 0xffffff];

export class SparkFx {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bursts: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly merges: Phaser.GameObjects.Particles.ParticleEmitter;

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
    this.merges = scene.add.particles(0, 0, SPARK_KEY, {
      emitting: false,
      lifespan: { ...MERGE_PARTICLES.lifespanMs },
      speed: { ...MERGE_PARTICLES.speed },
      angle: { min: 0, max: 360 },
      gravityY: MERGE_PARTICLES.gravity,
      scale: { start: MERGE_PARTICLES.scale, end: 0 },
      alpha: { start: 1, end: 0 },
    });
    layer.add([this.merges, this.emitter, this.bursts]);
  }

  /** A burst of `count` particles tinted `color` at a world point of a stage with `scale`. */
  mergeBurst(x: number, y: number, count: number, color: number, scale: number): void {
    this.merges.setScale(scale);
    this.merges.setParticleTint(color);
    this.merges.emitParticleAt(x / scale, y / scale, count);
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
    for (const emitter of this.all()) emitter.pause();
  }

  resume(): void {
    for (const emitter of this.all()) emitter.resume();
  }

  clear(): void {
    for (const emitter of this.all()) {
      emitter.killAll();
      emitter.resume();
    }
  }

  private all(): Phaser.GameObjects.Particles.ParticleEmitter[] {
    return [this.emitter, this.bursts, this.merges];
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
