/**
 * The stage's last cat shines (GAME_DESIGN §7.1 step 2): while it waits alone in the jar after a
 * stage clear, a soft gold halo pulses behind it, a sunburst of light rays turns slowly behind the
 * halo, and sparkles fly off its edge. When it pops, a big burst of light. Drawn behind the cats
 * (the glow layer); the halo and the rays are canvas textures made here, like the golden glow.
 */
import type Phaser from 'phaser';
import { GOLDEN_GLOW } from '../../config/skin';
import { LAST_CAT_GLOW, LAST_CAT_RAYS, LAST_CAT_SPARKS } from '../../config/view';
import type { BallView } from '../../physics/balls';
import type { SparkFx } from './SparkFx';

const HALO_KEY = 'fx-last-halo';
const RAYS_KEY = 'fx-last-rays';
/** Texture radius in pixels; both textures are squares twice this wide. */
const TEXTURE_PX = 256;
/** Sparkles spread evenly round the edge, each this far round from the last (radians). */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export class LastCatFx {
  private readonly halo: Phaser.GameObjects.Image;
  private readonly rays: Phaser.GameObjects.Image;
  private id = -1;
  private startMs = 0;
  private lastSparkMs = 0;
  /** Where the next sparkle leaves the cat's edge: each one a golden angle on from the last. */
  private sparkAngle = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly sparks: SparkFx,
    /** Scales particle counts (fewer with reduced motion). */
    private readonly particles: (count: number) => number,
    /** True with reduced motion: the rays hold still. */
    private readonly still: () => boolean,
  ) {
    makeTextures(scene.textures);
    this.rays = scene.add.image(0, 0, RAYS_KEY).setVisible(false).setBlendMode('ADD');
    this.halo = scene.add.image(0, 0, HALO_KEY).setVisible(false);
    layer.add([this.rays, this.halo]);
  }

  /** The last cat `id` was just made: it shines until it leaves the jar. */
  start(id: number, nowMs: number): void {
    this.id = id;
    this.startMs = nowMs;
    this.lastSparkMs = nowMs;
  }

  /** Follows the shining cat in `balls`; when it has popped, the final burst. */
  update(nowMs: number, balls: readonly BallView[], paused: boolean): void {
    if (this.id < 0) return;
    const cat = balls.find((b) => b.id === this.id);
    if (!cat) {
      this.burstAt(this.halo.x, this.halo.y);
      this.clear();
      return;
    }
    const t = nowMs - this.startMs;
    const appear = Math.min(1, t / LAST_CAT_GLOW.growMs);
    const ease = 1 - (1 - appear) * (1 - appear);
    const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / LAST_CAT_GLOW.pulseMs);
    const r = cat.targetRadius;
    const haloScale = ((r * LAST_CAT_GLOW.scale) / TEXTURE_PX) * ease * (1 + 0.06 * wave);
    this.halo
      .setVisible(true)
      .setPosition(cat.x, cat.y)
      .setScale(haloScale)
      .setAlpha(
        ease *
          (LAST_CAT_GLOW.alpha.min + (LAST_CAT_GLOW.alpha.max - LAST_CAT_GLOW.alpha.min) * wave),
      );
    const spin = this.still() ? 0 : (t / 1000) * LAST_CAT_RAYS.spinPerSecond;
    this.rays
      .setVisible(true)
      .setPosition(cat.x, cat.y)
      .setRotation(spin)
      .setScale(((r * LAST_CAT_RAYS.scale) / TEXTURE_PX) * ease)
      .setAlpha(ease * LAST_CAT_RAYS.alpha);
    if (paused || nowMs - this.lastSparkMs < LAST_CAT_SPARKS.everyMs) return;
    this.lastSparkMs = nowMs;
    // Sparkles leave from points on its edge.
    const count = this.particles(LAST_CAT_SPARKS.count);
    for (let i = 0; i < count; i++) {
      this.sparkAngle += GOLDEN_ANGLE;
      const a = this.sparkAngle;
      this.sparks.burst(cat.x + r * Math.cos(a), cat.y + r * Math.sin(a), 1);
    }
  }

  /** Stops shining at once (a new run, leaving the game). */
  clear(): void {
    this.id = -1;
    this.halo.setVisible(false);
    this.rays.setVisible(false);
  }

  private burstAt(x: number, y: number): void {
    this.sparks.burst(x, y, this.particles(LAST_CAT_SPARKS.pop));
  }
}

/** The halo (a soft gold disc fading out) and the rays (a sunburst fading out from the middle). */
function makeTextures(textures: Phaser.Textures.TextureManager): void {
  const side = 2 * TEXTURE_PX;
  if (!textures.exists(HALO_KEY)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(
        TEXTURE_PX,
        TEXTURE_PX,
        0,
        TEXTURE_PX,
        TEXTURE_PX,
        TEXTURE_PX,
      );
      g.addColorStop(0, 'rgba(255, 250, 220, 1)');
      g.addColorStop(0.45, GOLDEN_GLOW);
      g.addColorStop(1, 'rgba(255, 211, 77, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, side, side);
    }
    textures.addCanvas(HALO_KEY, canvas);
  }
  if (!textures.exists(RAYS_KEY)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(
        TEXTURE_PX,
        TEXTURE_PX,
        0,
        TEXTURE_PX,
        TEXTURE_PX,
        TEXTURE_PX,
      );
      g.addColorStop(0, 'rgba(255, 244, 194, 0.95)');
      g.addColorStop(0.5, 'rgba(255, 214, 107, 0.55)');
      g.addColorStop(1, 'rgba(255, 214, 107, 0)');
      ctx.fillStyle = g;
      const count = LAST_CAT_RAYS.count;
      const half = (Math.PI / count) * LAST_CAT_RAYS.width;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const a = (2 * Math.PI * i) / count;
        ctx.moveTo(TEXTURE_PX, TEXTURE_PX);
        ctx.arc(TEXTURE_PX, TEXTURE_PX, TEXTURE_PX, a - half, a + half);
        ctx.closePath();
      }
      ctx.fill();
    }
    textures.addCanvas(RAYS_KEY, canvas);
  }
}
