/** Inline SVG icons (no icon font, no network). They inherit `currentColor`. */

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
