/**
 * The jar (GAME_DESIGN §13): glass in a square bamboo frame, on two feet on a rug.
 * The art (config/jarArt.ts) is drawn once into textures, behind the cats and in front of them,
 * cut into pieces that only cover drawn parts (JAR_BACK_PIECES, JAR_FRONT_PIECES). They scale
 * with the jar while it grows: every stage has the same jar shape.
 * The dashed danger line across the opening and the post caps flash red in danger. The dashes and
 * the glass's shine strips are images, not Graphics: Phaser re-traces every Graphics path each
 * frame, and the strips' round ends alone are 1200 points (TECH_SPEC §13).
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
import { JAR_HEIGHT, JAR_WIDTH } from '../config/stages';
import {
  CAT_PX_PER_UNIT,
  JAR_PX_PER_UNIT,
  JAR_RIM_DASH,
  JAR_RIM_INSET,
  JAR_RIM_WIDTH,
} from '../config/view';
import { hexToNumber } from '../core/color';
import { imageCanvas } from './artImages';
import type { ArtImages } from './artImages';
import { addArtAtlas } from './paint';

const INK = hexToNumber(JAR_INK);
const KEY = 'jar';
const SHINE_KEY = 'jar-shine';
/** The shine strips' texture: like the cats', never upscaled on a phone or tablet. */
const SHINE_PX_PER_UNIT = CAT_PX_PER_UNIT;
/** Round each strip in its texture, so its anti-aliased edge isn't cut. */
const SHINE_PAD_PX = 2;
/** Phaser's plain white texture: the rim's dashes are tinted rectangles of it. */
const WHITE_KEY = '__WHITE';
/** The dashes start JAR_RIM_INSET in from each wall, JAR_RIM_DASH long with gaps as long. */
const RIM_FROM = -JAR_WIDTH / 2 + JAR_RIM_INSET;
const RIM_TO = JAR_WIDTH / 2 - JAR_RIM_INSET;
const RIM_DASHES = Math.ceil((RIM_TO - RIM_FROM) / (2 * JAR_RIM_DASH));

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
  /** The glass behind the cats: a plain vector shape (the DOM draws it unless the jar grows). */
  private readonly glass: Phaser.GameObjects.Graphics;
  private readonly dashes: Phaser.GameObjects.Image[] = [];

  constructor(
    scene: Phaser.Scene,
    backLayer: Phaser.GameObjects.Layer,
    frontLayer: Phaser.GameObjects.Layer,
    private readonly rim: Phaser.GameObjects.Graphics,
    art: ArtImages | null = null,
  ) {
    this.textures = scene.textures;
    this.glass = scene.add.graphics();
    backLayer.add(this.glass);
    this.addShine(scene, frontLayer);
    this.caps = !art;
    if (art) {
      this.addArtPieces(scene, backLayer, 'jar-art-back', art.jarBack, JAR_ART.backPieces);
      this.addArtPieces(scene, frontLayer, 'jar-art-front', art.jarFront, JAR_ART.frontPieces);
    } else {
      this.addVectorPieces(scene, backLayer, frontLayer);
    }
    for (let i = 0; i < RIM_DASHES; i++) {
      const dash = scene.add.image(0, 0, WHITE_KEY).setOrigin(0, 0.5);
      frontLayer.add(dash);
      this.dashes.push(dash);
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

  /**
   * The glass's shine in front of the cats (behind the frame): a frame per strip of one texture,
   * white, at the strip's alpha.
   */
  private addShine(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer): void {
    if (this.textures.exists(SHINE_KEY)) this.textures.remove(SHINE_KEY);
    const texture = this.textures.addCanvas(SHINE_KEY, shineCanvas());
    if (!texture) return;
    this.keys.push(SHINE_KEY);
    const pad = SHINE_PAD_PX / SHINE_PX_PER_UNIT;
    const scale = 1 / SHINE_PX_PER_UNIT;
    shineFrames().forEach(({ x, y, w, h }, i) => {
      texture.add(String(i), 0, x, y, w, h);
      const shine = JAR_SHINES[i];
      if (!shine) return;
      const image = scene.add.image(0, 0, SHINE_KEY, String(i)).setOrigin(0, 0);
      image.setAlpha(shine.alpha);
      layer.add(image);
      this.pieces.push({
        left: shine.x - pad,
        top: shine.y - pad,
        scaleX: scale,
        scaleY: scale,
        image,
      });
    });
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

  /** The glass (a translucent wash with a thin line inside its edge), at scale s. */
  private drawGlass(s: number): void {
    const half = (JAR_WIDTH / 2) * s;
    const h = JAR_HEIGHT * s;
    const g = this.glass.clear();
    g.fillStyle(0xffffff, JAR_GLASS.alpha);
    g.fillRect(-half, -h, 2 * half, h);
    const i = JAR_GLASS.lineInset * s;
    g.lineStyle(JAR_GLASS.lineWidth * s, 0xffffff, JAR_GLASS.lineAlpha);
    g.strokeRect(-half + i, -h, 2 * (half - i), h - i);
  }

  private drawRim(danger: boolean | null): void {
    this.flash = danger;
    const s = this.width / JAR_WIDTH;
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
    const color = danger === null ? JAR_RIM_LINE : DANGER_RED;
    const alpha = danger ? 1 : danger === false ? 0.6 : JAR_RIM_LINE_ALPHA;
    const width = JAR_RIM_WIDTH * s * (danger === null ? 1 : 1.4);
    this.dashes.forEach((dash, i) => {
      const from = RIM_FROM + 2 * JAR_RIM_DASH * i;
      const to = Math.min(from + JAR_RIM_DASH, RIM_TO);
      dash
        .setPosition(from * s, rimY)
        .setDisplaySize((to - from) * s, width)
        .setTint(color)
        .setAlpha(alpha);
    });
  }
}

/** Where each shine strip sits in the shine texture, in texture pixels (padding included). */
function shineFrames(): { x: number; y: number; w: number; h: number }[] {
  let x = 0;
  return JAR_SHINES.map(({ w, h }) => {
    const frame = {
      x,
      y: 0,
      w: Math.ceil(w * SHINE_PX_PER_UNIT + 2 * SHINE_PAD_PX),
      h: Math.ceil(h * SHINE_PX_PER_UNIT + 2 * SHINE_PAD_PX),
    };
    x += frame.w;
    return frame;
  });
}

/** The shine strips side by side, white: rounded at both ends (radius half their width). */
function shineCanvas(): HTMLCanvasElement {
  const frames = shineFrames();
  const canvas = document.createElement('canvas');
  canvas.width = frames.reduce((sum, f) => sum + f.w, 0);
  canvas.height = Math.max(...frames.map((f) => f.h));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#ffffff';
  JAR_SHINES.forEach(({ w, h }, i) => {
    const frame = frames[i];
    if (!frame) return;
    const width = w * SHINE_PX_PER_UNIT;
    const height = h * SHINE_PX_PER_UNIT;
    const r = width / 2;
    const left = frame.x + SHINE_PAD_PX;
    const top = SHINE_PAD_PX;
    ctx.beginPath();
    ctx.arc(left + r, top + r, r, Math.PI, 0);
    ctx.arc(left + r, top + height - r, r, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  });
  return canvas;
}
