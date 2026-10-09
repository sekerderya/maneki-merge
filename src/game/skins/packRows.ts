/** Shelf packing for texture atlases (the cat art's, game/skins/ArtSkin.ts). Pure, so it runs in Node. */

export interface PackedRows {
  /** Each box's top-left corner, in input order. */
  readonly at: readonly { readonly x: number; readonly y: number }[];
  /** The size of the whole. */
  readonly width: number;
  readonly height: number;
}

/**
 * Places boxes in rows at most `maxWidth` wide, `gap` apart, tallest first. A box wider than a
 * row gets a row of its own.
 */
export function packRows(
  boxes: readonly { readonly w: number; readonly h: number }[],
  maxWidth: number,
  gap: number,
): PackedRows {
  const order = boxes.map((_, i) => i).sort((a, b) => (boxes[b]?.h ?? 0) - (boxes[a]?.h ?? 0));
  const at: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 0;
  for (const i of order) {
    const box = boxes[i];
    if (!box) continue;
    if (x > 0 && x + box.w > maxWidth) {
      y += rowHeight + gap;
      x = 0;
      rowHeight = 0;
    }
    at[i] = { x, y };
    width = Math.max(width, x + box.w);
    x += box.w + gap;
    rowHeight = Math.max(rowHeight, box.h);
  }
  return { at, width, height: y + rowHeight };
}
