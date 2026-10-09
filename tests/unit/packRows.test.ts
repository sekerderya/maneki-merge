import { describe, expect, it } from 'vitest';
import { packRows } from '../../src/game/skins/packRows';

/** Whether two placed boxes overlap, `gap` included. */
function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap: number,
): boolean {
  return (
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
  );
}

describe('atlas packing (the cat art)', () => {
  // The ten cat sizes' texture sides at 2.5 px per unit (v0.23.8).
  const sides = [199, 231, 280, 333, 407, 458, 565, 679, 796, 945];
  const boxes = sides.map((s) => ({ w: s, h: s }));

  it('keeps every box inside the atlas, apart from the others', () => {
    const { at, width, height } = packRows(boxes, 2048, 2);
    expect(width).toBeLessThanOrEqual(2048);
    expect(height).toBeLessThanOrEqual(2048);
    const placed = boxes.map((box, i) => ({ ...box, ...(at[i] as { x: number; y: number }) }));
    for (const [i, a] of placed.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(width);
      expect(a.y + a.h).toBeLessThanOrEqual(height);
      for (const b of placed.slice(i + 1)) expect(overlap(a, b, 2)).toBe(false);
    }
  });

  it('puts the tallest boxes in the first row', () => {
    const { at } = packRows(boxes, 2048, 2);
    expect(at[9]).toEqual({ x: 0, y: 0 });
    expect(at[8]?.y).toBe(0);
  });

  it('gives a box wider than a row a row of its own', () => {
    const { at, width, height } = packRows(
      [
        { w: 30, h: 10 },
        { w: 5, h: 5 },
      ],
      20,
      1,
    );
    expect(at).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 11 },
    ]);
    expect(width).toBe(30);
    expect(height).toBe(16);
  });

  it('packs nothing into nothing', () => {
    expect(packRows([], 100, 2)).toEqual({ at: [], width: 0, height: 0 });
  });
});
