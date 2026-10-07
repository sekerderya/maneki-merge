import { describe, expect, it } from 'vitest';
import {
  JAR_ART_BOX,
  JAR_BACK_PIECES,
  JAR_CAP_RY,
  JAR_CAP_Y,
  JAR_FRAME,
  JAR_FRONT_PIECES,
  JAR_POST_X,
  jarBackShapes,
  jarFramePath,
  jarFrontShapes,
  jarInsidePath,
  jarRugShapes,
} from '../../src/config/jarArt';
import {
  blobPath,
  ellipsePathRotated,
  linePath,
  polygonPath,
  roundRectPath,
} from '../../src/config/paintShape';
import type { PaintShape } from '../../src/config/paintShape';
import { PAW_ARM_HALF, PAW_ART_BOX, PAW_GRIP, pawShapes } from '../../src/config/pawArt';
import { JAR_CORNER_RADIUS, JAR_HEIGHT, JAR_WIDTH } from '../../src/config/stages';
import { PAW_LIFT, PAW_LIFT_DOWN_MS, PAW_LIFT_UP_MS } from '../../src/config/view';
import { pawLift } from '../../src/game/PawView';
import { jarGeometry } from '../../src/physics/geometry';

/** Every number in a path, in order (arc flags included). */
const numbers = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

function drawable(shape: PaintShape): boolean {
  return Boolean(shape.d) && Boolean(shape.fill || shape.gradient || shape.stroke);
}

describe('jar art (GAME_DESIGN §13)', () => {
  it('has the physics jar as its inner edge: walls, 112-unit corners, floor', () => {
    const geo = jarGeometry(1);
    expect(geo.cornerRadius).toBe(JAR_CORNER_RADIUS);
    const d = jarInsidePath();
    expect(d.startsWith(`M${-JAR_WIDTH / 2} ${-JAR_HEIGHT}`)).toBe(true);
    expect(d).toContain(`A${JAR_CORNER_RADIUS} ${JAR_CORNER_RADIUS} 0 0 0`);
    expect(d).toContain(`L${JAR_WIDTH / 2 - JAR_CORNER_RADIUS} 0`);
    // An inset keeps the shape, smaller.
    expect(jarInsidePath(10)).toContain(`A${JAR_CORNER_RADIUS - 10} ${JAR_CORNER_RADIUS - 10}`);
  });

  it('runs the bamboo frame half its thickness outside the inner edge, up past the rim', () => {
    const d = jarFramePath();
    const half = JAR_WIDTH / 2 + JAR_FRAME / 2;
    expect(JAR_POST_X).toBe(half);
    expect(d.startsWith(`M${-half} ${JAR_CAP_Y}`)).toBe(true);
    expect(d).toContain(`A${JAR_CORNER_RADIUS + JAR_FRAME / 2}`);
    expect(JAR_CAP_Y).toBeLessThan(-JAR_HEIGHT);
  });

  it('cuts its textures into pieces inside the art box, and keeps the rug for the DOM', () => {
    for (const piece of [...JAR_BACK_PIECES, ...JAR_FRONT_PIECES]) {
      expect(piece.left).toBeGreaterThanOrEqual(JAR_ART_BOX.left);
      expect(piece.right).toBeLessThanOrEqual(JAR_ART_BOX.right);
      expect(piece.top).toBeGreaterThanOrEqual(JAR_ART_BOX.top);
      expect(piece.bottom).toBeLessThanOrEqual(JAR_ART_BOX.bottom);
      expect(piece.right).toBeGreaterThan(piece.left);
      expect(piece.bottom).toBeGreaterThan(piece.top);
    }
    // Both posts, from their caps down to the curves.
    expect(JAR_FRONT_PIECES.filter((p) => p.top === JAR_ART_BOX.top)).toHaveLength(2);
    expect(jarRugShapes().length).toBeGreaterThan(3);
    expect(jarBackShapes().some((s) => s.fill === '#EEF0D9')).toBe(false);
  });

  it('draws every shape inside the texture box', () => {
    const shapes = [...jarBackShapes(), ...jarFrontShapes(), ...jarRugShapes()];
    expect(shapes.length).toBeGreaterThan(20);
    expect(shapes.every(drawable)).toBe(true);
    // Caps, rug and fringe are the outermost parts.
    expect(JAR_CAP_Y - JAR_CAP_RY).toBeGreaterThan(JAR_ART_BOX.top);
    for (const shape of shapes) {
      for (const n of numbers(shape.d)) {
        expect(n).toBeGreaterThanOrEqual(JAR_ART_BOX.top);
        expect(n).toBeLessThanOrEqual(JAR_ART_BOX.right);
      }
    }
  });
});

describe('paw art (GAME_DESIGN §2.3)', () => {
  it('draws the paw and its lower arm inside the texture box', () => {
    const shapes = pawShapes();
    expect(shapes.every(drawable)).toBe(true);
    for (const shape of shapes) {
      for (const n of numbers(shape.d)) {
        expect(Math.abs(n)).toBeLessThanOrEqual(-PAW_ART_BOX.top + 12);
      }
    }
    expect(PAW_ART_BOX.right).toBeGreaterThan(54);
    expect(PAW_ARM_HALF).toBeLessThan(PAW_ART_BOX.right);
    // The calico spots and the shade stay on the fur.
    expect(shapes.filter((s) => s.clip).length).toBe(4);
  });

  it('holds the cat by the top of its head', () => {
    expect(PAW_GRIP).toBeGreaterThan(0.5);
    expect(PAW_GRIP).toBeLessThan(1);
  });

  it('lifts quickly when it lets go and settles back', () => {
    expect(pawLift(-1)).toBe(0);
    expect(pawLift(0)).toBe(0);
    expect(pawLift(PAW_LIFT_UP_MS)).toBeCloseTo(PAW_LIFT, 9);
    expect(pawLift(PAW_LIFT_UP_MS / 2)).toBeGreaterThan(PAW_LIFT / 2);
    expect(pawLift(PAW_LIFT_UP_MS + PAW_LIFT_DOWN_MS / 2)).toBeCloseTo(PAW_LIFT / 2, 9);
    expect(pawLift(PAW_LIFT_UP_MS + PAW_LIFT_DOWN_MS)).toBe(0);
    expect(pawLift(Infinity)).toBe(0);
  });
});

describe('paint shape paths', () => {
  it('builds ellipses, rounded rectangles, polygons and lines', () => {
    expect(ellipsePathRotated(0, 0, 2, 1)).toBe('M-2 0A2 1 0 1 0 2 0A2 1 0 1 0 -2 0Z');
    expect(ellipsePathRotated(0, 0, 2, 1, 90)).toBe('M0 -2A2 1 90 1 0 0 2A2 1 90 1 0 0 -2Z');
    expect(roundRectPath(0, 0, 10, 4, 2)).toBe(
      'M2 0L8 0Q10 0 10 2L10 2Q10 4 8 4L2 4Q0 4 0 2L0 2Q0 0 2 0Z',
    );
    expect(
      polygonPath([
        [0, 0],
        [1, 2],
        [3, 4],
      ]),
    ).toBe('M0 0L1 2L3 4Z');
    expect(linePath(0, 1, 2, 3)).toBe('M0 1L2 3');
  });

  it('draws a closed blob through its points', () => {
    const points = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ] as const;
    const d = blobPath(points);
    expect(d.startsWith('M0 0C')).toBe(true);
    expect(d.endsWith('0 0Z')).toBe(true);
    for (const [x, y] of points) expect(d).toContain(` ${x} ${y}`);
  });
});
