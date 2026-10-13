/**
 * A lightning strike (GAME_DESIGN §15.15), drawn from the run's strike (RunController.lightning)
 * while it holds time still: a white flash, a bolt comes down from the sky onto the lightning
 * ball, and bolts chain from it to every struck ball, each link reaching its ball a moment after the
 * one before (strikeChain) and flickering between shapes; where a link lands a flash and a ring go
 * off, and crackles cover the ball. When the struck balls pop (`discharge`), sparks fly from each
 * (and the art's burst of sparks grows and fades there). A waiting lightning ball gives off a small
 * arc now and then. (v0.42.0–v0.42.1 also darkened the screen; the owner took it out.)
 *
 * Everything follows the strike's own clock (its elapsed time), so a pause freezes it. With reduced
 * motion there is no white flash and nothing flickers. The textures are the owner's art, else the
 * stand-ins of lightningFrames.ts; all of them are light, drawn with SCREEN: Phaser's ADD
 * multiplies what is under it by its own alpha, which punches squares into anything see-through
 * on the transparent canvas. Pooled images, no allocations per frame once warm.
 */
import type Phaser from 'phaser';
import { LIGHTNING_SPARKS } from '../../config/skin';
import { LIGHTNING_FX } from '../../config/view';
import type { BallView } from '../../physics/balls';
import { strikeChain } from '../../physics/lightning';
import type { StrikeLink } from '../../physics/lightning';
import type { LightningView } from '../../run/RunController';
import { refreshFrames } from './lightningFrames';
import type { BoltFrame, LightningFrames, RoundFrame } from './lightningFrames';
import type { SparkFx } from './SparkFx';
import { drawnX, drawnY } from '../drawnPose';

const WHITE_KEY = 'fx-storm-white';

/** The world rectangle the camera shows. */
export interface ViewRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A strike as it was when it began: where every ball stands (time stands still) and the chain. */
interface Strike {
  readonly id: number;
  /** The lightning ball, then the struck balls. */
  readonly points: { x: number; y: number; radius: number }[];
  readonly links: StrikeLink[];
}

