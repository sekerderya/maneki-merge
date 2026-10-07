/**
 * The sakura shrine garden behind the jar (GAME_DESIGN §13), as inline SVG: clouds, sakura trees
 * and branches, a torii and a shrine seen through the glass, stone lanterns either side, and the
 * wooden floor the jar's rug lies on. The sky is the play area's CSS background.
 *
 * It is drawn for the owner's 390 × 844 screen, where the jar's inside spans x 45–345 and its
 * floor is at y 722 (SCENERY_JAR). The game screen scales and moves it so those match the real
 * jar on screen, so the floor and the lanterns line up with the jar on every screen size. Shapes
 * reach far past the box on every side, for screens of other shapes. Built once, deterministic.
 */
import { jarRugShapes } from '../config/jarArt';
import type { PaintShape } from '../config/paintShape';
import { JAR_WIDTH } from '../config/stages';
import { Rng } from '../core/rng';

/** Where the jar sits in the drawing: its inside's centre x, width, and floor y. */
export const SCENERY_JAR = { cx: 195, width: 300, floor: 722 } as const;
export const SCENERY_VIEW = { width: 390, height: 844 } as const;

const INK = '#5b3a2b';
const f = (n: number): number => Math.round(n * 10) / 10;

type Attrs = Record<string, string | number>;
const attrs = (a: Attrs): string =>
  Object.entries(a)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? f(v) : v}"`)
    .join(' ');
const tag = (name: string, a: Attrs): string => `<${name} ${attrs(a)}/>`;
const rect = (x: number, y: number, w: number, h: number, a: Attrs = {}): string =>
  tag('rect', { x, y, width: w, height: h, ...a });
const circle = (cx: number, cy: number, r: number, a: Attrs = {}): string =>
  tag('circle', { cx, cy, r, ...a });
const path = (d: string, a: Attrs = {}): string => tag('path', { d, ...a });
const inked = (fill: string, width = 2.2): Attrs => ({ fill, stroke: INK, 'stroke-width': width });

/** A five-petal sakura blossom. */
function blossomPath(cx: number, cy: number, r: number, rot: number): string {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * Math.PI * 2) / 5 - Math.PI / 2;
    const p = (angle: number, k: number): string =>
      `${f(cx + Math.cos(angle) * r * k)} ${f(cy + Math.sin(angle) * r * k)}`;
    const tip = [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
    const notch = (side: number): string =>
      `${f(tip[0] + Math.cos(a + side * 1.4) * r * 0.16)} ${f(tip[1] + Math.sin(a + side * 1.4) * r * 0.16)}`;
    d += `M${f(cx)} ${f(cy)}Q${p(a - 0.62, 0.78)} ${notch(-1)}L${p(a, 0.82)}L${notch(1)}Q${p(a + 0.62, 0.78)} ${f(cx)} ${f(cy)}Z`;
  }
  return d;
}

function blossoms(
  cx: number,
  cy: number,
  count: number,
  spread: number,
  seed: number,
  size = 7,
  colors = ['#f9c3cf', '#fbd5de', '#f5afc0'],
  line = '#e596a9',
): string {
  const rng = new Rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = Math.sqrt(rng.next()) * spread;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.7;
    const s = size * (0.7 + rng.next() * 0.6);
    out += path(blossomPath(x, y, s, rng.next() * 1.2), {
      fill: colors[i % colors.length] ?? '#f9c3cf',
      stroke: line,
      'stroke-width': 1.2,
    });
    out += circle(x, y, s * 0.22, { fill: '#f07c98' });
  }
  return out;
}

/** A smooth open curve through points (Catmull-Rom). */
function curve(points: readonly (readonly [number, number])[]): string {
  const at = (i: number): readonly [number, number] =>
    points[Math.max(0, Math.min(points.length - 1, i))] ?? [0, 0];
  let d = `M${at(0)[0]} ${at(0)[1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${f(x1 + (x2 - x0) / 6)} ${f(y1 + (y2 - y0) / 6)} ${f(x2 - (x3 - x1) / 6)} ${f(y2 - (y3 - y1) / 6)} ${x2} ${y2}`;
  }
  return d;
}

