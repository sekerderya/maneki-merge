import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HINT_IDS } from '../../src/config/app';
import { CLIP_IDS } from '../../src/config/clips';
import { introCard, isHazardCard } from '../../src/config/introCards';
import type { IntroCardId } from '../../src/config/introCards';
import { PICKS, RULE_IDS, TEACHING_CLEARS } from '../../src/config/picks';
import { Profile } from '../../src/core/profile';
import { defaultSave, sanitize } from '../../src/core/save';

const HAZARDS = ['boulders', 'cursedBell', 'wind', 'porcelain'] as const;
const CARDS: readonly IntroCardId[] = [...HAZARDS, ...RULE_IDS];

describe('the cards that bring a hazard or a rule in (GAME_DESIGN §15.5)', () => {
  it('shows each hazard as the stage after its card opens, before its trial', () => {
    const cards = Object.entries(TEACHING_CLEARS).flatMap(([stage, row]) =>
      row.card ? [[Number(stage), row.card]] : [],
    );
    expect(cards).toEqual([
      [1, 'boulders'],
      [3, 'cursedBell'],
      [6, 'wind'],
      [8, 'porcelain'],
    ]);
    // No trial pick draws a hazard before the clear after its card.
    const firstTrial = (ids: readonly string[]) =>
      Number(
        Object.entries(TEACHING_CLEARS).find(([, row]) =>
          row.picks.includes('trial') ? (row.trials ?? ids).some((id) => ids.includes(id)) : false,
        )?.[0],
      );
    expect(firstTrial(['moreBoulders', 'ironBands', 'bigBoulders'])).toBe(2);
    expect(firstTrial(['cursedBell'])).toBe(4);
    expect(firstTrial(['wind'])).toBe(7);
    expect(firstTrial(['porcelain'])).toBe(9);
  });

  it.each(CARDS)('%s: a title, one line and a recorded clip', (id) => {
    const card = introCard(id);
    expect(card.id).toBe(id);
    expect(card.title.length).toBeGreaterThan(3);
    expect(card.line).toMatch(/^[A-Z].{20,}\.$/);
    expect(CLIP_IDS).toContain(card.clip);
    expect(existsSync(`public/clips/${card.clip}.mp4`)).toBe(true);
    expect(isHazardCard(id)).toBe((HAZARDS as readonly string[]).includes(id));
  });

  it("says a trial brings the hazards that don't come by themselves", () => {
    expect(introCard('boulders').line).not.toMatch(/trial/);
    for (const id of ['cursedBell', 'wind', 'porcelain'] as const) {
      expect(introCard(id).line).toMatch(/^A trial can /);
      expect(introCard(id).line).toMatch(/cats?/);
    }
  });

  it("shows a rule with its name and the line of GAME_DESIGN §15.11, the wind the run's way", () => {
    for (const id of RULE_IDS) {
      expect(introCard(id)).toMatchObject({
        title: PICKS[id].name,
        line: `${PICKS[id].description}.`,
      });
    }
    expect(introCard('wind').clip).toBe('windRight');
    expect(introCard('wind', true).clip).toBe('windLeft');
  });

  it('shows each card once per profile; "How to play" brings them all back', () => {
    for (const id of CARDS) expect(HINT_IDS).toContain(id);
    const scheduler = { now: () => 0, setTimeout: () => 0, clearTimeout: () => undefined };
    const profile = new Profile({ save: () => true }, defaultSave(), { scheduler });
    for (const id of CARDS) expect(profile.hintSeen(id)).toBe(false);
    profile.markHintSeen('cursedBell');
    profile.markHintSeen('hubris');
    expect(profile.hintSeen('cursedBell')).toBe(true);
    expect(profile.hintSeen('hubris')).toBe(true);
    expect(profile.hintSeen('wind')).toBe(false);
    profile.resetHints();
    for (const id of CARDS) expect(profile.hintSeen(id)).toBe(false);
  });

  it('loads a v0.49 save with the new cards unseen, keeping its boulders card', () => {
    const v049 = {
      flags: { hintsSeen: { aim: true, merge: true, magnet: false, curse: true, boulders: true } },
    };
    const { data, issues } = sanitize(v049);
    expect(issues).toEqual([]);
    expect(data.flags.hintsSeen.boulders).toBe(true);
    for (const id of CARDS.filter((card) => card !== 'boulders')) {
      expect(data.flags.hintsSeen[id]).toBe(false);
    }
  });
});
