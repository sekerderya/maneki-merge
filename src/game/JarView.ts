/**
 * The jar (GAME_DESIGN §13): glass in a bamboo frame with a curved bottom, on two feet on a rug.
 * The art (config/jarArt.ts) is drawn once into textures, behind the cats and in front of them,
 * cut into pieces that only cover drawn parts (JAR_BACK_PIECES, JAR_FRONT_PIECES). They scale
 * with the jar while it grows: every stage has the same jar shape.
 * The rim layer redraws the dashed danger line and the post caps, which flash red in danger.
 *
 * With the raster art (config/sceneSprites.ts) the pieces come from the owner's jar instead: its
 * inner layer (the glass's edge and the rail) behind the cats, its bamboo frame in front. The art's
 * opening is stretched onto the physics jar; its caps don't flash.
 */
import type Phaser from 'phaser';
import {
  JAR_BACK_PIECES,
  JAR_CAP_LINE,
  JAR_CAP_RX,
  JAR_CAP_RY,
  JAR_CAP_Y,
  JAR_CORNER_SHINE,
  JAR_FRONT_PIECES,
  JAR_GLASS,
  JAR_INK,
  JAR_POST_X,
  JAR_RIM_LINE,
  JAR_RIM_LINE_ALPHA,
  JAR_SHINES,
  jarBackShapes,
  jarFrontShapes,
} from '../config/jarArt';
import type { JarPiece } from '../config/jarArt';
import type { PaintShape } from '../config/paintShape';
import { DANGER_RED } from '../config/skin';
import { JAR_ART, JAR_ART_SCALE_X, JAR_ART_SCALE_Y, jarArtToWorld } from '../config/sceneSprites';
import type { PxRect } from '../config/sceneSprites';
import { JAR_CORNER_RADIUS, JAR_HEIGHT, JAR_WIDTH } from '../config/stages';
import { JAR_PX_PER_UNIT, JAR_RIM_DASH, JAR_RIM_INSET, JAR_RIM_WIDTH } from '../config/view';
import { hexToNumber } from '../core/color';
import { imageCanvas } from './artImages';
import type { ArtImages } from './artImages';
import { addArtAtlas } from './paint';

const INK = hexToNumber(JAR_INK);
const KEY = 'jar';

interface Piece {
  /** Its top-left corner in world units of the stage jar. */
  readonly left: number;
  readonly top: number;
  /** World units per texture pixel, across and down. */
  readonly scaleX: number;
  readonly scaleY: number;
  readonly image: Phaser.GameObjects.Image;
}