function branch(
  points: readonly (readonly [number, number])[],
  width: number,
  seed: number,
  size: number,
): string {
  const d = curve(points);
  const line = (stroke: string, w: number, extra: Attrs = {}): string =>
    path(d, { fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', ...extra });
  let out =
    line('#7e5a47', width + 2.5) +
    line('#9c7259', width) +
    line('#b98f72', width * 0.3, { transform: 'translate(-0.8 -1)' });
  points.slice(1).forEach(([x, y], i) => {
    const last = i === points.length - 2;
    out += blossoms(x, y, last ? 10 : 5, 14, seed + i, size);
    if (i % 2 === 0)
      out += circle(x + 9, y + 12, 2.6, { fill: '#f27e98', stroke: '#d9627d', 'stroke-width': 1 });
  });
  return out;
}

function cloud(x: number, y: number, k: number): string {
  const bumps = [
    [0, 0, 22],
    [24, -12, 26],
    [52, -4, 22],
    [74, 4, 16],
    [-20, 8, 14],
    [30, 10, 20],
  ] as const;
  const line = '#ebd8be';
  return (
    bumps
      .map(([dx, dy, r]) =>
        circle(x + dx * k, y + dy * k, r * k, { fill: line, stroke: line, 'stroke-width': 5 }),
      )
      .join('') +
    bumps
      .map(([dx, dy, r]) => circle(x + dx * k, y + dy * k, r * k, { fill: '#fff9f0' }))
      .join('') +
    path(
      `M${f(x - 16 * k)} ${f(y + 6 * k)}Q${f(x + 4 * k)} ${f(y - 8 * k)} ${f(x + 16 * k)} ${f(y + 2 * k)}`,
      {
        fill: 'none',
        stroke: line,
        'stroke-width': 2,
        'stroke-linecap': 'round',
      },
    )
  );
}

function stoneLantern(cx: number, base: number): string {
  const stone = { fill: '#cfc8c0', stroke: '#8d837b', 'stroke-width': 2 };
  return (
    rect(cx - 15, base - 9.5, 30, 9.5, { rx: 2, ...stone }) +
    rect(cx - 5.7, base - 49, 11.4, 40, stone) +
    rect(cx - 17, base - 57, 34, 8.5, { rx: 2, ...stone }) +
    rect(cx - 12.4, base - 80, 24.8, 23, { rx: 2, ...stone }) +
    rect(cx - 6.6, base - 75, 13.3, 13.3, { rx: 2, fill: '#ffe7a3' }) +
    circle(cx, base - 68, 13.3, { fill: '#ffe7a3', opacity: 0.35 }) +
    path(`M${cx - 24.7} ${base - 80}Q${cx} ${base - 99} ${cx + 24.7} ${base - 80}Z`, stone) +
    circle(cx, base - 93, 4.3, stone)
  );
}

function torii(): string {
  const red = inked('#e8735a');
  const dark = inked('#5a4038', 2);
  return (
    rect(14, 428, 13, 240, red) +
    rect(96, 428, 13, 240, red) +
    rect(11, 650, 19, 20, dark) +
    rect(93, 650, 19, 20, dark) +
    rect(0, 454, 124, 10, red) +
    rect(55, 434, 12, 20, inked('#e8735a', 2)) +
    path('M-14 418Q60 426 136 412L138 422Q60 436 -12 430Z', red) +
    path('M-18 409Q60 418 142 402L140 412Q60 427 -16 419Z', inked('#5a4038'))
  );
}

function shrine(): string {
  const wood = inked('#c98a55', 1.8);
  return (
    rect(262, 508, 150, 120, inked('#fff4e4')) +
    [270, 318, 366].map((x) => rect(x, 508, 10, 120, wood)).join('') +
    rect(262, 540, 150, 8, wood) +
    rect(288, 560, 26, 44, inked('#f4e2c8', 1.6)) +
    rect(336, 560, 26, 44, inked('#f4e2c8', 1.6)) +
    path('M240 512Q262 500 270 472L404 472Q410 500 430 512Z', inked('#7f7477', 2.4)) +
    path('M270 472L292 446L384 446L404 472Z', inked('#948a8c')) +
    path('M244 508Q330 516 426 508', { fill: 'none', stroke: '#5e5457', 'stroke-width': 2 }) +
    rect(250, 624, 175, 10, inked('#b47a4b', 2)) +
    rect(312, 480, 20, 12, { rx: 2, ...inked('#e8735a', 1.6) })
  );
}

/** The wooden floor from `top` down, with plank lines that thin out towards the viewer. */
function floor(top: number): string {
  const left = -600;
  const width = SCENERY_VIEW.width + 1200;
  let out = rect(left, top, width, 1600, { fill: '#e6c18f' });
  const rows = [0, 22, 52, 92, 142];
  const rng = new Rng(7);
  rows.slice(1).forEach((dy, i) => {
    const y = top + dy;
    out += path(`M${left} ${y}H${left + width}`, { stroke: '#cda06b', 'stroke-width': 2 });
    const prev = top + (rows[i] ?? 0);
    for (let j = 0; j < 9; j++) {
      const x = left + rng.next() * width;
      out += path(`M${f(x)} ${prev}V${y}`, { stroke: '#cda06b', 'stroke-width': 1.6 });
    }
  });
  return out + rect(left, top, width, 7, { fill: '#c68f59' });
}

function petals(count: number, seed: number): string {
  const rng = new Rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rng.next() * SCENERY_VIEW.width;
    const y = 150 + rng.next() * 520;
    const s = 3 + rng.next() * 3.5;
    out += tag('ellipse', {
      cx: x,
      cy: y,
      rx: s,
      ry: s * 0.55,
      fill: '#f7b6c6',
      opacity: 0.9,
      transform: `rotate(${f(rng.next() * 180)} ${f(x)} ${f(y)})`,
    });
  }
  return out;
}

/** Vector art (config/paintShape.ts) as SVG paths; no clips or gradients needed here. */
function shapesMarkup(shapes: readonly PaintShape[]): string {
  return shapes
    .map((s) => {
      const a: Attrs = { d: s.d, fill: s.fill ?? 'none' };
      if (s.stroke) {
        a['stroke'] = s.stroke;
        a['stroke-width'] = s.width ?? 1;
        a['stroke-linecap'] = s.butt ? 'butt' : 'round';
        a['stroke-linejoin'] = 'round';
      }
      if (s.dash) a['stroke-dasharray'] = s.dash.join(' ');
      if (s.opacity !== undefined) a['opacity'] = s.opacity;
      return tag('path', a);
    })
    .join('');
}

/** The rug under the jar, drawn in world units and placed on the drawing's jar. */
function rug(): string {
  const scale = SCENERY_JAR.width / JAR_WIDTH;
  return `<g transform="translate(${SCENERY_JAR.cx} ${SCENERY_JAR.floor}) scale(${scale})">${shapesMarkup(jarRugShapes())}</g>`;
}

function build(): string {
  const groundTop = 650;
  const floorTop = SCENERY_JAR.floor - 20;
  const trees = ['#f7c8d2', '#fadce3', '#f3b4c3'];
  const body =
    cloud(-6, 196, 1.05) +
    cloud(300, 156, 1) +
    cloud(316, 290, 0.62) +
    cloud(40, 312, 0.55) +
    path('M-600 600Q-200 520 -10 560Q90 500 200 530Q300 560 400 508Q600 470 990 560V700H-600Z', {
      fill: '#f6ddcb',
    }) +
    blossoms(30, 390, 38, 70, 5, 9, trees, '#edb3c1') +
    blossoms(352, 415, 36, 66, 9, 9, trees, '#edb3c1') +
    blossoms(-120, 420, 30, 70, 11, 9, trees, '#edb3c1') +
    blossoms(510, 410, 30, 70, 13, 9, trees, '#edb3c1') +
    torii() +
    shrine() +
    rect(-600, groundTop, SCENERY_VIEW.width + 1200, floorTop - groundTop + 8, {
      fill: '#efdec5',
    }) +
    blossoms(20, groundTop + 4, 18, 34, 21) +
    blossoms(372, groundTop, 18, 34, 23) +
    blossoms(-160, groundTop + 2, 18, 40, 25) +
    blossoms(550, groundTop + 2, 18, 40, 27) +
    stoneLantern(20, floorTop) +
    stoneLantern(371, floorTop) +
    floor(floorTop) +
    rug() +
    branch(
      [
        [-10, 196],
        [40, 176],
        [92, 182],
        [128, 166],
      ],
      6,
      31,
      8,
    ) +
    branch(
      [
        [400, 256],
        [356, 246],
        [318, 260],
        [292, 250],
      ],
      5.5,
      41,
      7.5,
    ) +
    petals(14, 3);
  return (
    `<svg class="play-scenery" viewBox="0 0 ${SCENERY_VIEW.width} ${SCENERY_VIEW.height}" ` +
    `overflow="visible" aria-hidden="true" focusable="false">${body}</svg>`
  );
}

let markup: string | null = null;

/** The garden's SVG markup (built on first use). */
export function sceneryMarkup(): string {
  markup ??= build();
  return markup;
}
