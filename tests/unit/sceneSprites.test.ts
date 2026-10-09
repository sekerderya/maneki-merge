import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_ART,
  BACKGROUND_JAR,
  JAR_ART,
  JAR_ART_SCALE_X,
  JAR_ART_SCALE_Y,
  jarArtToWorld,
  PAW_ART,
  SCENE_SPRITE_DIR,
} from '../../src/config/sceneSprites';
import type { PxRect } from '../../src/config/sceneSprites';
import { JAR_CORNER_RADIUS, JAR_HEIGHT, JAR_WIDTH } from '../../src/config/stages';
import { jarGeometry, MAX_DROP_RADIUS } from '../../src/physics/geometry';
import { CAMERA_SIDE_MARGIN_RATIO } from '../../src/config/view';

const HEX = /^#[0-9a-f]{6}$/i;
const inside = (r: PxRect, w: number, h: number): boolean =>
  r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= w && r.y + r.h <= h;

describe('scene art sprites (GAME_DESIGN §13.1)', () => {
  it('ships every image', () => {
    for (const file of [JAR_ART.back, JAR_ART.front, PAW_ART.file, BACKGROUND_ART.file]) {
      expect(existsSync(`public/${SCENE_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('stretches the jar art’s opening onto the physics jar, almost evenly', () => {
    expect(jarArtToWorld(JAR_ART.left, JAR_ART.floor)).toEqual({ x: -JAR_WIDTH / 2, y: 0 });
    const rim = jarArtToWorld(JAR_ART.right, JAR_ART.rim);
    expect(rim.x).toBeCloseTo(JAR_WIDTH / 2, 9);
    expect(rim.y).toBeCloseTo(-JAR_HEIGHT, 9);
    // The art's opening has nearly the jar's shape, so cats don't look squashed next to it.
    expect(Math.abs(JAR_ART_SCALE_X / JAR_ART_SCALE_Y - 1)).toBeLessThan(0.05);
  });

  it('has the physics corners of the art’s inner corners, so cats never slip behind the bamboo', () => {
    // Until v0.19.3 the physics corners were 112 and the art's about 168.
    for (const scale of [JAR_ART_SCALE_X, JAR_ART_SCALE_Y]) {
      expect(Math.abs(JAR_CORNER_RADIUS - JAR_ART.cornerRadius * scale)).toBeLessThan(2);
    }
    // Not less round than the art's corners, which would let a cat poke into the bamboo.
    expect(JAR_CORNER_RADIUS).toBeGreaterThanOrEqual(
      Math.floor(JAR_ART.cornerRadius * JAR_ART_SCALE_X),
    );
  });

  it('cuts the jar into pieces inside its images, and the frame fits the camera', () => {
    for (const r of [...JAR_ART.backPieces, ...JAR_ART.frontPieces]) {
      expect(inside(r, JAR_ART.width, JAR_ART.height), JSON.stringify(r)).toBe(true);
    }
    expect(JAR_ART.backPieces.length).toBeGreaterThan(0);
    expect(JAR_ART.frontPieces.length).toBeGreaterThan(0);
    // The widest piece (the top rail) stays on screen.
    const reach = Math.max(
      ...JAR_ART.frontPieces.map((r) => Math.abs(jarArtToWorld(r.x, 0).x)),
      ...JAR_ART.frontPieces.map((r) => Math.abs(jarArtToWorld(r.x + r.w, 0).x)),
    );
    expect(reach).toBeLessThanOrEqual(JAR_WIDTH * (0.5 + CAMERA_SIDE_MARGIN_RATIO));
  });

  it('hangs the biggest cat in the dropper clear of the top rail (v0.21.1)', () => {
    const geo = jarGeometry(1);
    const railTop = jarArtToWorld(0, JAR_ART.railTop).y;
    expect(railTop).toBeLessThan(geo.rimY - 40);
    const gap = railTop - (geo.dropY + MAX_DROP_RADIUS);
    expect(gap).toBeGreaterThan(2);
    // Close above it, not floating high over it.
    expect(gap).toBeLessThan(20);
  });

  it('has a paw at the bottom of its arm and a plain arm row to stretch', () => {
    expect(PAW_ART.cx).toBeGreaterThan(0);
    expect(PAW_ART.cx).toBeLessThan(PAW_ART.width);
    expect(PAW_ART.bottom).toBeLessThanOrEqual(PAW_ART.height);
    expect(PAW_ART.armRow).toBeLessThan(PAW_ART.bottom / 3);
    expect(PAW_ART.pawWidth).toBeLessThanOrEqual(PAW_ART.width);
  });

  it('stands the jar inside the background, with its sky and floor colours', () => {
    expect(BACKGROUND_JAR.cx).toBeLessThan(BACKGROUND_ART.width);
    expect(BACKGROUND_JAR.floor).toBeLessThan(BACKGROUND_ART.height);
    expect(BACKGROUND_ART.sky).toMatch(HEX);
    expect(BACKGROUND_ART.ground).toMatch(HEX);
  });
});
