import { describe, expect, it } from 'vitest';
import { NOREN_ART, NOREN_HEM, NOREN_SPAN } from '../../src/config/sceneSprites';
import { CAMERA_SIDE_MARGIN_RATIO } from '../../src/config/view';
import { norenLayout } from '../../src/ui/noren';

describe('noren curtain (GAME_DESIGN §13.1)', () => {
  // A 390 × 844 iPhone: the jar's inside is 283 px wide, its rim at 304 px.
  const width = 390 / (1 + 2 * CAMERA_SIDE_MARGIN_RATIO);
  const box = { left: (390 - width) / 2, right: (390 + width) / 2, top: 304 };
  const unit = width / 600;
  const scaleOf = (l: ReturnType<typeof norenLayout>) => l.width / NOREN_ART.width;

  it('has plain fabric between its fixed slices, and its panels a little wider than the view', () => {
    expect(NOREN_ART.sliceTop).toBeGreaterThan(0);
    expect(NOREN_ART.sliceBottom).toBeGreaterThan(NOREN_ART.sliceTop);
    expect(NOREN_ART.hem).toBeLessThanOrEqual(NOREN_ART.height);
    expect(NOREN_ART.right).toBeGreaterThan(NOREN_ART.left);
    expect(NOREN_SPAN).toBeGreaterThan(1 + 2 * CAMERA_SIDE_MARGIN_RATIO);
  });

  it('centres its panels on the jar, just past a phone’s edges', () => {
    const l = norenLayout(box);
    const s = scaleOf(l);
    const panelLeft = l.left + NOREN_ART.left * s;
    const panelRight = l.left + NOREN_ART.right * s;
    expect((panelLeft + panelRight) / 2).toBeCloseTo(195, 6);
    expect(panelLeft).toBeLessThan(0);
    expect(panelRight).toBeGreaterThan(390);
    expect(panelRight - panelLeft).toBeLessThan(390 * 1.1);
  });

  it('hangs its hem NOREN_HEM above the rim and reaches the top when there is room', () => {
    const low = { ...box, top: 500 };
    const l = norenLayout(low);
    const hem = l.top + l.height - (NOREN_ART.height - NOREN_ART.hem) * scaleOf(l);
    expect(hem).toBeCloseTo(500 - NOREN_HEM * unit, 6);
    expect(l.top).toBeCloseTo(0, 6);
    expect(l.height).toBeGreaterThan(l.sliceTop + l.sliceBottom);
  });

  it('pushes the rod and the coin off the top when the hem is high, without squashing them', () => {
    const high = { ...box, top: 150 };
    const l = norenLayout(high);
    expect(l.top).toBeLessThan(0);
    expect(l.height).toBeCloseTo(l.sliceTop + l.sliceBottom, 6);
    expect(l.top + l.height - (NOREN_ART.height - NOREN_ART.hem) * scaleOf(l)).toBeCloseTo(
      150 - NOREN_HEM * unit,
      6,
    );
  });
});
