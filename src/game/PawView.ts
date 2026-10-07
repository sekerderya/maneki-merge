/**
 * The dropper's paw (GAME_DESIGN §2.3, §13): a calico paw hanging from the top of the screen,
 * holding the next cat by the head. The paw and the lower arm are a texture (config/pawArt.ts);
 * the arm above it is plain fur drawn up to the top of the screen, however tall the screen is.
 */
import type Phaser from 'phaser';
import {
  PAW_ARM_HALF,
  PAW_ART_BOX,
  PAW_FUR,
  PAW_INK,
  PAW_LINE,
  PAW_SHADE,
  PAW_SHADE_ALPHA,
  PAW_SHADE_FROM,
  pawShapes,
} from '../config/pawArt';
import { PAW_LIFT, PAW_LIFT_DOWN_MS, PAW_LIFT_UP_MS, PAW_PX_PER_UNIT } from '../config/view';
import { hexToNumber } from '../core/color';
import { addArtTexture } from './paint';

const KEY = 'paw';
const FUR = hexToNumber(PAW_FUR);
const INK = hexToNumber(PAW_INK);
const SHADE = hexToNumber(PAW_SHADE);

export class PawView {
  private readonly paw: Phaser.GameObjects.Image;
  private readonly arm: Phaser.GameObjects.Graphics;
  private readonly textures: Phaser.Textures.TextureManager;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.textures = scene.textures;
    const box = PAW_ART_BOX;
    addArtTexture(scene.textures, KEY, pawShapes(), box, PAW_PX_PER_UNIT);
    this.arm = scene.add.graphics();
    this.paw = scene.add
      .image(0, 0, KEY)
      .setOrigin(-box.left / (box.right - box.left), -box.top / (box.bottom - box.top))
      .setScale(1 / PAW_PX_PER_UNIT);
    layer.add([this.arm, this.paw]);
    this.hide();
  }

  /** The paw with its bottom at (x, y) world units, its arm reaching up to `topY`. */
  show(x: number, y: number, topY: number): void {
    this.paw.setVisible(true).setPosition(x, y);
    const g = this.arm.clear().setVisible(true);
    // The texture's arm ends at PAW_ART_BOX.top; overlap it by a unit so no seam shows.
    const from = y + PAW_ART_BOX.top + 1;
    if (topY >= from) return;
    const a = PAW_ARM_HALF;
    g.fillStyle(FUR, 1);
    g.fillRect(x - a, topY, 2 * a, from - topY);
    g.fillStyle(SHADE, PAW_SHADE_ALPHA);
    g.fillRect(x + PAW_SHADE_FROM, topY, a - PAW_SHADE_FROM, from - topY);
    g.lineStyle(PAW_LINE, INK, 1);
    g.lineBetween(x - a, topY, x - a, from);
    g.lineBetween(x + a, topY, x + a, from);
  }

  hide(): void {
    this.paw.setVisible(false);
    this.arm.clear().setVisible(false);
  }

  /** Re-uploads the texture after the WebGL context comes back. */
  restore(): void {
    (this.textures.get(KEY) as Phaser.Textures.CanvasTexture).refresh();
  }
}

/** How far the paw is lifted `ms` after a drop: up quickly, then an eased settle back. */
export function pawLift(ms: number): number {
  if (ms < 0 || ms >= PAW_LIFT_UP_MS + PAW_LIFT_DOWN_MS) return 0;
  if (ms < PAW_LIFT_UP_MS) {
    const t = ms / PAW_LIFT_UP_MS;
    return PAW_LIFT * (1 - (1 - t) * (1 - t));
  }
  const t = (ms - PAW_LIFT_UP_MS) / PAW_LIFT_DOWN_MS;
  return PAW_LIFT * (1 - t * t * (3 - 2 * t));
}
