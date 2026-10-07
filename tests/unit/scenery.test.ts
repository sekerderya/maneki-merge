import { describe, expect, it } from 'vitest';
import { fitCamera, worldToView } from '../../src/game/cameraFit';
import { jarGeometry } from '../../src/physics/geometry';
import { SCENERY_JAR, SCENERY_VIEW, sceneryMarkup } from '../../src/ui/scenery';

describe('shrine garden scenery (GAME_DESIGN §13)', () => {
  it("is drawn around the owner's 390 × 844 phone jar, close to where the camera puts it", () => {
    // The HUD reaches 173 px down there (47 px status bar). The drawing has the v0.14 jar (300 px);
    // the game screen scales it onto the real one (283 px since v0.17), so it barely moves.
    const geo = jarGeometry(1);
    const fit = fitCamera(geo, SCENERY_VIEW.width, SCENERY_VIEW.height, undefined, 173);
    const left = worldToView(fit, SCENERY_VIEW.width, SCENERY_VIEW.height, -geo.halfWidth, 0);
    const right = worldToView(fit, SCENERY_VIEW.width, SCENERY_VIEW.height, geo.halfWidth, 0);
    expect(Math.abs((left.x + right.x) / 2 - SCENERY_JAR.cx)).toBeLessThan(1);
    expect(Math.abs(right.x - left.x - SCENERY_JAR.width)).toBeLessThan(SCENERY_JAR.width * 0.1);
    expect(Math.abs(left.y - SCENERY_JAR.floor)).toBeLessThan(15);
  });

  it('is one deterministic inline SVG with the torii, the shrine, lanterns and the floor', () => {
    const markup = sceneryMarkup();
    expect(markup).toBe(sceneryMarkup());
    expect(markup.startsWith('<svg class="play-scenery"')).toBe(true);
    expect(markup).toContain(`viewBox="0 0 ${SCENERY_VIEW.width} ${SCENERY_VIEW.height}"`);
    expect(markup).toContain('overflow="visible"');
    expect(markup).toContain('aria-hidden="true"');
    for (const color of ['#e8735a', '#7f7477', '#ffe7a3', '#e6c18f', '#f9c3cf']) {
      expect(markup).toContain(color);
    }
    // The rug and the jar's shadow, from the jar art, placed on the drawing's jar.
    expect(markup).toContain('#C3CF9E');
    expect(markup).toContain(
      `translate(${SCENERY_JAR.cx} ${SCENERY_JAR.floor}) scale(${SCENERY_JAR.width / 600})`,
    );
    // No external references: everything is inline (offline).
    expect(markup).not.toMatch(/href|url\(/);
  });
});
