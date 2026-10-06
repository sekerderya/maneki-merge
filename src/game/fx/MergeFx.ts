/**
 * Payout feedback (GAME_DESIGN §12): a ring that pops out in the tier's colour and a floating gold
 * "+coins" for every merge, Jackpot and popping cat. Both are pooled and animated by hand in
 * `update`, so a burst of merges allocates nothing. Each payout is also reported to `onCoins`
 * (world position), where the coin flight to the HUD starts. Shakes arrive with M9.
 */
import type Phaser from 'phaser';
import { COINS_TEXT_FILL, COINS_TEXT_STROKE } from '../../config/skin';
import {
  FLOAT_TEXT_MS,
  FLOAT_TEXT_RISE,
  FLOAT_TEXT_SIZE,
  FX_POOL_SIZE,
  JACKPOT_TEXT_SCALE,
  MERGE_POP_MS,
  MERGE_POP_SCALE,
} from '../../config/view';
import { hexToNumber } from '../../core/color';
import { formatNumber } from '../../core/format';

const RING_KEY = 'fx-ring';
/** Big enough that the ring of the biggest cat's Jackpot is not upscaled on a phone. */
const RING_PX = 512;

/** A payout appeared at a world point; `big` for a Jackpot. */
export type CoinsListener = (x: number, y: number, big: boolean) => void;

interface Pop {
  startMs: number;
  radius: number;
  readonly ring: Phaser.GameObjects.Image;
}

interface FloatText {
  startMs: number;
  y: number;
  rise: number;
  readonly text: Phaser.GameObjects.Text;
}

export class MergeFx {
  private readonly pops: Pop[] = [];
  private readonly texts: FloatText[] = [];
  private nextPop = 0;
  private nextText = 0;
  private resolution = 1;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly onCoins: CoinsListener,
    /** The cat's colour as `#rrggbb`, for the pop ring. */
    private readonly colorOf: (tier: number) => string,
  ) {
    createRingTexture(scene.textures);
    for (let i = 0; i < FX_POOL_SIZE; i++) {
      const ring = scene.add.image(0, 0, RING_KEY).setVisible(false);
      layer.add(ring);
      this.pops.push({ startMs: -Infinity, radius: 1, ring });
      const text = scene.add
        .text(0, 0, '', {
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontStyle: '700',
          fontSize: `${FLOAT_TEXT_SIZE}px`,
          color: COINS_TEXT_FILL,
          stroke: COINS_TEXT_STROKE,
          strokeThickness: FLOAT_TEXT_SIZE * 0.18,
        })
        .setOrigin(0.5)
        .setVisible(false);
      layer.add(text);
      this.texts.push({ startMs: -Infinity, y: 0, rise: 0, text });
    }
  }

  /** Canvas pixels per world unit, so floating texts render sharp at the current zoom. */
  setResolution(pixelsPerUnit: number): void {
    this.resolution = Math.max(0.25, pixelsPerUnit);
  }

  /**
   * A payout at a world point: the ring of a `tier` cat of `radius` (world units) and a floating
   * "+coins". `big` (a Jackpot) makes the text bigger and sends a coin shower to the HUD. Merges
   * show the new cat's ring, pops the popping cat's.
   */
  payout(
    nowMs: number,
    x: number,
    y: number,
    tier: number,
    radius: number,
    coins: number,
    big = false,
  ): void {
    const pop = this.pops[this.nextPop] as Pop;
    this.nextPop = (this.nextPop + 1) % this.pops.length;
    pop.startMs = nowMs;
    pop.radius = radius;
    pop.ring
      .setPosition(x, y)
      .setTint(hexToNumber(this.colorOf(tier)))
      .setVisible(true);

    const item = this.texts[this.nextText] as FloatText;
    this.nextText = (this.nextText + 1) % this.texts.length;
    item.startMs = nowMs;
    item.y = y;
    item.rise = FLOAT_TEXT_RISE;
    const text = item.text;
    const size = big ? JACKPOT_TEXT_SCALE : 1;
    const resolution = this.resolution * size;
    if (text.style.resolution !== resolution) text.setResolution(resolution);
    text
      .setText(`+${formatNumber(coins)}`)
      .setScale(size)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    this.onCoins(x, y, big);
  }

  update(nowMs: number): void {
    for (const pop of this.pops) {
      if (!pop.ring.visible) continue;
      const t = (nowMs - pop.startMs) / MERGE_POP_MS;
      if (t >= 1 || t < 0) {
        pop.ring.setVisible(false);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      const size = pop.radius * 2 * (1 + (MERGE_POP_SCALE - 1) * ease);
      pop.ring.setDisplaySize(size, size).setAlpha(1 - t);
    }
    for (const item of this.texts) {
      if (!item.text.visible) continue;
      const t = (nowMs - item.startMs) / FLOAT_TEXT_MS;
      if (t >= 1 || t < 0) {
        item.text.setVisible(false);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      item.text.setY(item.y - item.rise * ease).setAlpha(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
    }
  }

  clear(): void {
    for (const pop of this.pops) pop.ring.setVisible(false);
    for (const item of this.texts) item.text.setVisible(false);
  }
}

function createRingTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(RING_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = RING_PX;
  canvas.height = RING_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const c = RING_PX / 2;
  const width = RING_PX * 0.06;
  ctx.beginPath();
  ctx.arc(c, c, c - width / 2 - 1, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  textures.addCanvas(RING_KEY, canvas);
}
