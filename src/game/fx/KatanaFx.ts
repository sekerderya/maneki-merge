/**
 * The Katana (GAME_DESIGN §15.16) on screen. In the paw the sword hangs point down (`hold`). Dropped,
 * a swoosh flashes at the paw and the sword shoots down its line, drawn from the run's fall
 * (RunController.katana) so a pause freezes it, with a streak of light from where its blade started
 * to its point and a glint on the point; More Blades' swords come in along their own lines. Every
 * ball it cuts splits in two along the cut (`cut`): the halves of the ball's own sprite slide apart
 * and fade under a cut flash. When the points reach the ends of their lines (`landed`), each strikes
 * with a burst of sparks and a soft flash, sticks there a moment and fades with its streak.
 *
 * A half shows its ball's art cropped down the middle, so the art must lie across or along the cut:
 * the ball's picture turns to the nearest such angle as it splits (at most 45°, under the flash). The
 * light is drawn with SCREEN, like Lightning's (LightningFx). Pooled images, no allocations per
 * frame once warm.
 */
import type Phaser from 'phaser';
import type { BladeLine } from '../../config/picks';
import { KATANA_SPARKS } from '../../config/skin';
import { KATANA_FX } from '../../config/view';
import { PHYSICS_STEP_MS } from '../../config/physics';
import { bladePoint } from '../../physics/katana';
import type { KatanaView } from '../../run/RunController';
import type { BallRenderer } from '../BallRenderer';
import { refreshKatanaFrames } from './katanaFrames';
import type { KatanaFrames } from './katanaFrames';
import type { BoltFrame, RoundFrame } from './lightningFrames';
import type { SparkFx } from './SparkFx';

/** A cut ball's half, sliding away from the other. */
interface Half {
  readonly image: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  /** Which way it slides (a unit vector), and which way it turns (±1). */
  readonly dx: number;
  readonly dy: number;
  readonly turn: number;
  readonly rotation: number;
  readonly radius: number;
  readonly startMs: number;
}

/** A light that goes off once and fades: a cut flash, a swoosh, a strike or a soft flash. */
interface Burst {
  readonly frame: RoundFrame;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  /** World units across its frame's radius. */
  readonly size: number;
  /** Where on its texture it sits (the strike's sparks fly up from its bottom). */
  readonly originY: number;
  readonly startMs: number;
  readonly ms: number;
  /** It grows from this share of its size as it fades. */
  readonly from: number;
}

/** Swords that reached the ends of their lines and stick there. */
interface Landing {
  readonly blades: readonly BladeLine[];
  /** The first sword's point when it left the paw (it is drawn from there). */
  readonly startTipY: number;
  readonly startMs: number;
}

/** The strike's sparks fly up from this share of its texture's height. */
const STRIKE_ORIGIN_Y = 0.92;

