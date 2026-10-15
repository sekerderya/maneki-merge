import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MENU_ART,
  MENU_MOCKUP_HEIGHT,
  MENU_MOCKUP_WIDTH,
  MENU_SPRITE_DIR,
  menuSprites,
} from '../../src/config/menuSprites';
import { backgroundArt } from '../../src/config/sceneSprites';
import { TIMES_OF_DAY } from '../../src/config/timeOfDay';

describe('main menu art sprites (GAME_DESIGN §2.1, §13.1)', () => {
  it('ships every image', () => {
    const sprites = menuSprites();
    expect(sprites.length).toBe(Object.keys(MENU_ART).length);
    for (const { file } of sprites) {
      expect(existsSync(`public/${MENU_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('stands on the first jar’s garden, at the mockup’s shape at every time of day (v0.51)', () => {
    for (const time of TIMES_OF_DAY) {
      const garden = backgroundArt(1, time);
      expect(garden.width / garden.height).toBeCloseTo(MENU_MOCKUP_WIDTH / MENU_MOCKUP_HEIGHT, 2);
      expect(garden.sky).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(backgroundArt(1).width).toBe(MENU_MOCKUP_WIDTH);
  });

  it('keeps each strip’s round ends whole and leaves a middle to stretch', () => {
    for (const strip of [MENU_ART.play, MENU_ART.upgrades, MENU_ART.coinsPill, MENU_ART.well]) {
      expect(strip.cap).toBeGreaterThanOrEqual(strip.height / 2);
      expect(2 * strip.cap).toBeLessThan(strip.width);
    }
  });

  it('slices the record card inside its size', () => {
    const { card } = MENU_ART;
    expect(2 * card.slice).toBeLessThan(card.height);
    expect(card.slice).toBeGreaterThan(0);
  });
});
