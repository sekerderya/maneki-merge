import Matter from 'matter-js';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  circleOf,
  collides,
  inRoundedCorner,
  installCircleCollisions,
  polygonCollides,
  roundedFloorOf,
} from '../../src/physics/circleCollision';

const { Bodies, Body, Composite, Engine } = Matter;
const STEP = 1000 / 120;

interface Record extends Matter.Collision {
  supportCount: number;
}

/** A cat-like body: a 12-sided hull around the circle, with the radius on plugin.circle. */
function circle(x: number, y: number, r: number, options: Matter.IBodyDefinition = {}) {
  const body = Bodies.circle(x, y, r / Math.cos(Math.PI / 12), options, 12);
  body.plugin.circle = { radius: r };
  return body;
}

function box(
  x: number,
  y: number,
  w: number,
  h: number,
  options: Matter.IChamferableBodyDefinition = {},
) {
  return Bodies.rectangle(x, y, w, h, { isStatic: true, ...options });
}

function expectVector(v: Matter.Vector, x: number, y: number) {
  expect(v.x).toBeCloseTo(x, 12);
  expect(v.y).toBeCloseTo(y, 12);
}

function hitOf(a: Matter.Body, b: Matter.Body): Record {
  const record = collides(a, b) as Record | null;
  if (!record) throw new Error('expected a collision');
  return record;
}

describe('circle–circle contacts', () => {
  it('reports depth, normal (bodyB → bodyA), tangent, penetration and one support', () => {
    const a = circle(0, 0, 10);
    const b = circle(15, 0, 10);
    for (const record of [hitOf(a, b), hitOf(b, a)]) {
      expect(record.bodyA).toBe(a); // the smaller id
      expect(record.parentA).toBe(a);
      expect(record.bodyB).toBe(b);
      expect(record.collided).toBe(true);
      expect(record.depth).toBeCloseTo(5, 12);
      expect(record.normal.x).toBeCloseTo(-1, 12);
      expect(record.normal.y).toBeCloseTo(0, 12);
      expect(record.tangent).toEqual({ x: -record.normal.y, y: record.normal.x });
      expect(record.penetration.x).toBeCloseTo(-5, 12);
      expect(record.supportCount).toBe(1);
      // Midway through the overlap: A's surface is at x = 10, B's at x = 5.
      expect(record.supports[0]!.x).toBeCloseTo(7.5, 12);
      expect(record.supports[0]!.y).toBeCloseTo(0, 12);
    }
  });

  it('uses the exact radius, not the hull', () => {
    expect(collides(circle(0, 0, 10), circle(20, 0, 10))).toBeNull(); // touching exactly
    expect(collides(circle(0, 0, 10), circle(20.5, 0, 10))).toBeNull();
    expect(collides(circle(0, 0, 10), circle(14.2, 14.2, 10))).toBeNull(); // diagonal, d ≈ 20.08
    expect(hitOf(circle(0, 0, 10), circle(14, 14, 10)).depth).toBeCloseTo(20 - Math.hypot(14, 14));
  });

  it('pushes concentric circles apart vertically', () => {
    const a = circle(0, 0, 10);
    const b = circle(0, 0, 6);
    const record = hitOf(a, b);
    expect(record.depth).toBe(16);
    expect(Math.abs(record.normal.y)).toBe(1);
  });

  it('agrees with matter-js SAT on a fine polygon', () => {
    const cases: [number, number, number, number][] = [
      [30, 0, 20, 15],
      [10, 25, 20, 15],
      [-18, -22, 20, 15],
    ];
    for (const [x, y, ra, rb] of cases) {
      const a = circle(0, 0, ra);
      const b = circle(x, y, rb);
      const record = hitOf(a, b);
      const pa = Bodies.circle(0, 0, ra, {}, 96);
      const pb = Bodies.circle(x, y, rb, {}, 96);
      const sat = polygonCollides(pa, pb)!;
      expect(record.normal.x * sat.normal.x + record.normal.y * sat.normal.y).toBeGreaterThan(0.99);
      // SAT on a polygon only approximates the depth.
      expect(Math.abs(record.depth - sat.depth)).toBeLessThan(0.15 * record.depth);
    }
  });
});

