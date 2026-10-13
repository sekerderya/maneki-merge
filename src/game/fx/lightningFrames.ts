/**
 * The textures of a lightning strike (GAME_DESIGN §15.15): chain bolts, sky bolts, an impact flash,
 * a shock ring, small arcs and the crackles laid over a struck ball. Each bolt knows its two ends
 * in texture pixels, so the strike can stretch it between two balls.
 *
 * Until the owner's art comes (docs/ART_ASSETS.md §4.16) they are stand-ins drawn here on canvases:
 * jagged lines in the art's colours (a white core, a yellow glow, a violet haze), shaped by a
 * seeded generator so every launch draws the same ones. They are drawn with light (SCREEN), like the
 * art will be.
 */
import type Phaser from 'phaser';
import { LIGHTNING_CORE, LIGHTNING_GLOW, LIGHTNING_HAZE } from '../../config/skin';
import { Rng } from '../../core/rng';
import { context } from '../skins/canvas';

/** A bolt texture and its two ends: `a` (where it starts) and `b` (where it lands), in pixels. */
export interface BoltFrame {
  readonly key: string;
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  /** How tall its zigzag band is, in pixels (across the line from a to b). */
  readonly band: number;
}

/** A round texture: its key and the radius in pixels of the circle it fills. */
export interface RoundFrame {
  readonly key: string;
  readonly radius: number;
}

export interface LightningFrames {
  /** Chain bolts, lying across their texture. */
  readonly bolts: readonly BoltFrame[];
  /** Sky bolts, standing up: `a` at the top, `b` at the tip where it strikes. */
  readonly sky: readonly BoltFrame[];
  readonly flash: RoundFrame;
  readonly ring: RoundFrame;
  /** Small arcs a waiting lightning ball gives off: `a` on its edge, `b` out in the air. */
  readonly arcs: readonly BoltFrame[];
  /** The crackles over a struck ball. */
  readonly shocks: readonly RoundFrame[];
}

const BOLT_W = 512;
const BOLT_H = 96;
const SKY_W = 160;
const SKY_H = 768;
const ARC_W = 128;
const ARC_H = 48;
const ROUND_PX = 128;
/** Space round every line for its glow. */
const PAD = 16;
const SEED = 0x1f0a7e57;

/** The stand-ins, drawn once and shared by every run. */
export function lightningStandIns(textures: Phaser.Textures.TextureManager): LightningFrames {
  const rng = new Rng(SEED);
  const add = (key: string, canvas: HTMLCanvasElement): string => {
    if (!textures.exists(key)) textures.addCanvas(key, canvas);
    return key;
  };
  const bolts = Array.from({ length: 6 }, (_, i) => {
    const canvas = document.createElement('canvas');
    const ctx = context(canvas, BOLT_W, BOLT_H);
    const y = BOLT_H / 2;
    const points = zigzag(rng, PAD, y, BOLT_W - PAD, y, 7 + 3 * (i % 3), BOLT_H / 2 - PAD - 4);
    const forks = i >= 3 ? forksOf(rng, points, 2, BOLT_H / 2 - PAD) : [];
    glowLines(ctx, [points, ...forks], 1);
    return {
      key: add(`fx-bolt-stand-in-${i}`, canvas),
      ax: PAD,
      ay: y,
      bx: BOLT_W - PAD,
      by: y,
      band: BOLT_H - 2 * PAD,
    };
  });
  const sky = Array.from({ length: 3 }, (_, i) => {
    const canvas = document.createElement('canvas');
    const ctx = context(canvas, SKY_W, SKY_H);
    const x = SKY_W / 2;
    const points = zigzag(rng, x, 0, x, SKY_H - PAD, 14, SKY_W / 2 - PAD - 6);
    const upper = points.slice(0, Math.ceil(points.length / 2));
    glowLines(ctx, [points, ...forksOf(rng, upper, 3, SKY_W / 2 - PAD)], 1.6);
    return {
      key: add(`fx-sky-stand-in-${i}`, canvas),
      ax: x,
      ay: 0,
      bx: x,
      by: SKY_H - PAD,
      band: SKY_W - 2 * PAD,
    };
  });
  const arcs = Array.from({ length: 3 }, (_, i) => {
    const canvas = document.createElement('canvas');
    const ctx = context(canvas, ARC_W, ARC_H);
    const y = ARC_H / 2;
    glowLines(ctx, [zigzag(rng, 8, y, ARC_W - 8, y, 4, ARC_H / 2 - 10)], 0.9);
    return {
      key: add(`fx-arc-stand-in-${i}`, canvas),
      ax: 8,
      ay: y,
      bx: ARC_W - 8,
      by: y,
      band: 28,
    };
  });
  const shocks = Array.from({ length: 3 }, (_, i) => {
    const canvas = document.createElement('canvas');
    const ctx = context(canvas, 2 * ROUND_PX, 2 * ROUND_PX);
    glowLines(ctx, crackle(rng, ROUND_PX, ROUND_PX - PAD), 0.7);
    return { key: add(`fx-shock-stand-in-${i}`, canvas), radius: ROUND_PX - PAD };
  });
  return {
    bolts,
    sky,
    arcs,
    shocks,
    flash: { key: add('fx-flash-stand-in', flash()), radius: ROUND_PX },
    ring: { key: add('fx-ring-stand-in', ring()), radius: ROUND_PX - PAD },
  };
}

