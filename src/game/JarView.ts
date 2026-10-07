/**
 * The jar (GAME_DESIGN §13): glass in a bamboo frame with a curved bottom, on two feet on a rug.
 * The art (config/jarArt.ts) is drawn once into textures, behind the cats and in front of them,
 * cut into pieces that only cover drawn parts (JAR_BACK_PIECES, JAR_FRONT_PIECES). They scale
 * with the jar while it grows: every stage has the same jar shape.
 * The rim layer redraws the dashed danger line and the post caps, which flash red in danger.
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
import { JAR_CORNER_RADIUS, JAR_HEIGHT, JAR_WIDTH } from '../config/stages';
import { JAR_PX_PER_UNIT, JAR_RIM_DASH, JAR_RIM_INSET, JAR_RIM_WIDTH } from '../config/view';
import { hexToNumber } from '../core/color';
import { addArtAtlas } from './paint';

const INK = hexToNumber(JAR_INK);
const KEY = 'jar';

interface Piece {
  readonly box: JarPiece;
  readonly image: Phaser.GameObjects.Image;
}

export class JarView {
  private width = -1;
  private flash: boolean | null = null;
  private readonly pieces: Piece[] = [];
  private readonly textures: Phaser.Textures.TextureManager;
  /** The glass behind the cats and its shine in front of them: plain vector shapes. */
  private readonly glass: Phaser.GameObjects.Graphics;
  private readonly shine: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
    private readonly rim: Phaser.GameObjects.Graphics,
  ) {
    this.textures = scene.textures;
    this.glass = scene.add.graphics();
    this.shine = scene.add.graphics();
    backLayer.add(this.glass);
    frontLayer.add(this.shine);
    // Every piece is a frame of one texture, so the jar costs one draw call per layer.
    const parts = (name: string, shapes: PaintShape[], boxes: readonly JarPiece[]) =>
      boxes.map((box, i) => ({ name: `${name}${i}`, shapes, box }));
    const back = parts('back', jarBackShapes(), JAR_BACK_PIECES);
    const front = parts('front', jarFrontShapes(), JAR_FRONT_PIECES);
    addArtAtlas(scene.textures, KEY, [...back, ...front], JAR_PX_PER_UNIT);
    for (const [layer, list] of [
      [backLayer, back],
      [frontLayer, front],
    ] as const) {
      for (const { name, box } of list) {
        const image = scene.add.image(0, 0, KEY, name).setOrigin(0, 0);
        layer.add(image);
        this.pieces.push({ box, image });
      }
    }
    frontLayer.add(rim);
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
      for (const { box, image } of this.pieces) {
        image.setPosition(box.left * s, box.top * s).setScale(s / JAR_PX_PER_UNIT);
      }
      this.drawGlass(s);
      this.drawRim(danger);
    } else if (danger !== this.flash) {
      this.drawRim(danger);
    }
  }

  /** Re-uploads the textures after the WebGL context comes back. */
  restore(): void {
    (this.textures.get(KEY) as Phaser.Textures.CanvasTexture).refresh();
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
    if (danger) {
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
