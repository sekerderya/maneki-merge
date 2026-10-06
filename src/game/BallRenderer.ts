/**
 * Draws the cats of a run: one pooled body image (rotating), one number image (upright) and, for
 * golden cats, a twinkling glint per cat, matched by cat id each frame. No allocations per frame
 * once the pool has warmed up.
 *
 * When the skin switches to another stage's textures, every live sprite takes its new texture on
 * the next sync. A popped cat's sprite can be handed to an effect (`detach`) and comes back to the
 * pool when the effect ends (`recycle`). A freshly merged cat bumps up and settles (`bump`).
 */
import type Phaser from 'phaser';
import { MERGE_BUMP_MS, MERGE_BUMP_SCALE } from '../config/view';
import type { BallView } from '../physics/balls';
import { createGlintTexture, GLINT_KEY, glintPhase, placeGlint } from './fx/glint';
import type { BallSkin } from './skins/BallSkin';

/** A texture every Phaser game has; parked sprites point at it, never at a freed texture. */
const PARKED_TEXTURE = '__DEFAULT';

export interface CatSprite {
  id: number;
  tier: number;
  golden: boolean;
  seen: number;
  readonly body: Phaser.GameObjects.Image;
  readonly number: Phaser.GameObjects.Image;
  readonly glint: Phaser.GameObjects.Image;
}

export class BallRenderer {
  private readonly live = new Map<number, CatSprite>();
  private readonly free: CatSprite[] = [];
  /** When each bumping cat's bump started, by cat id. */
  private readonly bumps = new Map<number, number>();
  private frame = 0;
  private revision: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly skin: BallSkin,
    private readonly bodies: Phaser.GameObjects.Layer,
    private readonly numbers: Phaser.GameObjects.Layer,
  ) {
    this.revision = skin.revision;
    createGlintTexture(scene.textures);
  }

  get count(): number {
    return this.live.size;
  }

  /** Matches sprites to cats; `nowMs` drives the golden glints. */
  sync(balls: readonly BallView[], nowMs: number): void {
    if (this.skin.revision !== this.revision) this.retexture();
    const frame = ++this.frame;
    for (const ball of balls) {
      const sprite = this.live.get(ball.id) ?? this.acquire(ball);
      sprite.seen = frame;
      const grow = (ball.radius / ball.targetRadius) * this.bumpAt(ball.id, nowMs);
      const body = this.skin.body(ball.tier, ball.golden);
      sprite.body
        .setPosition(ball.x, ball.y)
        .setRotation(ball.angle)
        .setScale(body.unitsPerPixel * grow);
      const number = this.skin.number(ball.tier);
      if (number) sprite.number.setPosition(ball.x, ball.y).setScale(number.unitsPerPixel * grow);
      if (ball.golden) {
        placeGlint(sprite.glint, ball.x, ball.y, ball.radius, nowMs, glintPhase(ball.id));
      }
    }
    for (const [id, sprite] of this.live) {
      if (sprite.seen !== frame) this.release(id, sprite);
    }
  }

  /** The merged cat `id` pops: a short scale bump on top of its growth. */
  bump(id: number, nowMs: number): void {
    this.bumps.set(id, nowMs);
  }

  private bumpAt(id: number, nowMs: number): number {
    if (this.bumps.size === 0) return 1;
    const start = this.bumps.get(id);
    if (start === undefined) return 1;
    const t = (nowMs - start) / MERGE_BUMP_MS;
    if (t >= 1) {
      this.bumps.delete(id);
      return 1;
    }
    return t < 0 ? 1 : 1 + MERGE_BUMP_SCALE * Math.sin(Math.PI * t);
  }

  /** Takes a cat's sprite out of the renderer, as it is on screen now, or null if it has none. */
  detach(id: number): CatSprite | null {
    const sprite = this.live.get(id);
    if (!sprite) return null;
    this.live.delete(id);
    sprite.glint.setVisible(false);
    return sprite;
  }

  /** Returns a detached sprite to the pool. */
  recycle(sprite: CatSprite): void {
    sprite.body.setVisible(false).setAlpha(1).setTexture(PARKED_TEXTURE);
    sprite.number.setVisible(false).setAlpha(1).setTexture(PARKED_TEXTURE);
    sprite.glint.setVisible(false);
    this.free.push(sprite);
  }

  clear(): void {
    this.bumps.clear();
    for (const [id, sprite] of this.live) this.release(id, sprite);
  }

  private acquire(ball: BallView): CatSprite {
    const sprite = this.free.pop() ?? this.createSprite();
    sprite.id = ball.id;
    sprite.tier = ball.tier;
    sprite.golden = ball.golden;
    this.applyTextures(sprite);
    sprite.body.setVisible(true);
    sprite.glint.setVisible(false);
    // Newer cats draw on top of older ones.
    this.bodies.bringToTop(sprite.body);
    this.numbers.bringToTop(sprite.number);
    this.numbers.bringToTop(sprite.glint);
    this.live.set(ball.id, sprite);
    return sprite;
  }

  private applyTextures(sprite: CatSprite): void {
    sprite.body.setTexture(this.skin.body(sprite.tier, sprite.golden).key);
    const number = this.skin.number(sprite.tier);
    sprite.number.setVisible(number !== null);
    if (number) sprite.number.setTexture(number.key);
  }

  /** The skin changed stage: live cats take the new textures. */
  private retexture(): void {
    this.revision = this.skin.revision;
    for (const sprite of this.live.values()) this.applyTextures(sprite);
  }

  private release(id: number, sprite: CatSprite): void {
    this.live.delete(id);
    this.bumps.delete(id);
    this.recycle(sprite);
  }

  private createSprite(): CatSprite {
    const body = this.scene.add.image(0, 0, PARKED_TEXTURE).setVisible(false);
    const number = this.scene.add.image(0, 0, PARKED_TEXTURE).setVisible(false);
    const glint = this.scene.add.image(0, 0, GLINT_KEY).setVisible(false);
    this.bodies.add(body);
    this.numbers.add([number, glint]);
    return { id: -1, tier: 1, golden: false, seen: 0, body, number, glint };
  }
}
