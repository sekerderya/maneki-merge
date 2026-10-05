import { describe, expect, it } from 'vitest';
import { STAGE_COUNT } from '../../src/config/stages';
import { easeInOut, fitCamera, framedRegion, lerpFrame } from '../../src/game/cameraFit';
import { jarGeometry } from '../../src/physics/geometry';

/** The world rectangle a fit shows in a viewport. */
function visible(fit: ReturnType<typeof fitCamera>, w: number, h: number) {
  const halfW = w / fit.zoom / 2;
  const halfH = h / fit.zoom / 2;
  return {
    left: fit.centerX - halfW,
    right: fit.centerX + halfW,
    top: fit.centerY - halfH,
    bottom: fit.centerY + halfH,
  };
}

describe('camera fit (TECH_SPEC §4)', () => {
  const viewports: [number, number][] = [
    [390 * 2.5, 700 * 2.5], // tall phone play band
    [375 * 2, 590 * 2], // short phone
    [820 * 2, 1080 * 2], // tablet
    [1200, 700], // wide desktop window
  ];

  for (let stage = 1; stage <= STAGE_COUNT; stage++) {
    it.each(viewports)(`shows the whole stage-${stage} jar in %ix%i`, (w, h) => {
      const geo = jarGeometry(stage);
      const fit = fitCamera(geo, w, h);
      const view = visible(fit, w, h);
      const region = framedRegion(geo);
      const eps = 1e-6;
      expect(view.left).toBeLessThanOrEqual(-region.width / 2 + eps);
      expect(view.right).toBeGreaterThanOrEqual(region.width / 2 - eps);
      expect(view.top).toBeLessThanOrEqual(region.top + eps);
      // The floor margin sits exactly on the bottom edge: the floor stays near the bottom.
      expect(view.bottom).toBeCloseTo(region.bottom, 6);
      // The dropper band (and the biggest dropped cat in it) is on screen.
      expect(view.top).toBeLessThan(geo.dropY - geo.headroom / 2 + eps);
      // Letterboxed: one of the two axes is used fully.
      const fillsWidth = Math.abs(view.right - view.left - region.width) < 1e-6;
      const fillsHeight = Math.abs(view.bottom - view.top - region.height) < 1e-6;
      expect(fillsWidth || fillsHeight).toBe(true);
    });
  }

  it('keeps the same on-screen jar size at every stage', () => {
    const [w, h] = [975, 1750];
    const widths = [1, 2, 3, 4, 5].map(
      (s) => jarGeometry(s).width * fitCamera(jarGeometry(s), w, h).zoom,
    );
    for (const width of widths) expect(width).toBeCloseTo(widths[0] as number, 0);
  });

  it('survives a zero-sized viewport', () => {
    const fit = fitCamera(jarGeometry(1), 0, 0);
    expect(Number.isFinite(fit.zoom)).toBe(true);
    expect(fit.zoom).toBeGreaterThan(0);
  });

  it('blends two jars and eases in and out', () => {
    const a = jarGeometry(1);
    const b = jarGeometry(2);
    expect(lerpFrame(a, b, 0)).toEqual({ width: a.width, height: a.height, headroom: a.headroom });
    expect(lerpFrame(a, b, 1)).toEqual({ width: b.width, height: b.height, headroom: b.headroom });
    expect(lerpFrame(a, b, 0.5).width).toBeCloseTo((a.width + b.width) / 2);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
  });
});
