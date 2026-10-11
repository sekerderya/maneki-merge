/**
 * Where cats appear without a merge (GAME_DESIGN §15.10–§15.11): a broken porcelain cat's two
 * pieces, and an echo cat beside a merged one. Pure math: the run places them.
 */
import type { JarGeometry } from './geometry';

/**
 * The centres of a broken cat's two pieces of `pieceRadius`: side by side across its centre
 * (x ± pieceRadius, at its height), moved together to stay inside the walls.
 */
export function pieceSpots(
  x: number,
  pieceRadius: number,
  geometry: Pick<JarGeometry, 'halfWidth'>,
): [number, number] {
  const limit = Math.max(0, geometry.halfWidth - 2 * pieceRadius);
  const centre = Math.min(limit, Math.max(-limit, x));
  return [centre - pieceRadius, centre + pieceRadius];
}

/**
 * Where an echo cat of `echoRadius` goes beside a new cat of `newRadius` at (x, y): level with it
 * on `side` (1 right, −1 left), just touching it; on the other side if that one would put it
 * through a wall; straight above it if neither fits.
 */
export function echoSpot(
  x: number,
  y: number,
  newRadius: number,
  echoRadius: number,
  side: 1 | -1,
  geometry: Pick<JarGeometry, 'halfWidth'>,
): { x: number; y: number } {
  const reach = newRadius + echoRadius;
  const fits = (cx: number): boolean => Math.abs(cx) + echoRadius <= geometry.halfWidth;
  if (fits(x + side * reach)) return { x: x + side * reach, y };
  if (fits(x - side * reach)) return { x: x - side * reach, y };
  return { x, y: y - reach };
}
