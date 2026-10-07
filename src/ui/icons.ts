/** Inline SVG icons (no icon font, no network). They inherit `currentColor`. */
import type { UpgradeId } from '../config/upgrades';

const svg = (body: string, viewBox = '0 0 24 24'): string =>
  `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

/** The score card's badge: a white paw print with pink pads, outlined in ink. */
export const ICON_PAW_PRINT = svg(
  '<path d="M24 22Q33 22 37 30Q41 39 33 41Q28 42 24 40Q20 42 15 41Q7 39 11 30Q15 22 24 22Z" fill="#fff" stroke="#5b3a2b" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<g stroke="#5b3a2b" stroke-width="2.4" fill="#fff">' +
    '<ellipse cx="9.5" cy="20" rx="5.4" ry="6.6" transform="rotate(-20 9.5 20)"/>' +
    '<ellipse cx="17.5" cy="11" rx="5.4" ry="6.6" transform="rotate(-8 17.5 11)"/>' +
    '<ellipse cx="30.5" cy="11" rx="5.4" ry="6.6" transform="rotate(8 30.5 11)"/>' +
    '<ellipse cx="38.5" cy="20" rx="5.4" ry="6.6" transform="rotate(20 38.5 20)"/></g>' +
    '<g fill="#f6a2b3"><ellipse cx="9.5" cy="20.8" rx="2.7" ry="3.4" transform="rotate(-20 9.5 20)"/>' +
    '<ellipse cx="17.5" cy="11.8" rx="2.7" ry="3.4" transform="rotate(-8 17.5 11)"/>' +
    '<ellipse cx="30.5" cy="11.8" rx="2.7" ry="3.4" transform="rotate(8 30.5 11)"/>' +
    '<ellipse cx="38.5" cy="20.8" rx="2.7" ry="3.4" transform="rotate(20 38.5 20)"/>' +
    '<path d="M24 27Q30 27 32 32Q34 36 29.5 36.6Q26.5 37 24 35.6Q21.5 37 18.5 36.6Q14 36 16 32Q18 27 24 27Z"/></g>',
  '0 0 48 48',
);

/**
 * The next cat's glass bubble (GAME_DESIGN §2.3): the back with its tail towards the paw, and
 * the shine drawn over the cat. Box 100 × 100; the bubble is the circle of radius 40 at (54, 46).
 */
export const NEXT_BUBBLE_BACK = svg(
  '<defs><radialGradient id="next-glass" cx="0.4" cy="0.35" r="0.7">' +
    '<stop offset="0" stop-color="#fff" stop-opacity="0.95"/>' +
    '<stop offset="0.7" stop-color="#eef8fb" stop-opacity="0.92"/>' +
    '<stop offset="1" stop-color="#d3ecf4" stop-opacity="0.95"/></radialGradient></defs>' +
    '<g fill="url(#next-glass)" stroke="#9cc8d6" stroke-width="2.6" stroke-linejoin="round">' +
    '<path d="M22 66Q14 82 6 90Q22 88 34 78Z"/><circle cx="54" cy="46" r="40"/></g>' +
    '<path d="M23.5 68Q17 79 9 87.5Q22 85.5 32.5 76.5" fill="none" stroke="#eef8fb" stroke-width="3"/>',
  '0 0 100 100',
);
export const NEXT_BUBBLE_SHINE = svg(
  '<g fill="none" stroke-linecap="round">' +
    '<path d="M24 36A31 31 0 0 1 42 16" stroke="#fff" stroke-width="4.5" opacity="0.9"/>' +
    '<path d="M78 72A35 35 0 0 0 89 54" stroke="#bfe2ec" stroke-width="3" opacity="0.8"/></g>' +
    '<circle cx="23" cy="48" r="2.4" fill="#fff" opacity="0.9"/>',
  '0 0 100 100',
);

/** A mon coin: gold with a square hole, outlined in ink. */
export const ICON_COIN = svg(
  '<circle cx="16" cy="16" r="13.5" fill="#f2b83b" stroke="#4a2e25" stroke-width="2.6"/>' +
    '<circle cx="16" cy="16" r="9" fill="none" stroke="#c98a1b" stroke-width="1.5"/>' +
    '<rect x="12.5" y="12.5" width="7" height="7" rx="1" fill="#fff8ee" stroke="#4a2e25" stroke-width="2"/>',
  '0 0 32 32',
);

const stroke = (body: string, width = 2.2): string =>
  svg(
    `<g fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`,
  );

export const ICON_SOUND_ON = stroke(
  '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
);

export const ICON_SOUND_OFF = stroke(
  '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
);

export const ICON_GEAR = stroke(
  '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
);

export const ICON_ARROW_UP = stroke('<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>', 3);

/** A paw print, filled, for PLAY. */
export const ICON_PAW = svg(
  '<g fill="currentColor"><path d="M16 14c-4.5 0-9 5.2-9 9 0 2.6 2 3.8 4.4 3.8 1.9 0 3-.9 4.6-.9s2.7.9 4.6.9c2.4 0 4.4-1.2 4.4-3.8 0-3.8-4.5-9-9-9z"/>' +
    '<ellipse cx="6.5" cy="12.5" rx="2.8" ry="3.6" transform="rotate(-20 6.5 12.5)"/><ellipse cx="12.5" cy="7" rx="3" ry="3.8"/>' +
    '<ellipse cx="19.5" cy="7" rx="3" ry="3.8"/><ellipse cx="25.5" cy="12.5" rx="2.8" ry="3.6" transform="rotate(20 25.5 12.5)"/></g>',
  '0 0 32 32',
);

export const ICON_MOTION = stroke(
  '<circle cx="15" cy="12" r="5"/><path d="M2 9h6"/><path d="M3 15h5"/><path d="M5 12h4"/>',
);

export const ICON_HELP = stroke(
  '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
);

export const ICON_CHEVRON = stroke('<path d="m9 18 6-6-6-6"/>', 2.6);

export const ICON_CHECK = stroke('<path d="M20 6 9 17l-5-5"/>', 3);

export const ICON_BACK = svg(
  '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
);

/** The iOS share glyph (a box with an arrow), so the hint matches what the player sees. */
export const ICON_SHARE = svg(
  '<path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M8 10H6v10h12V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
);

export const ICON_ROTATE = svg(
  '<rect x="16" y="6" width="20" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<path d="M8 30a16 16 0 0 0 10 12M40 18A16 16 0 0 0 30 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M30 2l0 6 6 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  '0 0 48 48',
);

export const ICON_PAUSE = svg(
  '<rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor"/>' +
    '<rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor"/>',
);

export const ICON_VIBRATE = stroke(
  '<rect x="7" y="4" width="10" height="16" rx="2"/><path d="M3 9v6"/><path d="M21 9v6"/>',
);

export const ICON_CLOSE = svg(
  '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
);

/** One glyph per upgrade for the shop cards (GAME_DESIGN §2.2). */
export const UPGRADE_ICONS: Readonly<Record<UpgradeId, string>> = {
  luckyPaw: svg(
    '<ellipse cx="12" cy="16" rx="5" ry="4.2" fill="currentColor"/>' +
      '<circle cx="5.5" cy="10.5" r="2.1" fill="currentColor"/>' +
      '<circle cx="9.3" cy="6.6" r="2.2" fill="currentColor"/>' +
      '<circle cx="14.7" cy="6.6" r="2.2" fill="currentColor"/>' +
      '<circle cx="18.5" cy="10.5" r="2.1" fill="currentColor"/>',
  ),
  bigCatch: svg(
    '<circle cx="6.5" cy="16.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="15" cy="11" r="7" fill="currentColor"/>',
  ),
  goldenMerge: svg(
    '<path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor"/>',
  ),
  comboCharm: svg('<path d="M13.5 2L5 13.5h5.5L9.5 22 19 9.5h-5.8z" fill="currentColor"/>'),
  secondChance: svg(
    '<path d="M12 20.5S3.5 15.2 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2c0 6-8.5 11.3-8.5 11.3z" fill="currentColor"/>',
  ),
};
