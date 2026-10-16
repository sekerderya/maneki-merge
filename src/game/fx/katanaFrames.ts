/**
 * The textures of the Katana (GAME_DESIGN §15.16): the sword, the streaks of light it leaves along
 * its path, and the flashes of its cuts (a cut flash, a glint, a burst of sparks, a swoosh, a strike
 * burst and a soft flash).
 *
 * With the art skin they are the owner's images (docs/ART_ASSETS.md §4.21, config/katanaSprites.ts,
 * `katanaArtFrames`). Otherwise, or until the art is in, they are plain stand-ins drawn here on
 * canvases in the art's colours (a white core, a steel-blue glow, a pink haze). The light is drawn
 * with SCREEN, like Lightning's (LightningFx).
 */
import type Phaser from 'phaser';
import type { KatanaSprites } from '../../config/katanaSprites';
import { KATANA_CORE, KATANA_GLOW, KATANA_HAZE } from '../../config/skin';
import { imageCanvas } from '../artImages';
import { context } from '../skins/canvas';
import type { BoltFrame, RoundFrame } from './lightningFrames';

/** The sword's texture and its two ends in pixels: the hilt's end (`top`) and the point. */
export interface SwordFrame {
  readonly key: string;
  readonly topX: number;
  readonly topY: number;
  readonly tipX: number;
  readonly tipY: number;
}

export interface KatanaFrames {
  readonly sword: SwordFrame;
  /** Straight streaks, lying across their texture from `a` to `b`. */
  readonly slashes: readonly BoltFrame[];
  readonly flash: RoundFrame;
  readonly glint: RoundFrame;
  readonly sparks: RoundFrame;
  readonly swoosh: RoundFrame;
  /** Its sparks fly up from the bottom middle of the texture. */
  readonly strike: RoundFrame;
  readonly glow: RoundFrame;
}

/**
 * The owner's images as frames: `sword` the katana, `images` the effects in the order of
 * `katanaFxSprites` (config/katanaSprites.ts), each made a canvas texture so it comes back after a
 * context loss.
 */
export function katanaArtFrames(
  textures: Phaser.Textures.TextureManager,
  art: KatanaSprites,
  sword: HTMLImageElement,
  images: readonly HTMLImageElement[],
): KatanaFrames {
  const add = (key: string, image: HTMLImageElement | undefined): string => {
    if (!image) throw new Error(`Katana art not loaded: ${key}`);
    if (!textures.exists(key)) textures.addCanvas(key, imageCanvas(image));
    return key;
  };
  let next = 0;
  const round = (s: { file: string; radius: number }): RoundFrame => ({
    key: add(`fx-${s.file}`, images[next++]),
    radius: s.radius,
  });
  const { katana } = art;
  // The order of katanaFxSprites: slashes, flash, glint, sparks, swoosh, strike, glow.
  const slashes = art.slashes.map((s) => ({
    key: add(`fx-${s.file}`, images[next++]),
    ax: s.ax,
    ay: s.ay,
    bx: s.bx,
    by: s.by,
    band: s.band,
  }));
  return {
    sword: {
      key: add('katana-sword', sword),
      topX: katana.topX,
      topY: katana.topY,
      tipX: katana.tipX,
      tipY: katana.tipY,
    },
    slashes,
    flash: round(art.flash),
    glint: round(art.glint),
    sparks: round(art.sparks),
    swoosh: round(art.swoosh),
    strike: round(art.strike),
    glow: round(art.glow),
  };
}