export class LightningFx {
  private readonly flash: Phaser.GameObjects.Image;
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private strike: Strike | null = null;
  /** When the struck balls popped, or −Infinity. */
  private poppedMs = -Infinity;
  /** Where the struck balls popped, for the art's burst of sparks (real time). */
  private readonly bursts: { x: number; y: number; radius: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly sparks: SparkFx,
    private readonly frames: LightningFrames,
    /** Scales particle counts (fewer with reduced motion). */
    private readonly particles: (count: number) => number,
  ) {
    if (!scene.textures.exists(WHITE_KEY)) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 4;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 4, 4);
      }
      scene.textures.addCanvas(WHITE_KEY, canvas);
    }
    this.flash = scene.add.image(0, 0, WHITE_KEY).setOrigin(0).setVisible(false);
    layer.add(this.flash);
  }

  /**
   * Draws the strike `view` (null: none) over `balls` in the camera's `rect`, at `nowMs` (real
   * time, for the bursts of sparks and the waiting balls' arcs).
   */
  update(
    nowMs: number,
    view: LightningView | null,
    balls: readonly BallView[],
    rect: ViewRect,
    reduced: boolean,
    alpha: number,
  ): void {
    this.used = 0;
    let flash = 0;
    if (view) {
      const strike = this.begin(view, balls);
      const t = view.elapsedMs;
      if (!reduced) flash = LIGHTNING_FX.flashAlpha * Math.max(0, 1 - t / LIGHTNING_FX.flashMs);
      this.drawStrike(strike, t, view.holdMs, rect, reduced);
    } else {
      this.strike = null;
      this.drawArcs(nowMs, balls, alpha);
      this.drawBursts(nowMs, reduced);
    }
    this.cover(this.flash, rect, flash);
    for (let i = this.used; i < this.pool.length; i++)
      (this.pool[i] as Phaser.GameObjects.Image).setVisible(false);
  }

  /** The struck balls popped at these points: sparks fly from each. */
  discharge(nowMs: number, points: readonly { x: number; y: number; radius: number }[]): void {
    this.poppedMs = nowMs;
    const count = this.particles(LIGHTNING_FX.popSparks);
    this.bursts.length = 0;
    for (const { x, y, radius } of points) {
      this.sparks.mergeBurst(x, y, count, LIGHTNING_SPARKS);
      this.bursts.push({ x, y, radius });
    }
  }

  /** Uploads the textures again after the WebGL context comes back. */
  restore(): void {
    refreshFrames(this.scene.textures, this.frames);
  }

  clear(): void {
    this.strike = null;
    this.poppedMs = -Infinity;
    this.bursts.length = 0;
    this.flash.setVisible(false);
    for (const image of this.pool) image.setVisible(false);
  }

  /** The strike's points and chain, worked out once when it begins (nothing moves meanwhile). */
  private begin(view: LightningView, balls: readonly BallView[]): Strike {
    if (this.strike?.id === view.id) return this.strike;
    const find = (id: number): BallView | undefined => balls.find((ball) => ball.id === id);
    const points = [view.id, ...view.targets]
      .map(find)
      .filter((ball): ball is BallView => ball !== undefined)
      .map(({ x, y, radius }) => ({ x, y, radius }));
    this.strike = { id: view.id, points, links: strikeChain(points) };
    return this.strike;
  }

  private drawStrike(
    strike: Strike,
    t: number,
    holdMs: number,
    rect: ViewRect,
    reduced: boolean,
  ): void {
    const fx = LIGHTNING_FX;
    const frames = this.frames;
    const tick = reduced ? 0 : Math.floor(t / fx.flickerMs);
    const fade = Math.min(1, Math.max(0, (holdMs - t) / fx.fadeMs));
    const ball = strike.points[0];
    if (!ball) return;
    // The sky bolt, from above the screen down onto the ball.
    if (t < fx.skyMs) {
      const sky = pick(frames.sky, hash(0, tick)) as BoltFrame;
      const top = rect.top - fx.skyWidth;
      const k = 1 - t / fx.skyMs;
      this.stretch(sky, ball.x, top, ball.x, ball.y, fx.skyWidth, Math.min(1, 2 * k));
    }
    // The lightning ball crackles from the start.
    this.crackle(ball, 0, tick, fade);
    strike.links.forEach((link, i) => {
      const arrive = link.depth * fx.linkDelayMs;
      if (t < arrive) return;
      const from = strike.points[link.from];
      const to = strike.points[link.to];
      if (!from || !to) return;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const band = Math.min(fx.bandMax, Math.max(fx.bandMin, fx.bandShare * length));
      const bolt = pick(frames.bolts, hash(i + 1, tick)) as BoltFrame;
      const flip = !reduced && hash(i + 7, tick) % 2 === 1;
      this.stretch(bolt, from.x, from.y, to.x, to.y, flip ? -band : band, fade);
      this.crackle(to, i + 1, tick, fade);
      this.impact(to, t - arrive);
    });
    this.impact(ball, t);
  }

  /** The crackles over a struck ball (or the lightning ball), turned and swapped as they flicker. */
  private crackle(
    at: { x: number; y: number; radius: number },
    index: number,
    tick: number,
    alpha: number,
  ): void {
    const h = hash(index + 31, tick);
    const shock = pick(this.frames.shocks, h) as RoundFrame;
    const scale = (LIGHTNING_FX.crackleRadius * at.radius) / shock.radius;
    this.image(shock.key)
      .setPosition(at.x, at.y)
      .setRotation(((h % 360) * Math.PI) / 180)
      .setScale(scale)
      .setAlpha(alpha);
  }

  /** A flash and a ring where a link lands, `age` ms after it did. */
  private impact(at: { x: number; y: number; radius: number }, age: number): void {
    const fx = LIGHTNING_FX;
    if (age < fx.impactMs) {
      const k = age / fx.impactMs;
      const { flash } = this.frames;
      const size = fx.impactScale * at.radius * (0.6 + 0.4 * Math.sqrt(k));
      this.image(flash.key)
        .setPosition(at.x, at.y)
        .setRotation(0)
        .setScale(size / flash.radius)
        .setAlpha(1 - k);
    }
    if (age < fx.ringMs) {
      const k = age / fx.ringMs;
      const { ring } = this.frames;
      const radius = at.radius * (fx.ringFrom + (fx.ringTo - fx.ringFrom) * (1 - (1 - k) ** 2));
      this.image(ring.key)
        .setPosition(at.x, at.y)
        .setRotation(0)
        .setScale(radius / ring.radius)
        .setAlpha(1 - k);
    }
  }

  /** Waiting lightning balls give off a small arc now and then, each on its own beat. */
  private drawArcs(nowMs: number, balls: readonly BallView[], alpha: number): void {
    const fx = LIGHTNING_FX;
    for (const ball of balls) {
      if (ball.kind !== 'lightning') continue;
      const beat = nowMs + ball.id * 397;
      const age = beat % fx.arcEveryMs;
      if (age >= fx.arcMs) continue;
      const n = Math.floor(beat / fx.arcEveryMs);
      const h = hash(ball.id, n);
      const arc = pick(this.frames.arcs, h) as BoltFrame;
      const angle = ((h % 360) * Math.PI) / 180;
      const x = drawnX(ball, alpha);
      const y = drawnY(ball, alpha);
      const r = ball.radius;
      const fromX = x + Math.cos(angle) * r * 0.8;
      const fromY = y + Math.sin(angle) * r * 0.8;
      const toX = x + Math.cos(angle + 0.55) * r * 1.6;
      const toY = y + Math.sin(angle + 0.55) * r * 1.6;
      this.stretch(arc, fromX, fromY, toX, toY, null, 1 - age / fx.arcMs);
    }
  }

  /** The art's burst of sparks where each struck ball popped: it grows and fades. */
  private drawBursts(nowMs: number, reduced: boolean): void {
    const sparks = this.frames.sparks;
    const age = nowMs - this.poppedMs;
    if (!sparks || this.bursts.length === 0 || age >= LIGHTNING_FX.burstMs) return;
    const k = Math.max(0, age) / LIGHTNING_FX.burstMs;
    const grow = reduced
      ? 1
      : LIGHTNING_FX.burstFrom + (1 - LIGHTNING_FX.burstFrom) * (1 - (1 - k) ** 2);
    for (const { x, y, radius } of this.bursts) {
      this.image(sparks.key)
        .setPosition(x, y)
        .setRotation(0)
        .setScale((LIGHTNING_FX.burstScale * radius * grow) / sparks.radius)
        .setAlpha(1 - k);
    }
  }

  /**
   * A bolt frame stretched from (x0, y0) to (x1, y1): its `a` end on the first point, its `b` end
   * on the second, its zigzag `band` world units across (negative: mirrored; null: scaled evenly,
   * keeping its shape, as for a curved arc).
   */
  private stretch(
    frame: BoltFrame,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    band: number | null,
    alpha: number,
  ): void {
    const image = this.image(frame.key);
    const tx = frame.bx - frame.ax;
    const ty = frame.by - frame.ay;
    const along = Math.hypot(tx, ty);
    const length = Math.hypot(x1 - x0, y1 - y0);
    // The frame's own a → b direction lies along its x axis (chain bolts, arcs) or y axis (sky).
    const upright = Math.abs(ty) > Math.abs(tx);
    const turn = Math.atan2(y1 - y0, x1 - x0) - Math.atan2(ty, tx);
    const lengthScale = length / along;
    const bandScale = band === null ? lengthScale : band / frame.band;
    image
      .setOrigin(frame.ax / image.width, frame.ay / image.height)
      .setPosition(x0, y0)
      .setRotation(turn)
      .setScale(upright ? bandScale : lengthScale, upright ? lengthScale : bandScale)
      .setAlpha(alpha);
  }

  /** Stretches a plain image over the camera's view, or hides it at no alpha. */
  private cover(image: Phaser.GameObjects.Image, rect: ViewRect, alpha: number): void {
    image.setVisible(alpha > 0.001);
    if (alpha <= 0.001) return;
    image
      .setPosition(rect.left, rect.top)
      .setScale(rect.width / image.width, rect.height / image.height)
      .setAlpha(alpha);
  }

  /** The next pooled image, shown with `key`, drawn with light. */
  private image(key: string): Phaser.GameObjects.Image {
    let image = this.pool[this.used];
    if (!image) {
      image = this.scene.add.image(0, 0, key).setBlendMode('SCREEN');
      this.layer.add(image);
      this.pool.push(image);
    }
    this.used++;
    if (image.texture.key !== key) image.setTexture(key);
    return image.setVisible(true).setOrigin(0.5);
  }
}

/** One of `list`, by a hash. */
function pick<T>(list: readonly T[], h: number): T | undefined {
  return list[h % list.length];
}

/** A small integer hash of two integers: the same shapes on every replay of a strike. */
export function hash(a: number, b: number): number {
  let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 13;
  return h >>> 0;
}
