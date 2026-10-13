/**
 * The app icon (docs/ART_ASSETS.md §4.6): every size the PWA needs, from the owner's full-bleed
 * `art-source/app-icon.*`, written to `public/` and committed (`npm run icons`, also part of
 * `npm run art`).
 *
 * - `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`: the picture, resized.
 * - `apple-touch-icon-180x180.png`: the same; iOS rounds its corners.
 * - `maskable-icon-512x512.png`: Android crops it to its own shape and only promises the circle of
 *   40% radius round the centre. The cat's raised paw reaches past it, so the picture is shrunk
 *   into the middle and its edge pixels are copied outwards to fill the square (the cream
 *   background, and the cat's body straight down, as the picture's own crop has it).
 * - `favicon.ico`: one 48 px PNG in an ICO.
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { Sharp } from 'sharp';
import { findSource } from './artImage.ts';

const OUT_DIR = 'public';
/** The maskable icon's picture is this share of the square (the rest is copied edge). */
const MASKABLE_SHARE = 0.86;
const FAVICON_SIZE = 48;

export async function buildAppIcon(): Promise<void> {
  const source = await readFile(await findSource('art-source', 'app-icon'));
  const icon = (size: number): Sharp =>
    sharp(source).flatten({ background: '#ffffff' }).resize(size, size, { fit: 'cover' });

  for (const size of [64, 192, 512]) {
    await icon(size).png().toFile(`${OUT_DIR}/pwa-${size}x${size}.png`);
  }
  await icon(180).png().toFile(`${OUT_DIR}/apple-touch-icon-180x180.png`);

  const inner = Math.round(512 * MASKABLE_SHARE);
  const before = Math.floor((512 - inner) / 2);
  const after = 512 - inner - before;
  const shrunk = await icon(inner).toBuffer();
  await sharp(shrunk)
    .extend({ top: before, bottom: after, left: before, right: after, extendWith: 'copy' })
    .png()
    .toFile(`${OUT_DIR}/maskable-icon-512x512.png`);

  await writeFile(`${OUT_DIR}/favicon.ico`, ico(await icon(FAVICON_SIZE).png().toBuffer()));
  console.log(`App icon: wrote the PWA, Apple and maskable icons and favicon.ico to ${OUT_DIR}/`);
}

/** An ICO file holding one square PNG of FAVICON_SIZE px. */
function ico(png: Buffer): Buffer {
  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(FAVICON_SIZE, 6); // width
  header.writeUInt8(FAVICON_SIZE, 7); // height
  header.writeUInt8(0, 8); // no palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image size
  header.writeUInt32LE(header.length, 18); // image offset
  return Buffer.concat([header, png]);
}
