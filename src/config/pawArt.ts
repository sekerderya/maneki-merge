/**
 * The dropper (GAME_DESIGN §2.3, §13): a calico cat's paw hanging from the top of the screen,
 * its pink pads towards the player, holding the next cat by the head. World units with the
 * origin at the bottom of the paw, y down. The texture holds the paw and the lower part of the
 * arm (PAW_ART_BOX); the game extends the plain arm up to the top of the screen. Pure data.
 */
import { blobPath, ellipsePathRotated } from './paintShape';
import type { PaintShape } from './paintShape';

export const PAW_INK = '#5B3A2B';
export const PAW_FUR = '#FFFBF4';
/** The shade down the right side of the arm, and its strength. */
export const PAW_SHADE = '#B98A66';
export const PAW_SHADE_ALPHA = 0.22;
const SPOT = '#F3A35C';
const SPOT_DARK = '#4B3B39';
const PAD = '#F6A2B3';

/** Half the arm's width; the paw at the bottom is wider. */
export const PAW_ARM_HALF = 34;
/** Outline width. */
export const PAW_LINE = 6;
/** The shade covers the arm from this x to its right edge. */
export const PAW_SHADE_FROM = 8;
/** The texture covers this box; above `top` the arm continues as plain fur. */
export const PAW_ART_BOX = { left: -62, top: -440, right: 62, bottom: 6 } as const;
/**
 * The paw's bottom sits this far above the held cat's centre, as a fraction of the cat's radius:
 * it holds the cat by the top of its head, between the ears.
 */
export const PAW_GRIP = 0.72;

const A = PAW_ARM_HALF;
/** Reaches past the texture's top, so the arm runs off its edge without a seam. */
const TOP = PAW_ART_BOX.top - 12;

/** Fur outline: arm sides, then the wider paw round the bottom. */
const SHAPE = `M${-A} ${TOP}L${-A} -100Q-54 -84 -54 -46Q-54 0 0 0Q54 0 54 -46Q54 -84 ${A} -100L${A} ${TOP}`;

export function pawShapes(): PaintShape[] {
  const fur = SHAPE + 'Z';
  return [
    { d: fur, fill: PAW_FUR },
    {
      d: blobPath([
        [4, -412],
        [40, -420],
        [44, -348],
        [16, -324],
        [-2, -360],
      ]),
      fill: SPOT,
      clip: fur,
    },
    {
      d: blobPath([
        [-44, -208],
        [-12, -224],
        [4, -184],
        [-16, -152],
        [-44, -160],
      ]),
      fill: SPOT,
      clip: fur,
    },
    {
      d: blobPath([
        [20, -280],
        [44, -292],
        [44, -248],
        [24, -252],
      ]),
      fill: SPOT_DARK,
      clip: fur,
    },
    {
      d: `M${PAW_SHADE_FROM} ${TOP}L60 ${TOP}L60 6L${PAW_SHADE_FROM} 6Z`,
      fill: PAW_SHADE,
      opacity: PAW_SHADE_ALPHA,
      clip: fur,
    },
    { d: SHAPE, stroke: PAW_INK, width: PAW_LINE },
    // The big pad, then the four toe beans along the bottom.
    { d: 'M-22 -60Q0 -84 22 -60Q25 -38 0 -36Q-25 -38 -22 -60Z', fill: PAD },
    { d: ellipsePathRotated(-7, -64, 6.8, 4), fill: '#FFFFFF', opacity: 0.55 },
    ...(
      [
        [-31, -26, -18],
        [-11.2, -14, -6],
        [11.2, -14, 6],
        [31, -26, 18],
      ] as const
    ).map(([x, y, a]): PaintShape => ({ d: ellipsePathRotated(x, y, 8.6, 10.6, a), fill: PAD })),
  ];
}
