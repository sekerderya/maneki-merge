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
 *
 * And the Android app's (TECH_SPEC §16), in `android/app/src/main/res/` (a `mipmap-<density>`
 * folder per screen density):
 * - `ic_launcher_foreground.png`: the adaptive icon's 108 dp foreground. Launchers mask it to their
 *   own shape inside the middle 72 dp and only promise a circle of 66 dp, so the picture spans
 *   `ADAPTIVE_SHARE` of it (the raised paw inside that circle, as in the maskable icon) and its
 *   edge pixels are copied outwards. The splash shows the same layer.
 * - `values/ic_launcher_background.xml`: the background layer, the picture's corner colour.
 * - `ic_launcher.png` and `ic_launcher_round.png`: 48 dp icons for Android 7, the picture and the
 *   maskable composition cut to a circle.
 * - `android/store_icon.png`: Google Play's 512 px icon, the picture (Play rounds its corners).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import type { Sharp } from 'sharp';
import { findSource } from './artImage.ts';

const OUT_DIR = 'public';
const ANDROID_RES = 'android/app/src/main/res';
/** Android's screen densities: the mipmap folder and pixels per dp. */
const DENSITIES = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
] as const;
/** The adaptive icon's layers are 108 dp; the legacy icons 48 dp. */
const ADAPTIVE_DP = 108;
const LEGACY_DP = 48;
/** The adaptive foreground's picture is this share of the layer (the rest is copied edge). */
const ADAPTIVE_SHARE = 0.66;
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

  await sharp(await padded(icon, 512, MASKABLE_SHARE)).toFile(
    `${OUT_DIR}/maskable-icon-512x512.png`,
  );

  await writeFile(`${OUT_DIR}/favicon.ico`, ico(await icon(FAVICON_SIZE).png().toBuffer()));
  console.log(`App icon: wrote the PWA, Apple and maskable icons and favicon.ico to ${OUT_DIR}/`);

  await buildAndroidIcons(icon);
}

/** A picture of `share` of a `size` px square in its middle, its edge pixels copied outwards. */
async function padded(icon: (size: number) => Sharp, size: number, share: number): Promise<Buffer> {
  const inner = Math.round(size * share);
  const before = Math.floor((size - inner) / 2);
  const after = size - inner - before;
  return sharp(await icon(inner).toBuffer())
    .extend({ top: before, bottom: after, left: before, right: after, extendWith: 'copy' })
    .png()
    .toBuffer();
}

async function buildAndroidIcons(icon: (size: number) => Sharp): Promise<void> {
  for (const [density, scale] of DENSITIES) {
    const dir = `${ANDROID_RES}/mipmap-${density}`;
    await mkdir(dir, { recursive: true });
    const foreground = Math.round(ADAPTIVE_DP * scale);
    await sharp(await padded(icon, foreground, ADAPTIVE_SHARE)).toFile(
      `${dir}/ic_launcher_foreground.png`,
    );
    const legacy = Math.round(LEGACY_DP * scale);
    await icon(legacy).png().toFile(`${dir}/ic_launcher.png`);
    const circle = Buffer.from(
      `<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`,
    );
    await sharp(await padded(icon, legacy, MASKABLE_SHARE))
      .composite([{ input: circle, blend: 'dest-in' }])
      .png()
      .toFile(`${dir}/ic_launcher_round.png`);
  }

  const { data } = await icon(16).raw().toBuffer({ resolveWithObject: true });
  const corner = [data[0], data[1], data[2]]
    .map((c) => (c ?? 0).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Written by npm run icons (tools/buildAppIcon.ts). -->',
    '<resources>',
    `    <color name="ic_launcher_background">#${corner}</color>`,
    '</resources>',
    '',
  ];
  await writeFile(`${ANDROID_RES}/values/ic_launcher_background.xml`, xml.join('\n'));
  await icon(512).png().toFile('android/store_icon.png');
  console.log(
    `App icon: wrote the Android launcher icons to ${ANDROID_RES}/ and android/store_icon.png`,
  );
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

// `npm run icons` runs this file on its own (`npm run art` imports it).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildAppIcon();
}