type Point = readonly [number, number];

/**
 * A jagged line from (x0, y0) to (x1, y1) in `segments` steps, each kink pushed sideways by up to
 * `amplitude` (less near the ends, so it starts and lands on its points).
 */
function zigzag(
  rng: Rng,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  segments: number,
  amplitude: number,
): Point[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  const nx = -dy / length;
  const ny = dx / length;
  const points: Point[] = [[x0, y0]];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const reach = amplitude * Math.sin(Math.PI * t);
    const side = (rng.next() * 2 - 1) * reach;
    points.push([x0 + dx * t + nx * side, y0 + dy * t + ny * side]);
  }
  points.push([x1, y1]);
  return points;
}

/** `count` short forks off the kinks of `points`, each ending in the air. */
function forksOf(rng: Rng, points: readonly Point[], count: number, reach: number): Point[][] {
  const forks: Point[][] = [];
  for (let i = 0; i < count && points.length > 2; i++) {
    const from = points[1 + rng.int(0, points.length - 3)] as Point;
    const angle = rng.next() * Math.PI * 2;
    const length = reach * (0.6 + 0.4 * rng.next());
    const to: Point = [
      from[0] + Math.cos(angle) * length,
      from[1] + Math.sin(angle) * length * 0.5,
    ];
    forks.push(zigzag(rng, from[0], from[1], to[0], to[1], 3, length * 0.2));
  }
  return forks;
}

/** Arcs from near the middle of a circle out to its edge, and a few along the edge. */
function crackle(rng: Rng, c: number, radius: number): Point[][] {
  const lines: Point[][] = [];
  const spokes = 5;
  for (let i = 0; i < spokes; i++) {
    const angle = ((i + rng.next() * 0.6) / spokes) * Math.PI * 2;
    const start = radius * 0.15 * rng.next();
    const end = radius * (0.85 + 0.12 * rng.next());
    lines.push(
      zigzag(
        rng,
        c + Math.cos(angle) * start,
        c + Math.sin(angle) * start,
        c + Math.cos(angle) * end,
        c + Math.sin(angle) * end,
        5,
        radius * 0.12,
      ),
    );
    const along = angle + 0.5 + rng.next() * 0.4;
    lines.push(
      zigzag(
        rng,
        c + Math.cos(angle) * end,
        c + Math.sin(angle) * end,
        c + Math.cos(along) * radius * 0.92,
        c + Math.sin(along) * radius * 0.92,
        3,
        radius * 0.05,
      ),
    );
  }
  return lines;
}

/** The lines in light: a violet haze, a yellow glow and a white core, `weight` times as thick. */
function glowLines(ctx: CanvasRenderingContext2D, lines: readonly Point[][], weight: number): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const pass = (width: number, color: string, blur: number): void => {
    ctx.lineWidth = width * weight;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * weight;
    for (const line of lines) {
      ctx.beginPath();
      for (const [x, y] of line) ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  pass(10, LIGHTNING_HAZE, 14);
  pass(5, LIGHTNING_GLOW, 8);
  pass(2, LIGHTNING_CORE, 3);
  ctx.shadowBlur = 0;
}

/** A soft white-yellow disc of light. */
function flash(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = context(canvas, 2 * ROUND_PX, 2 * ROUND_PX);
  const glow = ctx.createRadialGradient(ROUND_PX, ROUND_PX, 0, ROUND_PX, ROUND_PX, ROUND_PX);
  glow.addColorStop(0, LIGHTNING_CORE);
  glow.addColorStop(0.25, LIGHTNING_GLOW);
  glow.addColorStop(0.6, LIGHTNING_HAZE);
  glow.addColorStop(1, 'rgba(176, 140, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 2 * ROUND_PX, 2 * ROUND_PX);
  return canvas;
}

/** A thin glowing ring. */
function ring(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = context(canvas, 2 * ROUND_PX, 2 * ROUND_PX);
  const points: Point[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    points.push([
      ROUND_PX + Math.cos(a) * (ROUND_PX - PAD),
      ROUND_PX + Math.sin(a) * (ROUND_PX - PAD),
    ]);
  }
  glowLines(ctx, [points], 0.8);
  return canvas;
}