describe('circle–wall contacts', () => {
  it('rests a circle on top of the floor', () => {
    const floor = box(0, 150, 1000, 300); // top face at y = 0
    const cat = circle(0, -8, 10);
    const record = hitOf(cat, floor);
    expect(record.bodyA).toBe(floor);
    expect(record.depth).toBeCloseTo(2, 12);
    // From bodyB (the cat) towards bodyA (the floor): down.
    expectVector(record.normal, 0, 1);
    expectVector(record.supports[0]!, 0, 1);
  });

  it('handles side walls and corners', () => {
    const wall = box(450, -500, 300, 2000); // inner face at x = 300
    const side = hitOf(wall, circle(295, -500, 10));
    expect(side.depth).toBeCloseTo(5, 12);
    expect(side.normal.x).toBeCloseTo(1, 12); // from the cat towards the wall

    const corner = box(450, 150, 300, 300); // corner at (300, 0)
    const cat = circle(300 - 6, -6, 10);
    const record = hitOf(corner, cat);
    expect(record.depth).toBeCloseTo(10 - Math.hypot(6, 6), 12);
    expect(record.normal.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(record.normal.y).toBeCloseTo(Math.SQRT1_2, 12);
    expect(collides(corner, circle(300 - 8, -8, 10))).toBeNull();
  });

  it('pushes a circle whose centre is inside a wall out through the nearest face', () => {
    const floor = box(0, 150, 1000, 300);
    const record = hitOf(floor, circle(0, 5, 10));
    expect(record.depth).toBeCloseTo(15, 12);
    expectVector(record.normal, 0, 1);

    const wall = box(450, -500, 300, 2000);
    const left = hitOf(wall, circle(304, -500, 10));
    expect(left.normal.x).toBeCloseTo(1, 12);
    expect(left.depth).toBeCloseTo(14, 12);
  });
});

describe('circle–floor contacts with rounded corners', () => {
  /** A 600-wide jar's floor: flat at y = 0, corners of radius 112 around (±188, −112). */
  const rounded = { top: 0, cx: 188, cy: -112, radius: 112 };
  const floor = () => box(0, 94, 2000, 412, { plugin: { roundedFloor: rounded } });

  it('carries its shape on the body and knows which cats are in a corner', () => {
    expect(roundedFloorOf(floor())).toEqual(rounded);
    expect(roundedFloorOf(box(0, 0, 10, 10))).toBeUndefined();
    expect(inRoundedCorner(-250, -50, 30, rounded)).toBe(true);
    expect(inRoundedCorner(250, -50, 30, rounded)).toBe(true);
    expect(inRoundedCorner(-150, -50, 30, rounded)).toBe(false); // over the flat floor
    expect(inRoundedCorner(-250, -150, 30, rounded)).toBe(false); // above the corner: the wall's
    expect(inRoundedCorner(-250, -50, 112, rounded)).toBe(false); // as big as the corner
  });

  it('uses the flat top, not the rectangle that reaches up over the corners', () => {
    const record = hitOf(circle(0, -28, 30), floor());
    expect(record.depth).toBeCloseTo(2, 12);
    expect(Math.abs(record.normal.y)).toBeCloseTo(1, 12);
    expect(collides(circle(0, -40, 30), floor())).toBeNull();
  });

  it('pushes a cat poking out of the curve back towards the corner centre', () => {
    // 90 from the centre, straight down-left: the curve allows 112 − 30 = 82.
    const d = 90 / Math.SQRT2;
    const cat = circle(-188 - d, -112 + d, 30);
    const record = hitOf(cat, floor());
    expect(record.depth).toBeCloseTo(8, 9);
    // The normal points from bodyB to bodyA; the cat is pushed up and right (to the centre).
    const sign = record.bodyA === cat ? 1 : -1;
    expect(record.normal.x * sign).toBeCloseTo(Math.SQRT1_2, 9);
    expect(record.normal.y * sign).toBeCloseTo(-Math.SQRT1_2, 9);
    // Midway through the overlap, on the line from the centre through the cat.
    const support = record.supports[0]!;
    expect(Math.hypot(support.x + 188, support.y + 112)).toBeCloseTo(112 + 4, 9);
  });

  it('leaves a cat inside the curve alone, on both sides', () => {
    expect(collides(circle(-188 - 50, -112 + 50, 30), floor())).toBeNull();
    expect(collides(circle(188 + 50, -112 + 50, 30), floor())).toBeNull();
    expect(collides(circle(188 + 70, -112 + 70, 30), floor())).not.toBeNull();
  });

  it('meets the flat floor exactly at the foot of the curve', () => {
    const inside = hitOf(circle(-188 - 1e-6, -28, 30), floor());
    const outside = hitOf(circle(-188 + 1e-6, -28, 30), floor());
    expect(inside.depth).toBeCloseTo(outside.depth, 6);
    expect(inside.supports[0]!.y).toBeCloseTo(outside.supports[0]!.y, 6);
  });

  it('holds cats as big as the corner with the flat floor', () => {
    const record = hitOf(circle(-163, -130, 137), floor());
    expect(record.depth).toBeCloseTo(7, 9);
  });
});

describe('fallback', () => {
  it('keeps SAT for bodies without a circle', () => {
    const a = Bodies.rectangle(0, 0, 20, 20);
    const b = Bodies.rectangle(15, 0, 20, 20);
    expect(circleOf(a)).toBeUndefined();
    expect(collides(a, b)!.depth).toBeCloseTo(polygonCollides(a, b)!.depth, 12);
    expect(collides(a, Bodies.rectangle(30, 0, 20, 20))).toBeNull();
  });

  it('uses SAT for a circle against a rotated or moving box', () => {
    const cat = circle(0, 0, 10);
    const tilted = box(0, 15, 100, 20, { angle: 0.3 });
    expect(collides(cat, tilted)).toEqual(polygonCollides(cat, tilted));
    const moving = Bodies.rectangle(0, 15, 100, 20);
    expect(collides(cat, moving)).not.toBeNull();
  });
});

describe('inside a matter-js engine', () => {
  beforeAll(() => {
    installCircleCollisions();
    installCircleCollisions();
  });

  function world(...bodies: Matter.Body[]) {
    const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    Composite.add(engine.world, [box(0, 150, 2000, 300), ...bodies]);
    return engine;
  }

  it('is installed once', () => {
    expect(Matter.Collision.collides).toBe(collides);
  });

  it('settles a dropped circle on the floor and keeps one stable contact', () => {
    const cat = circle(0, -200, 30, { restitution: 0.1, friction: 0.2 });
    const engine = world(cat);
    for (let i = 0; i < 240; i++) Engine.update(engine, STEP);
    expect(cat.position.y).toBeCloseTo(-30, 0);
    expect(cat.speed).toBeLessThan(0.01);

    const pairs = (engine.pairs as unknown as { list: Matter.Pair[] }).list;
    expect(pairs).toHaveLength(1);
    const pair = pairs[0]!;
    const record = pair.collision;
    const support = record.supports[0];
    Engine.update(engine, STEP);
    expect(pair.collision).toBe(record);
    expect(record.supports[0]).toBe(support);
    expect(pair.contacts[0]!.vertex).toBe(support);
  });

  it('rolls instead of sliding', () => {
    const r = 30;
    const cat = circle(0, -r, r, { friction: 0.2, frictionStatic: 0.5, frictionAir: 0 });
    const engine = world(cat);
    Body.setVelocity(cat, { x: 5, y: 0 });
    for (let i = 0; i < 60; i++) Engine.update(engine, STEP);
    expect(cat.velocity.x).toBeGreaterThan(1);
    // Rolling without slipping: v = ω × r.
    expect(cat.angularVelocity * r).toBeCloseTo(cat.velocity.x, 1);
  });

  it('stacks circles in a narrow box without them passing through each other', () => {
    const left = box(-150 - 35, -1000, 300, 2000);
    const right = box(150 + 35, -1000, 300, 2000);
    const cats = [0, 1, 2, 3, 4].map((i) => circle(0, -40 - i * 75, 30));
    const engine = world(left, right, ...cats);
    for (let i = 0; i < 360; i++) Engine.update(engine, STEP);
    cats.forEach((cat, i) => {
      expect(cat.position.y).toBeCloseTo(-30 - i * 60, -1);
      expect(Math.abs(cat.position.x)).toBeLessThan(6);
    });
  });
});
