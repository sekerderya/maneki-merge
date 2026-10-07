/** Canvas helpers the cat skins share: sized 2D contexts and upright tier numbers. */
import { CAT_NUMBER_HALO_RATIO } from '../../config/view';

const FONT_FAMILY = 'Fredoka, system-ui, sans-serif';
const PAD_PX = 2;

export function context(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

/** `text` in bold Fredoka at `fontPx`, with a halo in `halo`, its ink box centred on the canvas. */
export function drawNumber(
  canvas: HTMLCanvasElement,
  text: string,
  fontPx: number,
  color: string,
  halo: string,
): void {
  const font = `700 ${fontPx}px ${FONT_FAMILY}`;
  const haloPx = fontPx * CAT_NUMBER_HALO_RATIO;

  const probe = context(canvas, 1, 1);
  probe.font = font;
  const m = probe.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const inkHeight = ascent + m.actualBoundingBoxDescent;
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;

  const ctx = context(canvas, inkWidth + 2 * (haloPx + PAD_PX), inkHeight + 2 * (haloPx + PAD_PX));
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Centre the ink box, so the number sits in the middle of its plate.
  const x = (canvas.width - inkWidth) / 2 + m.actualBoundingBoxLeft;
  const y = (canvas.height - inkHeight) / 2 + ascent;
  ctx.lineJoin = 'round';
  ctx.lineWidth = haloPx;
  ctx.strokeStyle = halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
