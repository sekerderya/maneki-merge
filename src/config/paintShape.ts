/**
 * Vector art as data (GAME_DESIGN §13): filled and/or stroked SVG paths, optionally clipped,
 * shifted or filled with a linear gradient. The game draws them into canvas textures with
 * `Path2D` (game/paint.ts). Pure data and path math, no DOM.
 */

export interface GradientStop {
  readonly offset: number;
  readonly color: string;
  readonly alpha: number;
}

export interface LinearGradient {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly stops: readonly GradientStop[];
}

export interface PaintShape {
  readonly d: string;
  readonly fill?: string;
  /** Fills with this gradient instead of `fill`. */
  readonly gradient?: LinearGradient;
  readonly stroke?: string;
  readonly width?: number;
  readonly opacity?: number;
  readonly dash?: readonly number[];
  /** Square-cut line ends; strokes have round ends and joins otherwise. */
  readonly butt?: boolean;
  /** Drawn shifted by (dx, dy). */
  readonly dx?: number;
  readonly dy?: number;
  /** Only the part inside this path shows. */
  readonly clip?: string;
}

/** Rounds to 2 decimals, so paths stay short. */
export const r2 = (n: number): number => Math.round(n * 100) / 100;

export function ellipsePathRotated(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  degrees = 0,
): string {
  const a = (degrees * Math.PI) / 180;
  const ux = Math.cos(a) * rx;
  const uy = Math.sin(a) * rx;
  const p = (sign: number): string => `${r2(cx + sign * ux)} ${r2(cy + sign * uy)}`;
  return `M${p(-1)}A${r2(rx)} ${r2(ry)} ${r2(degrees)} 1 0 ${p(1)}A${r2(rx)} ${r2(ry)} ${r2(degrees)} 1 0 ${p(-1)}Z`;
}

export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.min(r, w / 2, h / 2);
  return (
    `M${r2(x + k)} ${r2(y)}L${r2(x + w - k)} ${r2(y)}Q${r2(x + w)} ${r2(y)} ${r2(x + w)} ${r2(y + k)}` +
    `L${r2(x + w)} ${r2(y + h - k)}Q${r2(x + w)} ${r2(y + h)} ${r2(x + w - k)} ${r2(y + h)}` +
    `L${r2(x + k)} ${r2(y + h)}Q${r2(x)} ${r2(y + h)} ${r2(x)} ${r2(y + h - k)}` +
    `L${r2(x)} ${r2(y + k)}Q${r2(x)} ${r2(y)} ${r2(x + k)} ${r2(y)}Z`
  );
}

export function polygonPath(points: readonly (readonly [number, number])[]): string {
  return 'M' + points.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L') + 'Z';
}

export function linePath(x0: number, y0: number, x1: number, y1: number): string {
  return `M${r2(x0)} ${r2(y0)}L${r2(x1)} ${r2(y1)}`;
}

/** A closed smooth blob through `points` (Catmull-Rom turned into cubic Béziers). */
export function blobPath(points: readonly (readonly [number, number])[]): string {
  const n = points.length;
  const at = (i: number): readonly [number, number] => points[((i % n) + n) % n] ?? [0, 0];
  let d = `M${r2(at(0)[0])} ${r2(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d +=
      `C${r2(x1 + (x2 - x0) / 6)} ${r2(y1 + (y2 - y0) / 6)} ` +
      `${r2(x2 - (x3 - x1) / 6)} ${r2(y2 - (y3 - y1) / 6)} ${r2(x2)} ${r2(y2)}`;
  }
  return d + 'Z';
}
