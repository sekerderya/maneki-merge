/**
 * The Frog (GAME_DESIGN §15.17) on screen. As a ball leaves the paw, each frog that eats
 * (`swallowed`) opens its mouth and its tongue shoots out to the cat, then pulls it back: the cat's
 * own sprite rides on the tongue's tip, shrinking into the mouth. The frog gulps, then calms down.
 * After its last meal (`left`) it falls asleep where it is, shrinks away and is gone in a puff of
 * sparks. The frog's face is the owner's poses (calm, open, gulp, sleepy), set through the ball
 * renderer while the frog is in the jar and on its own sprite once it has left.
 *
 * The tongue is a band stretched from the mouth (which turns with the rolling frog) to its round
 * tip. With the art skin both are the owner's pieces (docs/ART_ASSETS.md §4.22); otherwise plain
 * pink stand-ins drawn here. Pooled images, no allocations per frame once warm.
 */
import type Phaser from 'phaser';
import { FROG_ART } from '../../config/frogSprites';
import type { FrogPose } from '../../config/frogSprites';
import { FROG_TONGUE, SPECIAL_INK } from '../../config/skin';
import { FROG_FX } from '../../config/view';
import type { BallView } from '../../physics/balls';
import { imageCanvas } from '../artImages';
import type { BallRenderer, CatSprite } from '../BallRenderer';
import { drawnAngle, drawnX, drawnY } from '../drawnPose';
import { context } from '../skins/canvas';
import type { SpecialSkin } from '../skins/SpecialSkin';
import type { SparkFx } from './SparkFx';

/** The tongue's textures: its band and its tip, whose left edge joins the band. */
interface TongueFrames {
  readonly band: string;
  readonly tip: string;
  /** The tip's height over the band's, and the share of its width from its left edge to its middle. */
  readonly tipScale: number;
  readonly tipWidth: number;
  readonly tipCentre: number;
}

/** A frog's pose: where it is and how it faces (a live frog's, or a gone one's last). */
interface FrogPlace {
  x: number;
  y: number;
  angle: number;
  radius: number;
}

/** A frog that made its last meal: its own sprite, asleep, then shrinking away. */
interface Ghost extends FrogPlace {
  readonly id: number;
  readonly sprite: CatSprite;
  readonly size: number;
  readonly startMs: number;
  scale: number;
}

/** A tongue out to a cat and back. */
interface Meal {
  readonly frog: number;
  readonly cat: CatSprite | null;
  readonly x: number;
  readonly y: number;
  readonly startMs: number;
  readonly band: Phaser.GameObjects.Image;
  readonly tip: Phaser.GameObjects.Image;
}

const BAND_PX = { w: 64, h: 40 } as const;
const TIP_PX = { w: 72, h: 68 } as const;

export class FrogFx {
  private readonly meals: Meal[] = [];
  private readonly ghosts: Ghost[] = [];
  /** When each frog's latest tongue went out, by id. */
  private readonly lastMeal = new Map<number, number>();
  private readonly spare: Phaser.GameObjects.Image[] = [];
  private readonly frames: TongueFrames;

  constructor(
    private readonly scene: Phaser.Scene,
    /** The tongue, over the balls. */
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly balls: BallRenderer,
    private readonly special: SpecialSkin,
    private readonly sparks: SparkFx,
    tongue: { readonly band: HTMLImageElement; readonly tip: HTMLImageElement } | null,
    /** Scales particle counts (fewer with reduced motion). */
    private readonly particles: (count: number) => number,
  ) {
    this.frames = tongueFrames(scene.textures, tongue);
  }

  /**
   * The frog `frog` swallowed the cat `cat` at (x, y): its sprite rides the tongue into the mouth.
   */
  swallowed(nowMs: number, frog: number, cat: number, x: number, y: number): void {
    const sprite = this.balls.detach(cat);
    // The cat rides the tongue over its neighbours.
    const list = sprite?.body.displayList as Phaser.GameObjects.Layer | null | undefined;
    if (sprite && list && 'bringToTop' in list) list.bringToTop(sprite.body);
    this.lastMeal.set(frog, nowMs);
    this.meals.push({
      frog,
      cat: sprite,
      x,
      y,
      startMs: nowMs,
      band: this.image(this.frames.band),
      tip: this.image(this.frames.tip),
    });
  }

  /** The frog `id` made its last meal at (x, y): it falls asleep there and goes. */
  left(nowMs: number, id: number, x: number, y: number, radius: number, size: number): void {
    const sprite = this.balls.detach(id);
    if (!sprite) return;
    const body = sprite.body;
    this.ghosts.push({
      id,
      sprite,
      size,
      startMs: nowMs,
      x: body.x || x,
      y: body.y || y,
      angle: body.rotation,
      radius,
      scale: body.scaleX,
    });
  }

