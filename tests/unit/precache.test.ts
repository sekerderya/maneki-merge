import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRECACHE_HASHED_URL } from '../../src/config/app';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

describe('precache revisions (TECH_SPEC §9)', () => {
  it("skips the revision only for Vite's content-hashed output", () => {
    for (const url of [
      'assets/index-B7JSiWEp.js',
      'assets/index-BLM3FvQB.css',
      'assets/workbox-window.prod.es5-Bd17z0YL.js',
      'assets/fredoka-latin-700-normal-BOIZVyIN.woff2',
    ]) {
      expect(PRECACHE_HASHED_URL.test(url), url).toBe(true);
    }
  });

  it('revisions every art file, so a replaced image reaches installed apps (v0.23.1)', () => {
    const art = files('public/assets').map((f) => relative('public', f).replaceAll('\\', '/'));
    expect(art.length).toBeGreaterThan(20);
    for (const url of art) expect(PRECACHE_HASHED_URL.test(url), url).toBe(false);
  });
});
