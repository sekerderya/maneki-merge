import { describe, expect, it } from 'vitest';
import { CLOUD_SPRITES } from '../../src/config/cloudSprites';
import { CLOUD_LAYER_SCALES } from '../../src/config/view';
import {
  CLOUDS_COVER_MS,
  CLOUDS_PART_MS,
  CLOUDS_TOTAL_MS,
  cloudLayout,
} from '../../src/ui/fx/cloudLayout';
import type { CloudPlace } from '../../src/ui/fx/cloudLayout';
import { EXPANSION_REVEAL_MS, EXPANSION_ZOOM_MS } from '../../src/config/timings';

/** A point well inside the cloud's puffy shape: an ellipse inside its box. */
function covers(c: CloudPlace, x: number, y: number): boolean {
  const dx = (x - c.x) / (0.4 * c.width);
  const dy = (y - c.y) / (0.34 * c.height);
  return dx * dx + dy * dy <= 1;
}

describe('growth clouds (GAME_DESIGN §7.1)', () => {
  it('has the owner’s nine clouds', () => {
    expect(CLOUD_SPRITES).toHaveLength(9);
  });

  it.each([
    [390, 844],
    [375, 667],
    [430, 932],
    [768, 1024],
  ])('covers a %i × %i play area without a gap', (width, height) => {
    const places = cloudLayout(width, height);
    expect(places.length).toBeGreaterThan(10);
    expect(places.length).toBeLessThan(80);
    for (let y = 0; y <= height; y += 6) {
      for (let x = 0; x <= width; x += 6) {
        expect(
          places.some((c) => covers(c, x, y)),
          `${x}, ${y}`,
        ).toBe(true);
      }
    }
  });

  it('draws the back layer first and parts each half its own way', () => {
    const places = cloudLayout(390, 844);
    const layers = places.map((c) => c.layer);
    expect(layers).toEqual([...layers].sort((a, b) => a - b));
    expect(new Set(layers).size).toBe(CLOUD_LAYER_SCALES.length);
    for (const c of places) {
      if (c.x < 195) expect(c.side).toBe(-1);
      if (c.x > 195) expect(c.side).toBe(1);
      expect(c.sprite).toBeGreaterThanOrEqual(0);
      expect(c.sprite).toBeLessThan(CLOUD_SPRITES.length);
    }
    // The middle opens first.
    const middle = places.reduce((a, b) => (Math.abs(a.x - 195) < Math.abs(b.x - 195) ? a : b));
    expect(Math.min(...places.map((c) => c.partDelayMs))).toBe(middle.partDelayMs);
  });

  it('is the same wall every time, and nothing for an empty area', () => {
    expect(cloudLayout(390, 844)).toEqual(cloudLayout(390, 844));
    expect(cloudLayout(0, 844)).toEqual([]);
  });

  it('covers the screen, then parts, in the zoom phase; the doors come 1.5 s later', () => {
    expect(CLOUDS_COVER_MS).toBeLessThan(CLOUDS_PART_MS);
    expect(CLOUDS_TOTAL_MS).toBe(EXPANSION_ZOOM_MS);
    expect(EXPANSION_REVEAL_MS).toBe(1500);
  });
});