  /** Draws the frame: the tongues, the frogs' faces and the frogs leaving. */
  update(nowMs: number, balls: readonly BallView[], alpha: number): void {
    const fx = FROG_FX;
    const mealMs = fx.outMs + fx.backMs;
    for (let i = this.meals.length - 1; i >= 0; i--) {
      const meal = this.meals[i] as Meal;
      const t = nowMs - meal.startMs;
      const place = this.place(meal.frog, balls, alpha);
      if (t >= mealMs || !place) {
        this.endMeal(meal);
        this.meals.splice(i, 1);
        continue;
      }
      this.drawMeal(meal, place, t);
    }
    // The faces of the frogs in the jar.
    for (const [id, start] of this.lastMeal) {
      const t = nowMs - start;
      const live = balls.some((ball) => ball.id === id);
      if (!live) {
        if (!this.ghosts.some((g) => g.id === id)) this.lastMeal.delete(id);
        continue;
      }
      const pose = this.pose(t, false);
      this.balls.setFrogPose(id, pose);
      if (pose === 'calm') this.lastMeal.delete(id);
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i] as Ghost;
      if (!this.drawGhost(ghost, nowMs)) {
        this.balls.recycle(ghost.sprite);
        this.lastMeal.delete(ghost.id);
        this.ghosts.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const meal of this.meals) this.endMeal(meal);
    this.meals.length = 0;
    for (const ghost of this.ghosts) this.balls.recycle(ghost.sprite);
    this.ghosts.length = 0;
    this.lastMeal.clear();
  }

  restore(): void {
    for (const key of [this.frames.band, this.frames.tip]) {
      if (this.scene.textures.exists(key)) {
        (this.scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
      }
    }
  }

  /** A frog's face `t` ms after its latest tongue went out; a gone frog sleeps after its gulp. */
  private pose(t: number, gone: boolean): FrogPose {
    const fx = FROG_FX;
    const gulpFrom = fx.outMs + fx.backMs;
    if (t < gulpFrom) return 'open';
    if (t < gulpFrom + fx.gulpMs) return 'gulp';
    return gone ? 'sleepy' : 'calm';
  }

  /** Where the frog `id` is drawn now: in the jar, or where it fell asleep. */
  private place(id: number, balls: readonly BallView[], alpha: number): FrogPlace | null {
    const ghost = this.ghosts.find((g) => g.id === id);
    if (ghost) return ghost;
    const frog = balls.find((ball) => ball.id === id);
    if (!frog) return null;
    return {
      x: drawnX(frog, alpha),
      y: drawnY(frog, alpha),
      angle: drawnAngle(frog, alpha),
      radius: frog.radius,
    };
  }

  private drawMeal(meal: Meal, frog: FrogPlace, t: number): void {
    const fx = FROG_FX;
    // The mouth sits above the frog's centre and turns with it.
    const mx = frog.x + Math.sin(frog.angle) * fx.mouth * frog.radius;
    const my = frog.y - Math.cos(frog.angle) * fx.mouth * frog.radius;
    // Out to the cat, then back with it.
    const out = t < fx.outMs;
    const k = out ? easeOut(t / fx.outMs) : 1 - easeIn((t - fx.outMs) / fx.backMs);
    const ex = mx + (meal.x - mx) * k;
    const ey = my + (meal.y - my) * k;
    const dx = ex - mx;
    const dy = ey - my;
    const length = Math.hypot(dx, dy);
    const rotation = Math.atan2(dy, dx);
    const thick = fx.thickness * frog.radius;
    const { tipScale, tipWidth, tipCentre } = this.frames;
    const tipH = thick * tipScale;
    const tipW = tipH * tipWidth;
    // The band runs from the mouth to the tip's left edge; the tip's middle is the tongue's end.
    const bandLength = Math.max(0, length - tipCentre * tipW);
    meal.band
      .setVisible(bandLength > 0.5)
      .setPosition(mx, my)
      .setRotation(rotation)
      .setDisplaySize(bandLength, thick);
    meal.tip.setVisible(true).setPosition(ex, ey).setRotation(rotation).setDisplaySize(tipW, tipH);
    if (meal.cat && !out) {
      const back = (t - fx.outMs) / fx.backMs;
      const body = meal.cat.body;
      const scale = 1 - (1 - fx.catTo) * easeIn(back);
      if (body.getData('frogScale') === undefined) body.setData('frogScale', body.scaleX);
      body
        .setPosition(ex, ey)
        .setScale((body.getData('frogScale') as number) * scale)
        .setAlpha(1 - 0.4 * back);
      meal.cat.number.setVisible(false);
    }
  }

  /** Draws a frog that has left; false once it is gone. */
  private drawGhost(ghost: Ghost, nowMs: number): boolean {
    const fx = FROG_FX;
    const t = nowMs - (this.lastMeal.get(ghost.id) ?? ghost.startMs);
    const sleepFrom = fx.outMs + fx.backMs + fx.gulpMs;
    const goneFrom = sleepFrom + fx.sleepMs;
    const body = ghost.sprite.body;
    if (t >= goneFrom + fx.goneMs) {
      this.sparks.burst(ghost.x, ghost.y, this.particles(fx.puffSparks));
      return false;
    }
    const pose = this.pose(t, true);
    const frame = this.special.frog(ghost.size, pose);
    if (body.texture.key !== frame.key) body.setTexture(frame.key, frame.frame);
    const shrink = t < goneFrom ? 1 : 1 - easeIn((t - goneFrom) / fx.goneMs);
    body
      .setVisible(true)
      .setPosition(ghost.x, ghost.y)
      .setRotation(ghost.angle)
      .setScale(frame.unitsPerPixel * (ghost.radius / unitsRadius(ghost)) * shrink)
      .setAlpha(t < goneFrom ? 1 : shrink);
    return true;
  }

  private endMeal(meal: Meal): void {
    for (const image of [meal.band, meal.tip]) this.spare.push(image.setVisible(false));
    if (meal.cat) {
      meal.cat.body.setData('frogScale', undefined);
      this.balls.recycle(meal.cat);
    }
  }

  private image(key: string): Phaser.GameObjects.Image {
    let image = this.spare.pop();
    if (!image) {
      image = this.scene.add.image(0, 0, key);
      this.layer.add(image);
    }
    return image.setTexture(key).setOrigin(0, 0.5).setVisible(false).setAlpha(1);
  }
}

/**
 * The gone frog's radius for its frame's scale: frames are drawn for the radius of their size, so
 * a frog keeps its size whatever the frame.
 */
function unitsRadius(ghost: Ghost): number {
  return ghost.radius;
}

function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) * (1 - c);
}

