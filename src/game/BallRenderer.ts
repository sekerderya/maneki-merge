/**
 * Draws the balls of a run: one pooled body image (rotating), one number image (upright, on the
 * cat's plate wherever the roll has carried it) and one glow image (behind golden cats, and behind
 * a hanabi while its fuse burns) per ball, matched by ball id each frame. Cats come from the cat
 * skin; boulders, hanabi and jokers from the special skin (GAME_DESIGN §15; a boulder's texture
 * changes as it loses bands). No allocations per frame once
 * the pool has warmed up.
 *
 * When the skin switches to another stage's textures, every live sprite takes its new texture on
 * the next sync. A popped ball's sprite can be handed to an effect (`detach`) and comes back to the
 * pool when the effect ends (`recycle`). A freshly merged cat bumps up and settles (`bump`); an
 * echo cat fades in (`fadeIn`). A cracked cat (Porcelain, GAME_DESIGN §15.10) shows the skin's
 * crack lines over it, one of two patterns turned by its id, rolling with it.
 */
import type Phaser from 'phaser';
import {
  ECHO_FADE_FROM,
  ECHO_FADE_MS,
  GOLDEN_GLOW_ALPHA,
  GOLDEN_GLOW_PERIOD_MS,
  GOLDEN_GLOW_SCALE,
  HANABI_FUSE_ALPHA,
  HANABI_FUSE_FLICKER_MS,
  MERGE_BUMP_MS,
  MERGE_BUMP_SCALE,
} from '../config/view';
import type { BallView } from '../physics/balls';
import type { BallSkin, SkinFrame } from './skins/BallSkin';
import type { SpecialSkin } from './skins/SpecialSkin';

/** A texture every Phaser game has; parked sprites point at it, never at a freed texture. */
const PARKED_TEXTURE = '__DEFAULT';

export interface CatSprite {
  id: number;
  tier: number;
  /** A boulder's merges left when its texture was set (0 for a cat). */
  hits: number;
  seen: number;
  readonly body: Phaser.GameObjects.Image;
  readonly number: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;
  /** Porcelain's crack lines over a cracked cat. */
  readonly crack: Phaser.GameObjects.Image;
}

/** A cracked cat's crack pattern (0 or 1) and how far it is turned, from its id. */
export function crackVariant(id: number): { readonly variant: number; readonly turn: number } {
  // The golden angle spreads the turns of neighbouring ids evenly.
  return { variant: id % 2, turn: (id * 2.39996) % (2 * Math.PI) };
}

/** How bright a golden cat's glow is at `nowMs`: a slow pulse. */
export function glowAlpha(nowMs: number): number {
  const t = (Math.sin((2 * Math.PI * nowMs) / GOLDEN_GLOW_PERIOD_MS) + 1) / 2;
  return GOLDEN_GLOW_ALPHA.min + (GOLDEN_GLOW_ALPHA.max - GOLDEN_GLOW_ALPHA.min) * t;
}

/** How bright a lit hanabi's glow is at `nowMs`: a quick flicker. */
export function fuseAlpha(nowMs: number): number {
  const t = Math.abs(Math.sin((Math.PI * nowMs) / HANABI_FUSE_FLICKER_MS));
  return HANABI_FUSE_ALPHA.min + (HANABI_FUSE_ALPHA.max - HANABI_FUSE_ALPHA.min) * t;
}

