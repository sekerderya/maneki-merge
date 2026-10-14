import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIP_CAPTIONS, CLIP_IDS, pickClip, upgradeClip } from '../../src/config/clips';
import { introCard } from '../../src/config/introCards';
import type { ClipId } from '../../src/config/clips';
import { PICK_IDS } from '../../src/config/picks';
import { UPGRADE_IDS } from '../../src/config/upgrades';
import { SCENES } from '../../tools/clips/scenes';

describe('how-it-works clips (docs/plans/batch-21.md)', () => {
  it('has a caption, a scene and a recorded clip with its poster for every id', () => {
    expect(SCENES.map((s) => s.id).sort()).toEqual([...CLIP_IDS].sort());
    for (const id of CLIP_IDS) {
      expect(CLIP_CAPTIONS[id].length).toBeGreaterThan(20);
      expect(existsSync(`public/clips/${id}.mp4`), `${id}.mp4`).toBe(true);
      expect(existsSync(`public/clips/${id}.webp`), `${id}.webp`).toBe(true);
    }
  });

  it('opens the planned clip from every card, and none from the obvious ones', () => {
    const picks = Object.fromEntries(PICK_IDS.map((id) => [id, pickClip(id)]));
    expect(picks).toEqual({
      moreBoulders: 'boulder',
      ironBands: 'ironBands',
      bigBoulders: 'boulder',
      wind: 'windRight',
      heavyDrop: 'heavyDrop',
      porcelain: 'porcelain',
      cursedBell: 'curse',
      quickCurse: 'curse',
      moreCurses: 'curse',
      moreMagnets: 'magnet',
      bigDrops: null,
      goldenCats: 'golden',
      hanabi: 'hanabi',
      joker: 'joker',
      lightning: 'lightning',
      hubris: 'hubris',
      echo: 'echo',
      copycat: 'copycat',
      dice: 'dice',
    });
    expect(pickClip('wind', true)).toBe('windLeft');
    const shop = Object.fromEntries(UPGRADE_IDS.map((id) => [id, upgradeClip(id)]));
    expect(shop).toEqual({
      luckyPaw: null,
      bigCatch: null,
      comboCharm: 'combo',
      secondChance: 'luckySave',
      goldenCats: 'golden',
      bigDrops: null,
      moreMagnets: 'magnet',
      hanabi: 'hanabi',
      joker: 'joker',
      lightning: 'lightning',
    });
    // Every clip opens from some card, or plays on the boulders' card at stage 2.
    const used = new Set<ClipId | null>([...Object.values(picks), ...Object.values(shop)]);
    used.add(pickClip('wind', true));
    used.add(introCard('boulders').clip);
    for (const id of CLIP_IDS) expect(used.has(id), id).toBe(true);
  });
});