function easeIn(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c;
}

/** The owner's tongue as canvas textures, or the stand-in drawn here. */
function tongueFrames(
  textures: Phaser.Textures.TextureManager,
  art: { readonly band: HTMLImageElement; readonly tip: HTMLImageElement } | null,
): TongueFrames {
  const band = FROG_ART.band;
  const tip = FROG_ART.tip;
  if (art && band && tip) {
    if (!textures.exists('frog-tongue')) textures.addCanvas('frog-tongue', imageCanvas(art.band));
    if (!textures.exists('frog-tongue-tip')) {
      textures.addCanvas('frog-tongue-tip', imageCanvas(art.tip));
    }
    return {
      band: 'frog-tongue',
      tip: 'frog-tongue-tip',
      tipScale: tip.height / band.height,
      tipWidth: tip.width / tip.height,
      // The tip's round end is about as wide as it is tall: its middle is half a height from the right.
      tipCentre: 1 - tip.height / 2 / tip.width,
    };
  }
  const add = (
    key: string,
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ) => {
    if (!textures.exists(key)) {
      const canvas = document.createElement('canvas');
      draw(context(canvas, w, h));
      textures.addCanvas(key, canvas);
    }
    return key;
  };
  const line = 5;
  return {
    band: add('frog-tongue-stand-in', BAND_PX.w, BAND_PX.h, (ctx) => {
      ctx.fillStyle = SPECIAL_INK;
      ctx.fillRect(0, 0, BAND_PX.w, BAND_PX.h);
      ctx.fillStyle = FROG_TONGUE;
      ctx.fillRect(0, line, BAND_PX.w, BAND_PX.h - 2 * line);
    }),
    tip: add('frog-tongue-tip-stand-in', TIP_PX.w, TIP_PX.h, (ctx) => {
      const r = TIP_PX.h / 2 - line;
      ctx.beginPath();
      ctx.arc(TIP_PX.w - TIP_PX.h / 2, TIP_PX.h / 2, r, 0, 2 * Math.PI);
      ctx.rect(
        0,
        TIP_PX.h / 2 - (BAND_PX.h / 2 - line) * 1.2,
        TIP_PX.w / 2,
        (BAND_PX.h - 2 * line) * 1.2,
      );
      ctx.fillStyle = FROG_TONGUE;
      ctx.fill();
      ctx.lineWidth = line;
      ctx.strokeStyle = SPECIAL_INK;
      ctx.beginPath();
      ctx.arc(TIP_PX.w - TIP_PX.h / 2, TIP_PX.h / 2, r, 0, 2 * Math.PI);
      ctx.stroke();
    }),
    tipScale: TIP_PX.h / BAND_PX.h,
    tipWidth: TIP_PX.w / TIP_PX.h,
    tipCentre: 1 - TIP_PX.h / 2 / TIP_PX.w,
  };
}