export class JarView {
  private width = -1;
  private flash: boolean | null = null;
  private readonly pieces: Piece[] = [];
  private readonly textures: Phaser.Textures.TextureManager;
  private readonly keys: string[] = [];
  /** The raster art draws its own caps, which don't flash. */
  private readonly caps: boolean;
  /** The glass behind the cats and its shine in front of them: plain vector shapes. */
  private readonly glass: Phaser.GameObjects.Graphics;
  private readonly shine: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
    private readonly rim: Phaser.GameObjects.Graphics,
    art: ArtImages | null = null,
  ) {
    this.textures = scene.textures;
    this.glass = scene.add.graphics();
    this.shine = scene.add.graphics();
    backLayer.add(this.glass);
    frontLayer.add(this.shine);
    this.caps = !art;
    if (art) {
      this.addArtPieces(scene, backLayer, 'jar-art-back', art.jarBack, JAR_ART.backPieces);
      this.addArtPieces(scene, frontLayer, 'jar-art-front', art.jarFront, JAR_ART.frontPieces);
    } else {
      this.addVectorPieces(scene, backLayer, frontLayer);
    }
    frontLayer.add(rim);
  }

  /** The vector jar: every piece is a frame of one texture, one draw call per layer. */
  private addVectorPieces(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
  ): void {
    const parts = (name: string, shapes: PaintShape[], boxes: readonly JarPiece[]) =>
      boxes.map((box, i) => ({ name: `${name}${i}`, shapes, box }));
    const back = parts('back', jarBackShapes(), JAR_BACK_PIECES);
    const front = parts('front', jarFrontShapes(), JAR_FRONT_PIECES);
    addArtAtlas(scene.textures, KEY, [...back, ...front], JAR_PX_PER_UNIT);
    this.keys.push(KEY);
    const scale = 1 / JAR_PX_PER_UNIT;
    for (const [layer, list] of [
      [backLayer, back],
      [frontLayer, front],
    ] as const) {
      for (const { name, box } of list) {
        const image = scene.add.image(0, 0, KEY, name).setOrigin(0, 0);
        layer.add(image);
        this.pieces.push({ left: box.left, top: box.top, scaleX: scale, scaleY: scale, image });
      }
    }
  }

  /** One layer of the raster jar: a texture of the image, a frame per piece. */
  private addArtPieces(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    key: string,
    source: HTMLImageElement,
    rects: readonly PxRect[],
  ): void {
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.addCanvas(key, imageCanvas(source));
    if (!texture) return;
    this.keys.push(key);
    rects.forEach(({ x, y, w, h }, i) => {
      texture.add(String(i), 0, x, y, w, h);
      const image = scene.add.image(0, 0, key, String(i)).setOrigin(0, 0);
      layer.add(image);
      const at = jarArtToWorld(x, y);
      this.pieces.push({
        left: at.x,
        top: at.y,
        scaleX: JAR_ART_SCALE_X,
        scaleY: JAR_ART_SCALE_Y,
        image,
      });
    });
  }

  /**
   * The jar at `width` world units wide (it keeps its shape, so the height follows). `danger` is
   * null while safe, otherwise whether the flash is in its red phase. The DOM draws the glass,
   * except while the jar grows (`growing`): then the canvas does, as the glass moves.
   */
  draw(width: number, danger: boolean | null, growing: boolean): void {
    this.glass.setVisible(growing);
    if (width !== this.width) {
      this.width = width;
      const s = width / JAR_WIDTH;
      for (const { left, top, scaleX, scaleY, image } of this.pieces) {
        image.setPosition(left * s, top * s).setScale(scaleX * s, scaleY * s);
      }
      this.drawGlass(s);
      this.drawRim(danger);
    } else if (danger !== this.flash) {
      this.drawRim(danger);
    }
  }

  /** Re-uploads the textures after the WebGL context comes back. */
  restore(): void {
    for (const key of this.keys)
      (this.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
  }

  /** The glass (a translucent wash with a thin line inside its edge) and its shine, at scale s. */
  private drawGlass(s: number): void {
    const half = (JAR_WIDTH / 2) * s;
    const h = JAR_HEIGHT * s;
    const r = JAR_CORNER_RADIUS * s;
    const g = this.glass.clear();
    g.fillStyle(0xffffff, JAR_GLASS.alpha);
    g.fillRoundedRect(-half, -h, 2 * half, h, { tl: 0, tr: 0, bl: r, br: r });
    const i = JAR_GLASS.lineInset * s;
    g.lineStyle(JAR_GLASS.lineWidth * s, 0xffffff, JAR_GLASS.lineAlpha);
    g.strokeRoundedRect(-half + i, -h, 2 * (half - i), h - i, {
      tl: 0,
      tr: 0,
      bl: r - i,
      br: r - i,
    });

    const shine = this.shine.clear();
    for (const { x, y, w, h: height, alpha } of JAR_SHINES) {
      shine.fillStyle(0xffffff, alpha);
      shine.fillRoundedRect(x * s, y * s, w * s, height * s, (w / 2) * s);
    }
    const c = JAR_CORNER_SHINE;
    shine.lineStyle(c.width * s, 0xffffff, c.alpha);
    shine.beginPath();
    shine.arc(-half + r, -r, r - c.inset * s, c.from, c.to, true);
    shine.strokePath();
  }

  private drawRim(danger: boolean | null): void {
    this.flash = danger;
    const s = this.width / JAR_WIDTH;
    const half = JAR_WIDTH / 2;
    const rimY = -JAR_HEIGHT * s;
    const g = this.rim.clear();

    // The post caps glow red while the danger flash is on.
    if (danger && this.caps) {
      for (const x of [-JAR_POST_X, JAR_POST_X]) {
        g.fillStyle(DANGER_RED, 1);
        g.fillEllipse(x * s, JAR_CAP_Y * s, 2 * JAR_CAP_RX * s, 2 * JAR_CAP_RY * s);
        g.lineStyle(JAR_CAP_LINE * s, INK, 1);
        g.strokeEllipse(x * s, JAR_CAP_Y * s, 2 * JAR_CAP_RX * s, 2 * JAR_CAP_RY * s);
      }
    }

    // The dashed danger line across the opening.
    const dash = JAR_RIM_DASH * s;
    const color = danger === null ? JAR_RIM_LINE : DANGER_RED;
    const alpha = danger ? 1 : danger === false ? 0.6 : JAR_RIM_LINE_ALPHA;
    g.lineStyle(JAR_RIM_WIDTH * s * (danger === null ? 1 : 1.4), color, alpha);
    const from = (-half + JAR_RIM_INSET) * s;
    const to = (half - JAR_RIM_INSET) * s;
    for (let x = from; x < to; x += 2 * dash) g.lineBetween(x, rimY, Math.min(x + dash, to), rimY);
  }
}
