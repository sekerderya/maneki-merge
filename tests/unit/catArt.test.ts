import { describe, expect, it } from 'vitest';
import {
  ART_BODY_RADIUS,
  ART_BOX,
  ART_PAD,
  bodyEdge,
  CAT_LOOKS,
  catLook,
  circlePath,
  numberOffset,
} from '../../src/config/catArt';
import type { ArtShape } from '../../src/config/catArt';
import { STAGES } from '../../src/config/stages';
import { SIZE_COUNT, STAGE_TIER_STEP } from '../../src/config/tiers';
import { catSvg } from '../../src/ui/catIcon';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const numbersIn = (d: string): number[] => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

describe('lucky-cat art (GAME_DESIGN §13)', () => {
  it('has one look per size of a stage, and size 10 wears size 1’s', () => {
    expect(CAT_LOOKS).toHaveLength(STAGE_TIER_STEP);
    expect(new Set(CAT_LOOKS.map((l) => l.name)).size).toBe(CAT_LOOKS.length);
    for (const { stage, firstTier } of STAGES) {
      for (let size = 1; size <= SIZE_COUNT; size++) {
        const look = catLook(firstTier + size - 1);
        expect(look, `stage ${stage} size ${size}`).toBe(CAT_LOOKS[(size - 1) % STAGE_TIER_STEP]);
      }
    }
    expect(CAT_LOOKS).toHaveLength(9);
    expect(catLook(10)).toBe(catLook(1));
    expect(catLook(9).name).toBe('Indigo');
  });

  it('gives every look a body that fills the circle and an outline on top', () => {
    const body = circlePath(50, 50, ART_BODY_RADIUS);
    for (const look of CAT_LOOKS) {
      const shapes = look.shapes;
      expect(
        shapes.some((s) => s.d === body && s.fill),
        look.name,
      ).toBe(true);
      const outline = shapes.findLast((s) => s.d === body && s.stroke);
      expect(outline, look.name).toBeDefined();
      // The game scales the outline's outer edge onto the physics radius.
      expect(bodyEdge(look)).toBe(ART_BODY_RADIUS + (outline?.width ?? 0) / 2);
      expect(bodyEdge(look)).toBeLessThanOrEqual(ART_BOX / 2);
    }
  });

  it('keeps every shape inside the padded box, with valid colours', () => {
    const check = (shape: ArtShape, where: string): void => {
      expect(shape.d.startsWith('M'), where).toBe(true);
      expect(shape.fill ?? shape.stroke, where).toBeDefined();
      for (const color of [shape.fill, shape.stroke]) {
        if (color !== undefined) expect(color, where).toMatch(HEX);
      }
      if (shape.stroke) expect(shape.width, where).toBeGreaterThan(0);
      if (shape.opacity !== undefined) {
        expect(shape.opacity, where).toBeGreaterThan(0);
        expect(shape.opacity, where).toBeLessThanOrEqual(1);
      }
      for (const n of numbersIn(shape.d)) {
        expect(n, where).toBeGreaterThanOrEqual(-ART_PAD);
        expect(n, where).toBeLessThanOrEqual(ART_BOX + ART_PAD);
      }
    };
    for (const look of CAT_LOOKS) {
      expect(look.color, look.name).toMatch(HEX);
      look.shapes.forEach((s, i) => check(s, `${look.name} #${i}`));
    }
  });

  it('puts every number on a plate in the lower half of the body', () => {
    for (const look of CAT_LOOKS) {
      const { y, size, color, halo } = look.number;
      expect(y - size / 2, look.name).toBeGreaterThan(50);
      expect(y + size / 2, look.name).toBeLessThan(50 + ART_BODY_RADIUS);
      expect(color, look.name).toMatch(HEX);
      expect(halo, look.name).toMatch(HEX);
      expect(numberOffset(look)).toBeCloseTo((y - 50) / bodyEdge(look), 10);
    }
  });

  it('draws the same shapes as inline SVG for the DOM icons', () => {
    const look = catLook(6);
    const plain = catSvg(look);
    expect(plain.match(/<path /g)).toHaveLength(look.shapes.length);
    expect(plain).toContain(`viewBox="${-ART_PAD} ${-ART_PAD} ${ART_BOX + 2 * ART_PAD}`);
    expect(catSvg(look)).toBe(plain);
  });
});
