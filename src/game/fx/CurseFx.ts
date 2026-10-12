/**
 * Cursed Bell's look (GAME_DESIGN §15.12): the cursed cat turns to stone bit by bit, like a cracked
 * cat shows its cracks: one of the owner's stone patterns (docs/ART_ASSETS.md §4.13) lies over it,
 * rolling with it, the first for the first half of its countdown and the second, more stone, for
 * the rest. Without the art (`?skin=placeholder` or `vector`) the drops left show as live text over
 * the cat instead. Turning to stone, the cat's sprite fades out on its boulder as the boulder's
 * fades in.
 */
import type Phaser from 'phaser';
import { FX_ART } from '../../config/fxSprites';
import { CURSE_NUMBER_FILL, CURSE_NUMBER_STROKE } from '../../config/skin';
import {
  CURSE_NUMBER_GAP,
  CURSE_NUMBER_SIZE,
  CURSE_STONE_ART_RADIUS,
  CURSE_STONE_FADE_MS,
  CURSE_SWAY_FROM,
  CURSE_SWAY_PERIOD_MS,
  CURSE_SWAY_RAD,
} from '../../config/view';
import type { BallView } from '../../physics/balls';
import { imageCanvas } from '../artImages';
import type { BallRenderer, CatSprite } from '../BallRenderer';
import { crackVariant } from '../BallRenderer';
import { drawnAngle, drawnX, drawnY } from '../drawnPose';

/** The text is drawn at this size and scaled to CURSE_NUMBER_SIZE world units. */
const FONT_PX = 96;
const STONE_KEY = 'curse-stone-';

/** A cursed cat fading out on the boulder that took its place. */
interface Stone {
  readonly sprite: CatSprite;
  readonly boulder: number;
  readonly startMs: number;
}

export interface CurseState {
  readonly id: number;
  readonly dropsLeft: number;
  /** What the count started at. */
  readonly total: number;
}

/** How far the number leans at `nowMs` with `dropsLeft` drops left (radians; 0 when still). */
export function curseSway(dropsLeft: number, nowMs: number, reduced: boolean): number {
  if (reduced || dropsLeft > CURSE_SWAY_FROM) return 0;
  return CURSE_SWAY_RAD * Math.sin((2 * Math.PI * nowMs) / CURSE_SWAY_PERIOD_MS);
}

/**
 * Which stone pattern a cursed cat shows: the first while more than half its count is left (10
 * drops: 10 to 6), then the second (5 to 0).
 */
export function stoneStage(dropsLeft: number, total: number): 0 | 1 {
  return dropsLeft > Math.floor(total / 2) ? 0 : 1;
}

export class CurseFx {
  private readonly number: Phaser.GameObjects.Text;
  private readonly stone: Phaser.GameObjects.Image | null = null;
  private readonly stones: Stone[] = [];

  /** `overlay` holds the stone (over the cats, like cracks), `layer` the number. */
  constructor(
    private readonly scene: Phaser.Scene,
    overlay: Phaser.GameObjects.Layer,
    layer: Phaser.GameObjects.Layer,
    private readonly balls: BallRenderer,
    images: readonly HTMLImageElement[] | null = null,
  ) {
    const list = images ?? [];
    if (list.length >= FX_ART.stones.length && FX_ART.stones.length > 0) {
      list.forEach((image, i) => {
        if (!scene.textures.exists(STONE_KEY + i)) {
          scene.textures.addCanvas(STONE_KEY + i, imageCanvas(image));
        }
      });
      this.stone = scene.add.image(0, 0, STONE_KEY + 0).setVisible(false);
      overlay.add(this.stone);
    }
    this.number = scene.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontStyle: '700',
        fontSize: `${FONT_PX}px`,
        color: CURSE_NUMBER_FILL,
        stroke: CURSE_NUMBER_STROKE,
        strokeThickness: 18,
      })
      .setOrigin(0.5, 1)
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

  /**
   * `zoom`: the camera's, for a crisp number; `alpha`: where between its last two poses the
   * cursed cat is drawn (drawnPose.ts).
   */
  update(
    nowMs: number,
    curse: CurseState | null,
    balls: readonly BallView[],
    zoom: number,
    reduced: boolean,
    alpha: number,
  ): void {
    const cat = curse ? balls.find((b) => b.id === curse.id) : undefined;
    const stone = this.stone;
    stone?.setVisible(cat !== undefined);
    this.number.setVisible(cat !== undefined && !stone);
    if (curse && cat) {
      if (stone) {
        const stage = stoneStage(curse.dropsLeft, curse.total);
        const sprite = FX_ART.stones[stage];
        if (stone.texture.key !== STONE_KEY + stage) stone.setTexture(STONE_KEY + stage);
        const grow = cat.radius / cat.targetRadius;
        stone
          .setPosition(drawnX(cat, alpha), drawnY(cat, alpha))
          .setRotation(drawnAngle(cat, alpha) + crackVariant(cat.id).turn)
          .setScale(((CURSE_STONE_ART_RADIUS * cat.targetRadius) / (sprite?.radius ?? 1)) * grow);
      } else {
        const scale = CURSE_NUMBER_SIZE / FONT_PX;
        const resolution = zoom * scale;
        if (this.number.style.resolution !== resolution) this.number.setResolution(resolution);
        this.number
          .setText(String(curse.dropsLeft))
          .setScale(scale)
          .setPosition(drawnX(cat, alpha), drawnY(cat, alpha) - cat.radius - CURSE_NUMBER_GAP)
          .setRotation(curseSway(curse.dropsLeft, nowMs, reduced));
      }
    }
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const fading = this.stones[i] as Stone;
      const t = (nowMs - fading.startMs) / CURSE_STONE_FADE_MS;
      const boulder = balls.find((b) => b.id === fading.boulder);
      if (t >= 1 || !boulder) {
        this.balls.recycle(fading.sprite);
        this.stones.splice(i, 1);
        continue;
      }
      fading.sprite.body
        .setPosition(boulder.x, boulder.y)
        .setRotation(boulder.angle)
        .setAlpha(1 - Math.max(0, t));
    }
  }

  /** Re-uploads the textures after the WebGL context comes back. */
  restore(): void {
    for (let i = 0; i < FX_ART.stones.length; i++) {
      const key = STONE_KEY + i;
      if (this.scene.textures.exists(key)) {
        (this.scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
      }
    }
  }

  clear(): void {
    this.number.setVisible(false);
    this.stone?.setVisible(false);
    for (const fading of this.stones) this.balls.recycle(fading.sprite);
    this.stones.length = 0;
  }
}
