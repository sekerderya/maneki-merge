import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MENU_ART,
  MENU_MOCKUP_HEIGHT,
  MENU_MOCKUP_WIDTH,
  MENU_SPRITE_DIR,
  menuSprites,
} from '../../src/config/menuSprites';

describe('main menu art sprites (GAME_DESIGN §2.1, §13.1)', () => {
  it('ships every image', () => {
    const sprites = menuSprites();
    expect(sprites.length).toBe(Object.keys(MENU_ART).length);
    for (const { file } of sprites) {
      expect(existsSync(`public/${MENU_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('keeps the garden at the mockup’s size, so the stage lines up with it', () => {
    expect(MENU_ART.background.width).toBe(MENU_MOCKUP_WIDTH);
    expect(MENU_ART.background.height).toBe(MENU_MOCKUP_HEIGHT);
    expect(MENU_ART.background.sky).toMatch(/^#[0-9a-f]{6}$/);
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
