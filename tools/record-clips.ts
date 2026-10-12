/**
 * Records the how-it-works clips (`npm run clips`, docs/plans/batch-21.md): every scene in
 * tools/clips/scenes.ts, or the ones named, into `public/clips/<id>.mp4` with a WebP poster of its
 * first frame. It starts its own Vite dev server and needs a GPU (the owner's PC; not CI).
 *
 *   npm run clips                 every clip
 *   npm run clips -- magnet echo  those clips
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { ClipBrowser, FPS } from './clips/recorder.ts';
import { SCENES } from './clips/scenes.ts';

const OUT_DIR = 'public/clips';

async function main(): Promise<void> {
  const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
  const unknown = wanted.filter((id) => !SCENES.some((scene) => scene.id === id));
  if (unknown.length) throw new Error(`No scene: ${unknown.join(', ')}`);
  const scenes = wanted.length ? SCENES.filter((s) => wanted.includes(s.id)) : SCENES;

  const server = await createServer({ logLevel: 'error', server: { port: 5190 } });
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('The dev server has no local URL');
  const browser = await ClipBrowser.launch();
  await mkdir(OUT_DIR, { recursive: true });
  try {
    for (const def of scenes) {
      const started = Date.now();
      const scene = await browser.open(url, { seed: def.seed });
      await def.setup(scene);
      await scene.record();
      await def.play(scene);
      const errors = [...scene.errors];
      const { mp4, poster, frames } = await scene.finish();
      if (errors.length) throw new Error(`${def.id}: console errors:\n${errors.join('\n')}`);
      await writeFile(`${OUT_DIR}/${def.id}.mp4`, mp4);
      await writeFile(`${OUT_DIR}/${def.id}.webp`, poster);
      const seconds = (frames / FPS).toFixed(1);
      const kb = Math.round(mp4.length / 1024);
      const took = Math.round((Date.now() - started) / 1000);
      console.log(`${def.id}: ${seconds} s, ${kb} KB (recorded in ${took} s)`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
