import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STAGE_CLEAR_BANNER_MS, STAGE_CLEAR_EXIT_MS } from '../../src/config/view';

describe('"Stage clear!" banner (GAME_DESIGN §7.1)', () => {
  it('holds in its keyframes until it has shown STAGE_CLEAR_BANNER_MS, then slides up', () => {
    const css = readFileSync('src/ui/styles/game.css', 'utf8');
    const keyframes = /@keyframes banner-exit-up \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const stops = [...keyframes.matchAll(/^ {2}(\d+)% \{/gm)].map((m) => Number(m[1]));
    const holdEnd = stops[stops.length - 2];
    const share = (100 * STAGE_CLEAR_BANNER_MS) / (STAGE_CLEAR_BANNER_MS + STAGE_CLEAR_EXIT_MS);
    expect(holdEnd).toBe(share);
    expect(stops[stops.length - 1]).toBe(100);
  });
});
