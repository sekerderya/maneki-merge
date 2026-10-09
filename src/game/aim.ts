/**
 * Where a dropped cat first touches something if it falls straight down (the aim guide ends
 * there). Pure math, no Phaser. Cats fall vertically until their first contact, so the guide
 * matches the landing spot whenever the pile holds still.
 */

export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * The y of the falling cat's centre at first contact: with the highest cat it would hit, or
 * resting on the floor (y = 0 is the floor, y grows downward). `fromY` is where it starts.
 */
export function landingY(
  x: number,
  radius: number,
  fromY: number,
  balls: readonly Circle[],
): number {
  let best = -radius;
  for (const b of balls) {
    const reach = b.radius + radius;
    const dx = b.x - x;
    if (dx >= reach || dx <= -reach) continue;
    const y = b.y - Math.sqrt(reach * reach - dx * dx);
    // A cat above the starting point can't be in the way of a fall.
    if (y < best && b.y > fromY) best = y;
  }
  return Math.max(best, fromY);
}
