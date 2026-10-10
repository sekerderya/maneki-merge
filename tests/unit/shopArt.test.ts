import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UPGRADE_IDS } from '../../src/config/upgrades';
import { ICON_SPRITE_DIR, iconSprite, iconSprites } from '../../src/config/iconSprites';
import { SHOP_ART, SHOP_SPRITE_DIR } from '../../src/config/shopSprites';

describe('Upgrades screen art (GAME_DESIGN §2.2, docs/ART_ASSETS.md §4.9)', () => {
  it('ships every piece', () => {
    for (const { file } of Object.values(SHOP_ART)) {
      expect(existsSync(`public/${SHOP_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('slices the card inside its size, keeping the stat strip whole', () => {
    const { card } = SHOP_ART;
    expect(card.corner).toBeGreaterThan(0);
    expect(2 * card.corner).toBeLessThan(card.width);
    expect(card.corner + card.bottom).toBeLessThan(card.height);
    expect(card.bottom).toBeGreaterThan(card.corner);
  });

  it('keeps the round ends of the strips whole', () => {
    for (const strip of [SHOP_ART.buy, SHOP_ART.title]) {
      expect(strip.cap).toBeGreaterThanOrEqual(strip.height / 2);
      expect(2 * strip.cap).toBeLessThan(strip.width);
    }
  });
});

describe('icon kit (docs/ART_ASSETS.md §5)', () => {
  it('has an icon for every upgrade, and ships each one', () => {
    for (const id of UPGRADE_IDS) expect(iconSprite(id), id).not.toBeNull();
    for (const { file } of iconSprites()) {
      expect(existsSync(`public/${ICON_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('has none for an id without art', () => {
    expect(iconSprite('noSuchIcon')).toBeNull();
  });
});
