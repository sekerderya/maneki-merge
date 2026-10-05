/**
 * Draws the cats of a run: one pooled body image (rotating) and one number image (upright) per
 * cat, matched by cat id each frame. No allocations per frame once the pool has warmed up.
 */
import type Phaser from 'phaser';
import { tierRadius } from '../config/tiers';
import type { BallView } from '../physics/balls';
import type { BallSkin } from './skins/BallSkin';

interface CatSprite {
  id: number;
  tier: number;
  golden: boolean;
  seen: number;
  readonly body: Phaser.GameObjects.Image;
  readonly number: Phaser.GameObjects.Image;
}

export class BallRenderer {
  private readonly live = new Map<number, CatSprite>();
  private readonly free: CatSprite[] = [];
  private frame = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly skin: BallSkin,
    private readonly bodies: Phaser.GameObjects.Layer,
    private readonly numbers: Phaser.GameObjects.Layer,
  ) {}

  get count(): number {
    return this.live.size;
  }

  sync(balls: readonly BallView[]): void {
    const frame = ++this.frame;
    for (const ball of balls) {
      const sprite = this.live.get(ball.id) ?? this.acquire(ball);
      sprite.seen = frame;
      const grow = ball.radius / tierRadius(ball.tier);
      const body = this.skin.body(ball.tier, ball.golden);
      sprite.body
        .setPosition(ball.x, ball.y)
        .setRotation(ball.angle)
        .setScale(body.unitsPerPixel * grow);
      const number = this.skin.number(ball.tier);
      if (number) sprite.number.setPosition(ball.x, ball.y).setScale(number.unitsPerPixel * grow);
    }
    for (const [id, sprite] of this.live) {
      if (sprite.seen !== frame) this.release(id, sprite);
    }
  }

  clear(): void {
    for (const [id, sprite] of this.live) this.release(id, sprite);
  }

  private acquire(ball: BallView): CatSprite {
    const sprite = this.free.pop() ?? this.createSprite();
    sprite.id = ball.id;
    sprite.tier = ball.tier;
    sprite.golden = ball.golden;
    sprite.body.setTexture(this.skin.body(ball.tier, ball.golden).key).setVisible(true);
    const number = this.skin.number(ball.tier);
    sprite.number.setVisible(number !== null);
    if (number) sprite.number.setTexture(number.key);
    // Newer cats draw on top of older ones.
    this.bodies.bringToTop(sprite.body);
    this.numbers.bringToTop(sprite.number);
    this.live.set(ball.id, sprite);
    return sprite;
  }

  private release(id: number, sprite: CatSprite): void {
    this.live.delete(id);
    sprite.body.setVisible(false);
    sprite.number.setVisible(false);
    this.free.push(sprite);
  }

  private createSprite(): CatSprite {
    const frame = this.skin.body(1, false);
    const body = this.scene.add.image(0, 0, frame.key);
    const number = this.scene.add.image(0, 0, frame.key);
    this.bodies.add(body);
    this.numbers.add(number);
    return { id: -1, tier: 1, golden: false, seen: 0, body, number };
  }
}
