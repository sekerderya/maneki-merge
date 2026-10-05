import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { STAGE_COUNT } from '../../src/config/stages';
import { EXPANSION_DURATION_MS, EXPANSION_ZOOM_MS } from '../../src/config/timings';
import { EXPANSION_WALL_LAG } from '../../src/config/view';
import { fitCamera, worldToView } from '../../src/game/cameraFit';
import type { JarFrame } from '../../src/game/cameraFit';
import { expansionFrames, wallProgress, zoomProgressAt } from '../../src/game/expansionView';
import { jarGeometry } from '../../src/physics/geometry';
import type { ExpansionView } from '../../src/run/RunController';

const ZOOM_STEPS = stepsFor(EXPANSION_ZOOM_MS);
const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);

/** The run's expansion view after `steps` ticks (as RunController computes it). */
function view(from: number, steps: number): ExpansionView {
  return {
    from,
    to: from + 1,
    elapsedMs: (steps / EXPANSION_STEPS) * EXPANSION_DURATION_MS,
    progress: steps / EXPANSION_STEPS,
    zoomProgress: Math.min(1, steps / ZOOM_STEPS),
    phase: steps >= ZOOM_STEPS ? 'reveal' : 'zoom',
  };
}

function same(a: JarFrame, b: JarFrame): void {
  expect(a.width).toBeCloseTo(b.width, 6);
  expect(a.height).toBeCloseTo(b.height, 6);
  expect(a.headroom).toBeCloseTo(b.headroom, 6);
}

const VIEWPORTS: [number, number][] = [
  [390 * 2.5, 700 * 2.5],
  [375 * 2, 590 * 2],
  [820 * 2, 1080 * 2],
  [1200, 700],
];

describe('expansion frames (GAME_DESIGN §7.1, TECH_SPEC §4)', () => {
  it('shows the current jar outside the zoom', () => {
    const geo = jarGeometry(2);
    expect(expansionFrames(geo, null, 0.5)).toEqual({ camera: geo, jar: geo });
    // During the reveal the run is at the new stage already.
    expect(expansionFrames(geo, view(1, ZOOM_STEPS), 0.5)).toEqual({ camera: geo, jar: geo });
  });

  for (let from = 1; from < STAGE_COUNT; from++) {
    it(`blends stage ${from} into stage ${from + 1}, walls trailing the camera`, () => {
      const a = jarGeometry(from);
      const b = jarGeometry(from + 1);
      const start = expansionFrames(a, view(from, 0), 0);
      same(start.camera, a);
      same(start.jar, a);
      const end = expansionFrames(a, view(from, ZOOM_STEPS - 1), 1);
      same(end.camera, b);
      same(end.jar, b);

      let prev = start;
      for (let step = 0; step < ZOOM_STEPS; step++) {
        for (const alpha of [0, 0.25, 0.5, 0.75]) {
          const f = expansionFrames(a, view(from, step), alpha);
          // Both only ever grow, and the jar always fits inside what the camera frames.
          expect(f.camera.width).toBeGreaterThanOrEqual(prev.camera.width - 1e-9);
          expect(f.jar.width).toBeGreaterThanOrEqual(prev.jar.width - 1e-9);
          expect(f.jar.width).toBeLessThanOrEqual(f.camera.width + 1e-9);
          expect(f.jar.height).toBeLessThanOrEqual(f.camera.height + 1e-9);
          prev = f;
        }
      }
    });
  }

  it('keeps the floor still on screen and visibly slides the walls', () => {
    for (const [w, h] of VIEWPORTS) {
      const a = jarGeometry(1);
      const floorY = (frame: JarFrame) => worldToView(fitCamera(frame, w, h), w, h, 0, 0).y;
      const wallX = (f: ReturnType<typeof expansionFrames>) =>
        worldToView(fitCamera(f.camera, w, h), w, h, f.jar.width / 2, 0).x;
      const start = expansionFrames(a, view(1, 0), 0);
      const floor = floorY(start.camera);
      const wall = wallX(start);
      let innermost = wall;
      for (let step = 0; step < ZOOM_STEPS; step += 4) {
        const f = expansionFrames(a, view(1, step), 0);
        expect(Math.abs(floorY(f.camera) - floor)).toBeLessThan(0.5);
        innermost = Math.min(innermost, wallX(f));
      }
      // The view pulls back first, so the right wall moves in on screen (by a few percent of the
      // jar's width) and then out again.
      expect((wall - innermost) / (wall - w / 2)).toBeGreaterThan(0.04);
      const end = expansionFrames(a, view(1, ZOOM_STEPS - 1), 1);
      expect(Math.abs(wallX(end) - wall)).toBeLessThan(1);
    }
  });

  it('moves smoothly between ticks: alpha bridges one tick to the next', () => {
    const a = jarGeometry(3);
    for (const step of [0, 10, 70, 140]) {
      const late = expansionFrames(a, view(3, step), 0.999999);
      const next = expansionFrames(a, view(3, step + 1), 0);
      expect(late.camera.width).toBeCloseTo(next.camera.width, 3);
      expect(late.jar.width).toBeCloseTo(next.jar.width, 3);
    }
    expect(zoomProgressAt(view(1, 72), 0.5)).toBeCloseTo((72.5 * PHYSICS_STEP_MS) / 1200, 9);
    expect(zoomProgressAt(view(1, 72), 5)).toBeCloseTo((73 * PHYSICS_STEP_MS) / 1200, 9);
    expect(zoomProgressAt(view(1, ZOOM_STEPS), 0)).toBe(1);
  });

  it('lets the walls trail by the configured lag', () => {
    expect(EXPANSION_WALL_LAG).toBeGreaterThan(0);
    expect(EXPANSION_WALL_LAG).toBeLessThan(1);
    expect(wallProgress(EXPANSION_WALL_LAG)).toBe(0);
    expect(wallProgress(1)).toBe(1);
    expect(wallProgress(0.5, 0)).toBe(0.5);
    expect(wallProgress(0.99, 1)).toBe(0);
    expect(wallProgress(1, 1)).toBe(1);
  });
});
