/**
 * Cursed Bell's look (GAME_DESIGN §15.12): the owner's cursed bell (docs/ART_ASSETS.md §4.13)
 * hanging just above the cursed cat, upright, with the drops left written as live text on its
 * blank tag, swaying from its cord from CURSE_SWAY_FROM drops left; the owner's ring of ghostly
 * flames behind the cat, rocking gently; and the turn to stone, the cat's sprite fading out on its
 * boulder as the boulder's fades in. Without the art (`?skin=placeholder` or `vector`) the number
 * shows alone over the cat.
 */
import type Phaser from 'phaser';
import { FX_ART } from '../../config/fxSprites';
import { CURSE_NUMBER_FILL, CURSE_NUMBER_STROKE } from '../../config/skin';
import {
  CURSE_BELL_GAP,
  CURSE_BELL_HEIGHT,
  CURSE_NUMBER_GAP,
  CURSE_NUMBER_SIZE,
  CURSE_RING_MID,
  CURSE_RING_SWAY_PERIOD_MS,
  CURSE_RING_SWAY_RAD,
  CURSE_STONE_FADE_MS,
  CURSE_SWAY_FROM,
  CURSE_SWAY_PERIOD_MS,
  CURSE_SWAY_RAD,
  CURSE_TAG_FONT,
} from '../../config/view';
import type { BallView } from '../../physics/balls';
import { imageCanvas } from '../artImages';
import type { BallRenderer, CatSprite } from '../BallRenderer';

/** The text is drawn at this size and scaled to its size in world units. */
const FONT_PX = 96;
const BELL_KEY = 'curse-bell';
const RING_KEY = 'curse-ring';

/** A cursed cat fading out on the boulder that took its place. */
interface Stone {
  readonly sprite: CatSprite;
  readonly boulder: number;
  readonly startMs: number;
}

export interface CurseState {
  readonly id: number;
  readonly dropsLeft: number;
}

/** The owner's bell and ring images (ArtImages.fx). */
export interface CurseImages {
  readonly bell: HTMLImageElement;
  readonly ring: HTMLImageElement;
}

/** How far the bell leans at `nowMs` with `dropsLeft` drops left (radians; 0 when it doesn't sway). */
export function curseSway(dropsLeft: number, nowMs: number, reduced: boolean): number {
  if (reduced || dropsLeft > CURSE_SWAY_FROM) return 0;
  return CURSE_SWAY_RAD * Math.sin((2 * Math.PI * nowMs) / CURSE_SWAY_PERIOD_MS);
}

/**
 * Where the bell hangs over a cat at (x, y) of `radius`: its cord's top (the pivot it sways on),
 * its scale (world units per sprite pixel) and its tag's centre and radius, turned by `angle`.
 */
export function bellPlacement(x: number, y: number, radius: number, angle: number) {
  const bell = FX_ART.bell;
  const scale = CURSE_BELL_HEIGHT / bell.height;
  const top = y - radius - CURSE_BELL_GAP - CURSE_BELL_HEIGHT;
  const dx = (bell.tagX - bell.width / 2) * scale;
  const dy = bell.tagY * scale;
  return {
    x,
    y: top,
    scale,
    tagX: x + dx * Math.cos(angle) - dy * Math.sin(angle),
    tagY: top + dx * Math.sin(angle) + dy * Math.cos(angle),
    tagR: bell.tagR * scale,
  };
}

export class CurseFx {
  private readonly number: Phaser.GameObjects.Text;
  private readonly bell: Phaser.GameObjects.Image | null = null;
  private readonly ring: Phaser.GameObjects.Image | null = null;
  private readonly stones: Stone[] = [];

