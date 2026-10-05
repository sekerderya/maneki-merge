/** Inline SVG icons (no icon font, no network). They inherit `currentColor`. */
import type { UpgradeId } from '../config/upgrades';

const svg = (body: string, viewBox = '0 0 24 24'): string =>
  `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICON_COIN = svg(
  '<circle cx="12" cy="12" r="10" fill="#f6c343" stroke="#a8691a" stroke-width="2"/>' +
    '<circle cx="12" cy="12" r="6" fill="none" stroke="#a8691a" stroke-width="1.5" opacity="0.6"/>',
);

export const ICON_SOUND_ON = svg(
  '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>' +
    '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
);

export const ICON_SOUND_OFF = svg(
  '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>' +
    '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
);

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

export const ICON_LOCK = svg(
  '<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/>' +
    '<path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
);

export const ICON_VIBRATE = svg(
  '<rect x="8" y="4" width="8" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M4 9v6M20 9v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
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
  shrineExpansion: svg(
    '<path d="M2.5 5.5c6 1.4 13 1.4 19 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M5 10h14M7 7v14M17 7v14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ),
  quickGrowth: svg(
    '<path d="M6 12l6-6 6 6M6 19l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  goldenTouch: svg(
    '<path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor"/>',
  ),
  comboCharm: svg('<path d="M13.5 2L5 13.5h5.5L9.5 22 19 9.5h-5.8z" fill="currentColor"/>'),
  secondChance: svg(
    '<path d="M12 20.5S3.5 15.2 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2c0 6-8.5 11.3-8.5 11.3z" fill="currentColor"/>',
  ),
  fortuneTeller: svg(
    '<circle cx="12" cy="10.5" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
      '<path d="M9 8.2a3.4 3.4 0 0 1 3-1.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M6.5 21h11l-1.6-3.2H8.1z" fill="currentColor"/>',
  ),
};
