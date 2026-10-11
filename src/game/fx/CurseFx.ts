/**
 * Cursed Bell's look (GAME_DESIGN §15.12): the drops left on the cursed cat's bell, as live text
 * floating just above the cat, upright, swaying from CURSE_SWAY_FROM drops left; and the turn to
 * stone, the cat's sprite fading out on its boulder as the boulder's fades in. The bell and its
 * ring of flames are the owner's art only (docs/ART_ASSETS.md §4.13); until they come, the number
 * shows alone.
 */
import type Phaser from 'phaser';
import { CURSE_NUMBER_FILL, CURSE_NUMBER_STROKE } from '../../config/skin';
import {
  CURSE_NUMBER_GAP,
  CURSE_NUMBER_SIZE,
  CURSE_STONE_FADE_MS,
  CURSE_SWAY_FROM,
  CURSE_SWAY_PERIOD_MS,
  CURSE_SWAY_RAD,
} from '../../config/view';
import type { BallView } from '../../physics/balls';
import type { BallRenderer, CatSprite } from '../BallRenderer';

/** The text is drawn at this size and scaled to CURSE_NUMBER_SIZE world units. */
const FONT_PX = 96;

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

/** How far the bell leans at `nowMs` with `dropsLeft` drops left (radians; 0 when it doesn't sway). */
export function curseSway(dropsLeft: number, nowMs: number, reduced: boolean): number {
  if (reduced || dropsLeft > CURSE_SWAY_FROM) return 0;
  return CURSE_SWAY_RAD * Math.sin((2 * Math.PI * nowMs) / CURSE_SWAY_PERIOD_MS);
}

export class CurseFx {
  private readonly number: Phaser.GameObjects.Text;
  private readonly stones: Stone[] = [];

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly balls: BallRenderer,
  ) {
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

  /** `zoom`: the camera's, for a crisp number. */
  update(
    nowMs: number,
    curse: CurseState | null,
    balls: readonly BallView[],
    zoom: number,
    reduced: boolean,
  ): void {
    const cat = curse ? balls.find((b) => b.id === curse.id) : undefined;
    this.number.setVisible(cat !== undefined);
    if (curse && cat) {
      const scale = CURSE_NUMBER_SIZE / FONT_PX;
      const resolution = zoom * scale;
      if (this.number.style.resolution !== resolution) this.number.setResolution(resolution);
      this.number
        .setText(String(curse.dropsLeft))
        .setScale(scale)
        .setPosition(cat.x, cat.y - cat.radius - CURSE_NUMBER_GAP)
        .setRotation(curseSway(curse.dropsLeft, nowMs, reduced));
    }
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

  clear(): void {
    this.number.setVisible(false);
    for (const stone of this.stones) this.balls.recycle(stone.sprite);
    this.stones.length = 0;
  }
}
