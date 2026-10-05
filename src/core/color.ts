/** Small colour helpers shared by the placeholder art in Phaser and in the DOM. */

/** Parses `#rrggbb` into a 24-bit number (`0xrrggbb`). */
export function hexToNumber(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) throw new RangeError(`Not a #rrggbb colour: ${hex}`);
  return parseInt(match[1], 16);
}

export function numberToHex(value: number): string {
  return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Moves each channel towards black by `amount` (0 = unchanged, 1 = black). */
export function darken(hex: string, amount: number): string {
  return mix(hex, 0x000000, amount);
}

/** Moves each channel towards white by `amount` (0 = unchanged, 1 = white). */
export function lighten(hex: string, amount: number): string {
  return mix(hex, 0xffffff, amount);
}

function mix(hex: string, target: number, amount: number): string {
  const a = hexToNumber(hex);
  const t = Math.min(1, Math.max(0, amount));
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const from = (a >> shift) & 0xff;
    const to = (target >> shift) & 0xff;
    out |= Math.round(from + (to - from) * t) << shift;
  }
  return numberToHex(out);
}
