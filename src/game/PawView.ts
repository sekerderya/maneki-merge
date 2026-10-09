/**
 * The dropper's paw (GAME_DESIGN §2.3, §13): a calico paw hanging from the top of the screen,
 * holding the next cat by the head. The paw and the lower arm are a texture (config/pawArt.ts);
 * the arm above it is plain fur drawn up to the top of the screen, however tall the screen is.
 *
 * With the raster art (config/sceneSprites.ts) the owner's paw image is the texture, and a plain
 * row of its arm is stretched up to the top of the screen.
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
import { PAW_ART, PAW_ART_WORLD_WIDTH } from '../config/sceneSprites';
import { PAW_LIFT, PAW_LIFT_DOWN_MS, PAW_LIFT_UP_MS, PAW_PX_PER_UNIT } from '../config/view';
import { hexToNumber } from '../core/color';
import { imageCanvas } from './artImages';
import type { ArtImages } from './artImages';
import { addArtTexture } from './paint';

const KEY = 'paw';
const ART_KEY = 'paw-art';
/** World units per paw image pixel. */
const ART_SCALE = PAW_ART_WORLD_WIDTH / PAW_ART.pawWidth;
const FUR = hexToNumber(PAW_FUR);
const INK = hexToNumber(PAW_INK);
const SHADE = hexToNumber(PAW_SHADE);

export class PawView {
  private readonly paw: Phaser.GameObjects.Image;
  private readonly arm: Phaser.GameObjects.Graphics;
  /** The raster art's arm: one plain row of the image, stretched up. */
  private readonly artArm: Phaser.GameObjects.Image | null = null;
  private readonly textures: Phaser.Textures.TextureManager;
  private readonly key: string;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, art: ArtImages | null = null) {
    this.textures = scene.textures;
    this.arm = scene.add.graphics();
    if (art) {
      this.key = ART_KEY;
      if (this.textures.exists(ART_KEY)) this.textures.remove(ART_KEY);
      const texture = this.textures.addCanvas(ART_KEY, imageCanvas(art.paw));
      texture?.add('arm', 0, 0, PAW_ART.armRow, PAW_ART.width, 1);
      // The base frame: the whole image (the first added frame would be the default otherwise).
      this.paw = scene.add
        .image(0, 0, ART_KEY, '__BASE')
        .setOrigin(PAW_ART.cx / PAW_ART.width, PAW_ART.bottom / PAW_ART.height)
        .setScale(ART_SCALE);
      this.artArm = scene.add.image(0, 0, ART_KEY, 'arm').setOrigin(PAW_ART.cx / PAW_ART.width, 1);
      layer.add([this.arm, this.artArm, this.paw]);
      this.hide();
      return;
    }
    this.key = KEY;
    const box = PAW_ART_BOX;
    addArtTexture(scene.textures, KEY, pawShapes(), box, PAW_PX_PER_UNIT);
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
    if (this.artArm) {
      // Under the noren the arm ends at `topY`, inside the image: rows above it are cropped off.
      const imageTop = y - PAW_ART.bottom * ART_SCALE;
      if (topY > imageTop) {
        const rows = Math.min(PAW_ART.height - 1, Math.floor((topY - imageTop) / ART_SCALE));
        this.paw.setCrop(0, rows, PAW_ART.width, PAW_ART.height - rows);
      } else {
        this.paw.setCrop();
      }
      // The image's arm ends at its top edge; the stretched row overlaps it by a unit.
      const from = imageTop + 1;
      this.artArm
        .setVisible(topY < from)
        .setPosition(x, from)
        .setScale(ART_SCALE, Math.max(0, from - topY));
      return;
    }
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
    this.artArm?.setVisible(false);
    this.arm.clear().setVisible(false);
  }

  /** Re-uploads the texture after the WebGL context comes back. */
  restore(): void {
    (this.textures.get(this.key) as Phaser.Textures.CanvasTexture).refresh();
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
