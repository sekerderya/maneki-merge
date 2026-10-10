import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOOR_ART, DOOR_SPRITE_DIR } from '../../src/config/doorSprites';
import { DOORS_SHADE_INNER, DOORS_SHADE_OUTER } from '../../src/config/view';
import { doorTransform, easeDoors, wingPose } from '../../src/ui/fx/doorFold';

describe('stage doors fold (GAME_DESIGN §7.1)', () => {
  it('stands flat and unshaded when shut', () => {
    const { outer, inner } = wingPose(0);
    for (const pose of [outer, inner]) {
      expect(pose.x).toBeCloseTo(0);
      expect(pose.z).toBeCloseTo(0);
      expect(pose.angle).toBeCloseTo(0);
      expect(pose.shade).toBeCloseTo(0);
    }
  });

  it('folds both doors edge-on onto the screen edge when open', () => {
    const { outer, inner } = wingPose(1);
    expect(outer.angle).toBe(90);
    expect(inner.angle).toBe(-90);
    // The inner door's hinge is the outer door's free edge, folded back to the screen's edge.
    expect(1 + inner.x).toBeCloseTo(0);
    expect(inner.z).toBeCloseTo(-1);
    expect(outer.shade).toBeCloseTo(DOORS_SHADE_OUTER);
    expect(inner.shade).toBeCloseTo(DOORS_SHADE_INNER);
  });

  it('keeps the wing joined like an accordion at every fold', () => {
    for (const fold of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const { outer, inner } = wingPose(fold);
      const theta = (outer.angle * Math.PI) / 180;
      // The outer door's free edge is where the inner one hangs…
      expect(1 + inner.x).toBeCloseTo(Math.cos(theta));
      expect(inner.z).toBeCloseTo(-Math.sin(theta));
      // …and the inner door's free edge stays on the screen's plane.
      const back = (-inner.angle * Math.PI) / 180;
      expect(inner.z + Math.sin(back)).toBeCloseTo(0);
      expect(inner.shade).toBeGreaterThan(outer.shade);
    }
  });

  it('clamps the fold', () => {
    expect(wingPose(-1)).toEqual(wingPose(0));
    expect(wingPose(2)).toEqual(wingPose(1));
  });

  it('eases in and out without a jump', () => {
    expect(easeDoors(0)).toBe(0);
    expect(easeDoors(1)).toBe(1);
    expect(easeDoors(0.5)).toBeCloseTo(0.5);
    let last = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const v = easeDoors(t);
      expect(v).toBeGreaterThanOrEqual(last);
      expect(v - last).toBeLessThan(0.16);
      last = v;
    }
    expect(easeDoors(0.05)).toBeLessThan(0.01);
  });

  it('mirrors the right wing', () => {
    const { inner } = wingPose(0.5);
    expect(doorTransform(inner, 100, false)).toBe(
      'translate3d(-29.29px, 0px, -70.71px) rotateY(-45deg)',
    );
    expect(doorTransform(inner, 100, true)).toBe(
      'translate3d(29.29px, 0px, -70.71px) rotateY(45deg)',
    );
    expect(doorTransform(wingPose(0).outer, 100, true)).toBe(
      'translate3d(0px, 0px, 0px) rotateY(0deg)',
    );
  });
});

describe('stage doors art (docs/ART_ASSETS.md phase 6)', () => {
  it('ships both images', () => {
    for (const { file } of [DOOR_ART.picture, DOOR_ART.panel]) {
      expect(existsSync(`public/${DOOR_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('measures an opening inside the frame, with lattice caps above and below it', () => {
    const { panel } = DOOR_ART;
    expect(panel.left + panel.right).toBeLessThan(panel.width / 2);
    expect(panel.top + panel.bottom).toBeLessThan(panel.height);
    expect(panel.top).toBeGreaterThan(panel.left);
    expect(panel.bottom).toBeGreaterThan(panel.right);
  });
});