/** Uploads every frame's canvas again (after the WebGL context comes back). */
export function refreshKatanaFrames(
  textures: Phaser.Textures.TextureManager,
  frames: KatanaFrames,
): void {
  const { sword, slashes, flash, glint, sparks, swoosh, strike, glow } = frames;
  for (const { key } of [sword, ...slashes, flash, glint, sparks, swoosh, strike, glow]) {
    if (textures.exists(key)) (textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
  }
}

const SWORD_W = 40;
const SWORD_H = 400;
const HILT_H = 80;
const SLASH_W = 512;
const SLASH_H = 48;
const ROUND_PX = 96;
const PAD = 12;

/** The stand-ins, drawn once and shared by every run. */
export function katanaStandIns(textures: Phaser.Textures.TextureManager): KatanaFrames {
  const add = (key: string, draw: (ctx: CanvasRenderingContext2D) => void, w: number, h = w) => {
    if (!textures.exists(key)) {
      const canvas = document.createElement('canvas');
      draw(context(canvas, w, h));
      textures.addCanvas(key, canvas);
    }
    return key;
  };
  const roundFrame = (name: string, draw: (ctx: CanvasRenderingContext2D) => void): RoundFrame => ({
    key: add(`katana-${name}-stand-in`, draw, 2 * ROUND_PX),
    radius: ROUND_PX - PAD,
  });
  const c = ROUND_PX;
  const r = ROUND_PX - PAD;
  return {
    sword: {
      key: add('katana-sword-stand-in', drawSword, SWORD_W, SWORD_H),
      topX: SWORD_W / 2,
      topY: 0,
      tipX: SWORD_W / 2,
      tipY: SWORD_H,
    },
    slashes: [
      {
        key: add(
          'katana-slash-stand-in',
          (ctx) => line(ctx, PAD, SLASH_H / 2, SLASH_W - PAD, SLASH_H / 2, 1),
          SLASH_W,
          SLASH_H,
        ),
        ax: PAD,
        ay: SLASH_H / 2,
        bx: SLASH_W - PAD,
        by: SLASH_H / 2,
        band: SLASH_H,
      },
    ],
    flash: roundFrame('flash', (ctx) =>
      line(ctx, c - r * 0.8, c + r * 0.8, c + r * 0.8, c - r * 0.8, 0.8),
    ),
    glint: roundFrame('glint', (ctx) => {
      line(ctx, c - r, c, c + r, c, 0.6);
      line(ctx, c, c - r, c, c + r, 0.6);
    }),
    sparks: roundFrame('sparks', (ctx) => {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        line(
          ctx,
          c + Math.cos(a) * r * 0.5,
          c + Math.sin(a) * r * 0.5,
          c + Math.cos(a) * r,
          c + Math.sin(a) * r,
          0.4,
        );
      }
    }),
    swoosh: roundFrame('swoosh', (ctx) => {
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = KATANA_CORE;
      ctx.shadowColor = KATANA_GLOW;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(c + r * 0.5, c, r * 0.9, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
    }),
    strike: roundFrame('strike', (ctx) => {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.15 + (0.7 * i) / 6);
        line(ctx, c, c + r, c + Math.cos(a) * r * 1.6, c + r + Math.sin(a) * r * 1.6, 0.4);
      }
    }),
    glow: roundFrame('glow', (ctx) => {
      const g = ctx.createRadialGradient(c, c, 0, c, c, r);
      g.addColorStop(0, KATANA_CORE);
      g.addColorStop(0.35, KATANA_GLOW);
      g.addColorStop(1, 'rgba(160, 200, 240, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 2 * c, 2 * c);
    }),
  };
}

/** A line of light: a pink haze, a steel-blue glow and a white core, `weight` times as thick. */
function line(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  weight: number,
): void {
  ctx.lineCap = 'round';
  const pass = (width: number, color: string, blur: number): void => {
    ctx.lineWidth = width * weight;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * weight;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  pass(12, KATANA_HAZE, 12);
  pass(6, KATANA_GLOW, 8);
  pass(2.5, KATANA_CORE, 3);
  ctx.shadowBlur = 0;
}

/** A plain katana, point down: a red hilt, a gold guard and a pale steel blade. */
function drawSword(ctx: CanvasRenderingContext2D): void {
  const w = SWORD_W;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3b2620';
  ctx.fillStyle = '#d9483b';
  ctx.fillRect(w * 0.3, 2, w * 0.4, HILT_H - 8);
  ctx.strokeRect(w * 0.3, 2, w * 0.4, HILT_H - 8);
  ctx.fillStyle = '#e2b33f';
  ctx.fillRect(3, HILT_H - 8, w - 6, 8);
  ctx.strokeRect(3, HILT_H - 8, w - 6, 8);
  ctx.fillStyle = '#dfe8f2';
  ctx.beginPath();
  ctx.moveTo(w * 0.28, HILT_H);
  ctx.lineTo(w * 0.72, HILT_H);
  ctx.lineTo(w * 0.72, SWORD_H - 40);
  ctx.lineTo(w * 0.5, SWORD_H - 2);
  ctx.lineTo(w * 0.28, SWORD_H - 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