export class KatanaFx {
  private readonly swords: Phaser.GameObjects.Image[] = [];
  private usedSwords = 0;
  private readonly lights: Phaser.GameObjects.Image[] = [];
  private usedLights = 0;
  private readonly halves: Half[] = [];
  private readonly spareHalves: Phaser.GameObjects.Image[] = [];
  private readonly bursts: Burst[] = [];
  private readonly landings: Landing[] = [];
  /** The sword in the paw this frame: where its hilt's end is and how big it is, or null. */
  private held: { x: number; topY: number; scale: number } | null = null;
  /** The falling first sword's point when it left the paw. */
  private startTipY = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    /** The cut balls' halves, among the balls. */
    private readonly bodies: Phaser.GameObjects.Layer,
    /** The swords, over the balls. */
    private readonly front: Phaser.GameObjects.Layer,
    /** The light: streaks, flashes and sparks. */
    private readonly glowLayer: Phaser.GameObjects.Layer,
    private readonly balls: BallRenderer,
    private readonly sparks: SparkFx,
    private readonly frames: KatanaFrames,
    /** Scales particle counts (fewer with reduced motion). */
    private readonly particles: (count: number) => number,
  ) {}

  /** The sword hangs in the paw this frame, its hilt's end at (x, topY), `scale` of its size. */
  hold(x: number, topY: number, scale: number): void {
    this.held = { x, topY, scale };
  }

  /** Where the held sword's point is now (where the falling one starts from). */
  private heldTipY(): number {
    const held = this.held;
    return held ? held.topY + KATANA_FX.heldLength * held.scale : 0;
  }

  /** The katana left the paw at (x, y): a swoosh there. */
  dropped(nowMs: number, x: number, y: number): void {
    this.startTipY = this.held ? this.heldTipY() : y;
    const frame = this.frames.swoosh;
    this.burst(frame, x, y, 0, KATANA_FX.swooshSize, 0.5, nowMs, KATANA_FX.swooshMs, 0.7);
  }

  /**
   * The ball `id` was cut along `angle` (radians, the blade's way): its sprite splits in two, a cut
   * flash goes off along the cut and sparks fly.
   */
  cut(nowMs: number, id: number, angle: number, x: number, y: number, radius: number): void {
    const sprite = this.balls.detach(id);
    if (sprite) {
      this.split(nowMs, sprite.body, angle, radius);
      this.balls.recycle(sprite);
    }
    // The flash's line runs from its lower left to its upper right.
    const flash = this.frames.flash;
    const size = (KATANA_FX.flashScale * radius) / 2;
    this.burst(flash, x, y, angle + Math.PI / 4, size, 0.5, nowMs, KATANA_FX.flashMs, 0.8);
    this.sparks.mergeBurst(x, y, this.particles(KATANA_FX.cutSparks), KATANA_SPARKS);
  }

  /** The points reached the ends of their lines: each strikes the floor or a wall and sticks. */
  landed(nowMs: number, blades: readonly BladeLine[]): void {
    this.landings.push({ blades, startTipY: this.startTipY, startMs: nowMs });
    const fx = KATANA_FX;
    for (const blade of blades) {
      const { x1, y1 } = blade;
      // The strike's sparks fly back up the blade's line.
      const up = Math.atan2(-(blade.x1 - blade.x0), blade.y1 - blade.y0);
      this.burst(
        this.frames.strike,
        x1,
        y1,
        up,
        fx.strikeSize,
        STRIKE_ORIGIN_Y,
        nowMs,
        fx.strikeMs,
        0.6,
      );
      this.burst(this.frames.glow, x1, y1, 0, fx.glowSize, 0.5, nowMs, fx.glowMs, 0.5);
    }
  }

  /** Draws the frame: the held sword, the falling ones (`view`), the landed ones and the lights. */
  update(nowMs: number, view: KatanaView | null, alpha: number): void {
    this.usedSwords = 0;
    this.usedLights = 0;
    const held = this.held;
    if (held) {
      this.sword(
        held.x,
        held.topY + KATANA_FX.heldLength * held.scale,
        0,
        1,
        KATANA_FX.heldLength * held.scale,
        1,
      );
    }
    this.held = null;
    if (view) this.drawFall(view, alpha);
    this.drawLandings(nowMs);
    this.drawHalves(nowMs);
    this.drawBursts(nowMs);
    for (let i = this.usedSwords; i < this.swords.length; i++) {
      (this.swords[i] as Phaser.GameObjects.Image).setVisible(false);
    }
    for (let i = this.usedLights; i < this.lights.length; i++) {
      (this.lights[i] as Phaser.GameObjects.Image).setVisible(false);
    }
  }

  /** Uploads the textures again after the WebGL context comes back. */
  restore(): void {
    refreshKatanaFrames(this.scene.textures, this.frames);
  }

  clear(): void {
    this.held = null;
    this.landings.length = 0;
    this.bursts.length = 0;
    for (const half of this.halves) this.spareHalves.push(half.image.setVisible(false));
    this.halves.length = 0;
    for (const image of [...this.swords, ...this.lights]) image.setVisible(false);
  }

  /** The falling swords, between the run's last two ticks. */
  private drawFall(view: KatanaView, alpha: number): void {
    const elapsed = Math.max(0, view.elapsedMs - PHYSICS_STEP_MS * (1 - alpha));
    const t = Math.min(1, elapsed / view.fallMs);
    view.blades.forEach((blade, i) => {
      const enter = i === 0 ? 1 : Math.min(1, elapsed / KATANA_FX.enterMs);
      const tip = this.tipAt(blade, i, t, this.startTipY);
      const startY = i === 0 ? Math.min(this.startTipY, blade.y0) : blade.y0;
      this.streak(blade.x0, startY, tip.x, tip.y, KATANA_FX.streakAlpha * enter);
      const { dx, dy } = direction(blade);
      this.sword(tip.x, tip.y, dx, dy, KATANA_FX.length, enter);
      this.light(this.frames.glint, tip.x, tip.y, 0, KATANA_FX.glintSize, 0.5, enter);
    });
  }

  /** The point of blade `i` at `t`: the first sword comes from where it hung in the paw. */
  private tipAt(
    blade: BladeLine,
    i: number,
    t: number,
    startTipY: number,
  ): { x: number; y: number } {
    if (i > 0) return bladePoint(blade, t);
    const y0 = Math.max(startTipY, blade.y0);
    return { x: blade.x0, y: y0 + (blade.y1 - y0) * t };
  }

  /** Landed swords stick in the floor and fade; their streaks fade first. */
  private drawLandings(nowMs: number): void {
    const fx = KATANA_FX;
    for (let n = this.landings.length - 1; n >= 0; n--) {
      const landing = this.landings[n] as Landing;
      const age = nowMs - landing.startMs;
      if (age >= fx.stickMs) {
        this.landings.splice(n, 1);
        continue;
      }
      const stick = Math.min(1, (fx.stickMs - age) / fx.fadeMs);
      const streak = Math.max(0, 1 - age / fx.streakFadeMs);
      landing.blades.forEach((blade, i) => {
        const startY = i === 0 ? Math.min(landing.startTipY, blade.y0) : blade.y0;
        if (streak > 0) this.streak(blade.x0, startY, blade.x1, blade.y1, fx.streakAlpha * streak);
        const { dx, dy } = direction(blade);
        this.sword(blade.x1, blade.y1, dx, dy, fx.length, stick);
      });
    }
  }

  private drawHalves(nowMs: number): void {
    const fx = KATANA_FX;
    for (let n = this.halves.length - 1; n >= 0; n--) {
      const half = this.halves[n] as Half;
      const t = (nowMs - half.startMs) / fx.splitMs;
      if (t >= 1) {
        this.spareHalves.push(half.image.setVisible(false));
        this.halves.splice(n, 1);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      const away = fx.splitDistance * half.radius * ease;
      half.image
        .setPosition(half.x + half.dx * away, half.y + half.dy * away)
        .setRotation(half.rotation + half.turn * fx.splitTurn * ease)
        .setAlpha(1 - t * t);
    }
  }

  private drawBursts(nowMs: number): void {
    for (let n = this.bursts.length - 1; n >= 0; n--) {
      const b = this.bursts[n] as Burst;
      const t = (nowMs - b.startMs) / b.ms;
      if (t >= 1) {
        this.bursts.splice(n, 1);
        continue;
      }
      const grow = b.from + (1 - b.from) * (1 - (1 - t) * (1 - t));
      this.light(b.frame, b.x, b.y, b.rotation, b.size * grow, b.originY, 1 - t);
    }
  }

  /**
   * The ball's picture `body` in two halves, cut along `angle`: the picture turns to the nearest
   * angle at which the cut lies along or across it, so each half is a crop of its texture.
   */
  private split(
    nowMs: number,
    body: Phaser.GameObjects.Image,
    angle: number,
    radius: number,
  ): void {
    const quarter = Math.PI / 2;
    const steps = Math.round((body.rotation - angle) / quarter);
    const rotation = angle + steps * quarter;
    // An even turn lays the cut along the picture's x axis: top and bottom halves; odd: left, right.
    const across = steps % 2 === 0;
    const { width: w, height: h } = body.frame;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (const side of [-1, 1]) {
      const image = this.spareHalves.pop() ?? this.newHalf();
      image
        .setTexture(body.texture.key, body.frame.name)
        .setVisible(true)
        .setAlpha(1)
        .setOrigin(body.originX, body.originY)
        .setScale(body.scaleX, body.scaleY)
        .setPosition(body.x, body.y)
        .setRotation(rotation);
      if (across) image.setCrop(0, side < 0 ? 0 : h / 2, w, h / 2);
      else image.setCrop(side < 0 ? 0 : w / 2, 0, w / 2, h);
      // The half's way out, from the picture's own axes to the world's.
      const lx = across ? 0 : side;
      const ly = across ? side : 0;
      this.bodies.bringToTop(image);
      this.halves.push({
        image,
        x: body.x,
        y: body.y,
        dx: cos * lx - sin * ly,
        dy: sin * lx + cos * ly,
        turn: side,
        rotation,
        radius,
        startMs: nowMs,
      });
    }
  }

  private newHalf(): Phaser.GameObjects.Image {
    const image = this.scene.add.image(0, 0, '__DEFAULT');
    this.bodies.add(image);
    return image;
  }

  /** A sword with its point at (x, y), pointing along (dx, dy), `length` long. */
  private sword(x: number, y: number, dx: number, dy: number, length: number, alpha: number): void {
    const frame = this.frames.sword;
    let image = this.swords[this.usedSwords];
    if (!image) {
      image = this.scene.add.image(0, 0, frame.key);
      this.front.add(image);
      this.swords.push(image);
    }
    this.usedSwords++;
    const ax = frame.tipX - frame.topX;
    const ay = frame.tipY - frame.topY;
    const turn = Math.atan2(dy, dx) - Math.atan2(ay, ax);
    image
      .setVisible(true)
      .setOrigin(frame.tipX / image.width, frame.tipY / image.height)
      .setPosition(x, y)
      .setRotation(turn)
      .setScale(length / Math.hypot(ax, ay))
      .setAlpha(alpha);
  }

  /** A streak of light from (x0, y0) to (x1, y1). */
  private streak(x0: number, y0: number, x1: number, y1: number, alpha: number): void {
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (length < 1) return;
    const frame = this.frames.slashes[0] as BoltFrame;
    const image = this.lightImage(frame.key);
    const tx = frame.bx - frame.ax;
    const ty = frame.by - frame.ay;
    image
      .setOrigin(frame.ax / image.width, frame.ay / image.height)
      .setPosition(x0, y0)
      .setRotation(Math.atan2(y1 - y0, x1 - x0) - Math.atan2(ty, tx))
      .setScale(length / Math.hypot(tx, ty), KATANA_FX.streakBand / frame.band)
      .setAlpha(alpha);
  }

  /** A round light `size` world units across its frame's radius. */
  private light(
    frame: RoundFrame,
    x: number,
    y: number,
    rotation: number,
    size: number,
    originY: number,
    alpha: number,
  ): void {
    this.lightImage(frame.key)
      .setOrigin(0.5, originY)
      .setPosition(x, y)
      .setRotation(rotation)
      .setScale(size / frame.radius)
      .setAlpha(alpha);
  }

  private burst(
    frame: RoundFrame,
    x: number,
    y: number,
    rotation: number,
    size: number,
    originY: number,
    startMs: number,
    ms: number,
    from: number,
  ): void {
    this.bursts.push({ frame, x, y, rotation, size, originY, startMs, ms, from });
  }

  /** The next pooled light, shown with `key`, drawn with SCREEN. */
  private lightImage(key: string): Phaser.GameObjects.Image {
    let image = this.lights[this.usedLights];
    if (!image) {
      image = this.scene.add.image(0, 0, key).setBlendMode('SCREEN');
      this.glowLayer.add(image);
      this.lights.push(image);
    }
    this.usedLights++;
    if (image.texture.key !== key) image.setTexture(key);
    return image.setVisible(true);
  }
}

/** A blade's way down its line, as a unit vector. */
function direction(blade: BladeLine): { dx: number; dy: number } {
  const dx = blade.x1 - blade.x0;
  const dy = blade.y1 - blade.y0;
  const length = Math.hypot(dx, dy) || 1;
  return { dx: dx / length, dy: dy / length };
}