  /** `glows` holds the ring (behind the cats), `layer` the bell and its number. */
  constructor(
    private readonly scene: Phaser.Scene,
    glows: Phaser.GameObjects.Layer,
    layer: Phaser.GameObjects.Layer,
    private readonly balls: BallRenderer,
    images: CurseImages | null = null,
  ) {
    if (images) {
      for (const [key, image] of [
        [RING_KEY, images.ring],
        [BELL_KEY, images.bell],
      ] as const) {
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageCanvas(image));
      }
      this.ring = scene.add.image(0, 0, RING_KEY).setVisible(false);
      glows.add(this.ring);
      // It hangs, and sways, from its cord's top.
      this.bell = scene.add.image(0, 0, BELL_KEY).setOrigin(0.5, 0).setVisible(false);
      layer.add(this.bell);
    }
    this.number = scene.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontStyle: '700',
        fontSize: `${FONT_PX}px`,
        color: CURSE_NUMBER_FILL,
        stroke: CURSE_NUMBER_STROKE,
        strokeThickness: images ? 8 : 18,
      })
      .setOrigin(0.5, images ? 0.5 : 1)
      .setVisible(false);
    layer.add(this.number);
  }

  /** The cursed cat `id` turned into the boulder `boulder`: its sprite fades out on it. */
  petrify(id: number, boulder: number, nowMs: number): void {
    const sprite = this.balls.detach(id);
    if (!sprite) return;
    sprite.number.setVisible(false);
    this.stones.push({ sprite, boulder, startMs: nowMs });
    this.balls.fadeIn(boulder, nowMs, 0, CURSE_STONE_FADE_MS);
  }

  /** `zoom`: the camera's, for a crisp number. */
  update(
    nowMs: number,
    curse: CurseState | null,
    balls: readonly BallView[],
    zoom: number,
    reduced: boolean,
  ): void {
    const cat = curse ? balls.find((b) => b.id === curse.id) : undefined;
    const shown = cat !== undefined;
    this.number.setVisible(shown);
    this.bell?.setVisible(shown);
    this.ring?.setVisible(shown);
    if (curse && cat) this.draw(curse, cat, nowMs, zoom, reduced);
    this.fadeStones(nowMs, balls);
  }

  private draw(
    curse: CurseState,
    cat: BallView,
    nowMs: number,
    zoom: number,
    reduced: boolean,
  ): void {
    const sway = curseSway(curse.dropsLeft, nowMs, reduced);
    let size = CURSE_NUMBER_SIZE;
    if (this.bell && this.ring) {
      const place = bellPlacement(cat.x, cat.y, cat.radius, sway);
      this.bell.setPosition(place.x, place.y).setScale(place.scale).setRotation(sway);
      size = 2 * place.tagR * CURSE_TAG_FONT;
      this.number.setPosition(place.tagX, place.tagY);
      const ring = FX_ART.ring;
      const mid = (ring.inner + ring.outer) / 2;
      const rock = reduced
        ? 0
        : CURSE_RING_SWAY_RAD * Math.sin((2 * Math.PI * nowMs) / CURSE_RING_SWAY_PERIOD_MS);
      this.ring
        .setPosition(cat.x, cat.y)
        .setScale((CURSE_RING_MID * cat.radius) / mid)
        .setRotation(rock);
    } else {
      this.number.setPosition(cat.x, cat.y - cat.radius - CURSE_NUMBER_GAP);
    }
    const scale = size / FONT_PX;
    const resolution = zoom * scale;
    if (this.number.style.resolution !== resolution) this.number.setResolution(resolution);
    this.number.setText(String(curse.dropsLeft)).setScale(scale).setRotation(sway);
  }

  private fadeStones(nowMs: number, balls: readonly BallView[]): void {
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const stone = this.stones[i] as Stone;
      const t = (nowMs - stone.startMs) / CURSE_STONE_FADE_MS;
      const boulder = balls.find((b) => b.id === stone.boulder);
      if (t >= 1 || !boulder) {
        this.balls.recycle(stone.sprite);
        this.stones.splice(i, 1);
        continue;
      }
      stone.sprite.body
        .setPosition(boulder.x, boulder.y)
        .setRotation(boulder.angle)
        .setAlpha(1 - Math.max(0, t));
    }
  }

  /** Re-uploads the textures after the WebGL context comes back. */
  restore(): void {
    for (const key of [BELL_KEY, RING_KEY]) {
      if (this.scene.textures.exists(key)) {
        (this.scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
      }
    }
  }

  clear(): void {
    this.number.setVisible(false);
    this.bell?.setVisible(false);
    this.ring?.setVisible(false);
    for (const stone of this.stones) this.balls.recycle(stone.sprite);
    this.stones.length = 0;
  }
}
