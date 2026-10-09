import { describe, expect, it } from 'vitest';
import { STAGE_ZOOM } from '../../src/config/view';
import { CAMERA_SHARED_HEADROOM_RATIO, CAMERA_SPARE_BELOW_RATIO } from '../../src/config/view';
import {
  easeInOut,
  fitCamera,
  framedRegion,
  growFrame,
  scaleFrame,
  worldToView,
} from '../../src/game/cameraFit';
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
  const geo = jarGeometry(1);

  it.each(viewports)('shows the whole jar in %ix%i', (w, h) => {
    const fit = fitCamera(geo, w, h);
    const view = visible(fit, w, h);
    const region = framedRegion(geo);
    const eps = 1e-6;
    expect(view.left).toBeLessThanOrEqual(-region.width / 2 + eps);
    expect(view.right).toBeGreaterThanOrEqual(region.width / 2 - eps);
    expect(view.top).toBeLessThanOrEqual(region.top + eps);
    expect(view.bottom).toBeGreaterThanOrEqual(region.bottom - eps);
    // The dropper band (and the biggest dropped cat in it) is on screen.
    expect(view.top).toBeLessThan(geo.dropY - geo.headroom / 2 + eps);
    // Letterboxed: one of the two axes is used fully.
    const fillsWidth = Math.abs(view.right - view.left - region.width) < 1e-6;
    const fillsHeight = Math.abs(view.bottom - view.top - region.height) < 1e-6;
    expect(fillsWidth || fillsHeight).toBe(true);
  });

  it.each(viewports)(
    'shares spare height between below the floor and above the dropper (%ix%i)',
    (w, h) => {
      const fit = fitCamera(geo, w, h);
      const view = visible(fit, w, h);
      const region = framedRegion(geo);
      const below = view.bottom - region.bottom;
      const above = region.top - view.top;
      expect(below).toBeGreaterThanOrEqual(-1e-6);
      // The dropper band past its shared part counts as spare above.
      const reserved = geo.headroom - CAMERA_SHARED_HEADROOM_RATIO * geo.width;
      if (below + above >= reserved) {
        expect(below / (below + above + reserved)).toBeCloseTo(CAMERA_SPARE_BELOW_RATIO, 9);
      } else {
        expect(below).toBeLessThanOrEqual(below + above);
      }
      // 0 keeps the floor margin on the bottom edge.
      expect(visible(fitCamera(geo, w, h, 0), w, h).bottom).toBeCloseTo(region.bottom, 6);
    },
  );

  it('puts the jar below the HUD with room for the jar art’s frame (v0.17)', () => {
    // A 390 × 844 iPhone: 47 px status bar, HUD down to 173 px. The jar's inside is 283 px wide
    // (300 px in the owner's v0.14 screen, before the thicker bamboo of the jar art), its rim at
    // 304 px and its floor at 713 px; the higher dropper of v0.21.1 left them there.
    const [w, h, hud] = [390, 844, 173];
    const fit = fitCamera(geo, w, h, undefined, hud);
    expect(geo.width * fit.zoom).toBeCloseTo(390 / 1.38, 6);
    expect(Math.abs(worldToView(fit, w, h, 0, geo.rimY).y - 304)).toBeLessThan(1);
    expect(Math.abs(worldToView(fit, w, h, 0, 0).y - 713)).toBeLessThan(1);
  });

  it.each(viewports)('keeps the dropper band below the HUD (%ix%i)', (w, h) => {
    const hud = h * 0.2;
    const fit = fitCamera(geo, w, h, undefined, hud);
    const bandTop = worldToView(fit, w, h, 0, geo.rimY - geo.headroom).y;
    expect(bandTop).toBeGreaterThanOrEqual(hud - 1e-6);
    // The floor margin still ends on screen.
    expect(worldToView(fit, w, h, 0, framedRegion(geo).bottom).y).toBeLessThanOrEqual(h + 1e-6);
  });

  it('keeps the floor and the jar width still on screen while the jar grows', () => {
    const [w, h] = [975, 1750];
    const at = (t: number) => {
      const frame = growFrame(geo, STAGE_ZOOM, t);
      const fit = fitCamera(frame, w, h);
      return { floor: worldToView(fit, w, h, 0, 0).y, width: frame.width * fit.zoom };
    };
    for (const t of [0.25, 0.5, 1]) {
      expect(at(t).floor).toBeCloseTo(at(0).floor, 6);
      expect(at(t).width).toBeCloseTo(at(0).width, 6);
    }
  });

  it('survives a zero-sized viewport', () => {
    const fit = fitCamera(geo, 0, 0);
    expect(Number.isFinite(fit.zoom)).toBe(true);
    expect(fit.zoom).toBeGreaterThan(0);
  });

  it('grows a jar by a constant ratio and eases in and out', () => {
    const frame = { width: geo.width, height: geo.height, headroom: geo.headroom };
    expect(growFrame(geo, STAGE_ZOOM, 0)).toEqual(frame);
    expect(growFrame(geo, STAGE_ZOOM, 1).width).toBeCloseTo(geo.width * STAGE_ZOOM, 9);
    expect(growFrame(geo, STAGE_ZOOM, 0.5).height).toBeCloseTo(
      geo.height * Math.sqrt(STAGE_ZOOM),
      9,
    );
    expect(scaleFrame(geo, 2)).toEqual({
      width: 2 * geo.width,
      height: 2 * geo.height,
      headroom: 2 * geo.headroom,
    });
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
  });
});