export class BallRenderer {
  private readonly live = new Map<number, CatSprite>();
  private readonly free: CatSprite[] = [];
  /** When each bumping cat's bump started, by cat id. */
  private readonly bumps = new Map<number, number>();
  /** When each fading-in cat (an echo) appeared, by cat id. */
  private readonly fades = new Map<number, number>();
  private frame = 0;
  private revision: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly skin: BallSkin,
    private readonly special: SpecialSkin,
    private readonly glows: Phaser.GameObjects.Layer,
    private readonly bodies: Phaser.GameObjects.Layer,
    private readonly numbers: Phaser.GameObjects.Layer,
  ) {
    this.revision = skin.revision;
  }

  get count(): number {
    return this.live.size;
  }

  /** The body frame of a ball: its cat look, its boulder with the bands it has left, … */
  frameOf(ball: Pick<BallView, 'kind' | 'tier' | 'size' | 'hitsLeft'>): SkinFrame {
    switch (ball.kind) {
      case 'boulder':
        return this.special.boulder(ball.size, ball.hitsLeft);
      case 'hanabi':
        return this.special.hanabi(ball.size);
      case 'joker':
        return this.special.joker(ball.size);
      case 'cat':
        return this.skin.body(ball.tier);
    }
  }

  /** Matches sprites to balls; `nowMs` drives the merge bumps and the golden glow's pulse. */
  sync(balls: readonly BallView[], nowMs: number): void {
    if (this.skin.revision !== this.revision) this.retexture(balls);
    const frame = ++this.frame;
    const pulse = glowAlpha(nowMs);
    for (const ball of balls) {
      const sprite = this.live.get(ball.id) ?? this.acquire(ball);
      sprite.seen = frame;
      if (ball.kind === 'boulder' && sprite.hits !== ball.hitsLeft) {
        // It lost a band.
        sprite.hits = ball.hitsLeft;
        const body = this.frameOf(ball);
        sprite.body.setTexture(body.key, body.frame);
      }
      const grow = (ball.radius / ball.targetRadius) * this.bumpAt(ball.id, nowMs);
      const body = this.frameOf(ball);
      sprite.body
        .setPosition(ball.x, ball.y)
        .setRotation(ball.angle)
        .setScale(body.unitsPerPixel * grow);
      if (this.fades.size > 0) sprite.body.setAlpha(this.fadeAt(ball.id, nowMs));
      sprite.crack.setVisible(ball.cracked);
      if (ball.cracked) {
        const { variant, turn } = crackVariant(ball.id);
        const crack = this.skin.crack(variant);
        if (sprite.crack.texture.key !== crack.key) sprite.crack.setTexture(crack.key, crack.frame);
        sprite.crack
          .setPosition(ball.x, ball.y)
          .setRotation(ball.angle + turn)
          .setScale(crack.unitsPerPixel * ball.targetRadius * grow);
      }
      // A hanabi glows while its fuse burns (from its first contact).
      const lit = ball.kind === 'hanabi' && ball.landedMs >= 0;
      if (ball.kind === 'hanabi') sprite.glow.setVisible(lit);
      if (ball.golden || lit) {
        const glow = this.special.glow();
        sprite.glow
          .setPosition(ball.x, ball.y)
          .setScale(glow.unitsPerPixel * ball.targetRadius * GOLDEN_GLOW_SCALE * grow)
          .setAlpha(lit ? fuseAlpha(nowMs) : pulse);
      }
      if (ball.kind !== 'cat') continue;
      const number = this.skin.number(ball.tier);
      if (number) {
        // The number rides on its plate as the cat rolls, but stays upright.
        const d = number.offset * ball.targetRadius * grow;
        sprite.number
          .setPosition(ball.x - d * Math.sin(ball.angle), ball.y + d * Math.cos(ball.angle))
          .setScale(number.unitsPerPixel * grow);
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

  /** The echo cat `id` just appeared: it fades in from pale. */
  fadeIn(id: number, nowMs: number): void {
    this.fades.set(id, nowMs);
  }

  private fadeAt(id: number, nowMs: number): number {
    const start = this.fades.get(id);
    if (start === undefined) return 1;
    const t = (nowMs - start) / ECHO_FADE_MS;
    if (t >= 1) {
      this.fades.delete(id);
      return 1;
    }
    return ECHO_FADE_FROM + (1 - ECHO_FADE_FROM) * Math.max(0, t);
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

  /**
   * Takes a ball's sprite out of the renderer, as it is on screen now (without its glow), or null
   * if it has none.
   */
  detach(id: number): CatSprite | null {
    const sprite = this.live.get(id);
    if (!sprite) return null;
    this.live.delete(id);
    sprite.glow.setVisible(false);
    sprite.crack.setVisible(false);
    return sprite;
  }

  /** Returns a detached sprite to the pool. */
  recycle(sprite: CatSprite): void {
    sprite.body.setVisible(false).setAlpha(1).setTexture(PARKED_TEXTURE);
    sprite.number.setVisible(false).setAlpha(1).setTexture(PARKED_TEXTURE);
    sprite.glow.setVisible(false).setAlpha(1);
    sprite.crack.setVisible(false);
    this.free.push(sprite);
  }

  clear(): void {
    this.bumps.clear();
    this.fades.clear();
    for (const [id, sprite] of this.live) this.release(id, sprite);
  }

  private acquire(ball: BallView): CatSprite {
    const sprite = this.free.pop() ?? this.createSprite();
    sprite.id = ball.id;
    sprite.tier = ball.tier;
    sprite.hits = ball.hitsLeft;
    this.applyTextures(sprite, ball);
    sprite.body.setVisible(true);
    // Newer balls draw on top of older ones.
    this.bodies.bringToTop(sprite.body);
    this.numbers.bringToTop(sprite.number);
    this.numbers.bringToTop(sprite.crack);
    this.live.set(ball.id, sprite);
    return sprite;
  }

  private applyTextures(sprite: CatSprite, ball: BallView): void {
    const body = this.frameOf(ball);
    sprite.body.setTexture(body.key, body.frame);
    const number = ball.kind === 'cat' ? this.skin.number(sprite.tier) : null;
    sprite.number.setVisible(number !== null);
    if (number) sprite.number.setTexture(number.key);
    sprite.glow.setVisible(ball.golden);
    if (ball.golden || ball.kind === 'hanabi') sprite.glow.setTexture(this.special.glow().key);
  }

  /** The skin changed stage: live balls take the new textures. */
  private retexture(balls: readonly BallView[]): void {
    this.revision = this.skin.revision;
    for (const ball of balls) {
      const sprite = this.live.get(ball.id);
      if (sprite) this.applyTextures(sprite, ball);
    }
  }

  private release(id: number, sprite: CatSprite): void {
    this.live.delete(id);
    this.bumps.delete(id);
    this.fades.delete(id);
    this.recycle(sprite);
  }

  private createSprite(): CatSprite {
    const body = this.scene.add.image(0, 0, PARKED_TEXTURE).setVisible(false);
    const number = this.scene.add.image(0, 0, PARKED_TEXTURE).setVisible(false);
    const glow = this.scene.add.image(0, 0, PARKED_TEXTURE).setVisible(false);
    const crack = this.scene.add.image(0, 0, PARKED_TEXTURE).setVisible(false);
    this.bodies.add(body);
    this.numbers.add([number, crack]);
    this.glows.add(glow);
    return { id: -1, tier: 1, hits: 0, seen: 0, body, number, glow, crack };
  }
}
