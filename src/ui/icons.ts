/** Inline SVG icons (no icon font, no network). They inherit `currentColor`. */
import type { PickId } from '../config/picks';
import type { UpgradeId } from '../config/upgrades';

const svg = (body: string, viewBox = '0 0 24 24'): string =>
  `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

/**
 * The next cat's round glass bubble (GAME_DESIGN §2.3): the back, and the shine drawn over the
 * cat. Box 100 × 100; the bubble is the circle of radius 46 at the centre.
 */
export const NEXT_BUBBLE_BACK = svg(
  '<defs><radialGradient id="next-glass" cx="0.4" cy="0.35" r="0.7">' +
    '<stop offset="0" stop-color="#fff" stop-opacity="0.95"/>' +
    '<stop offset="0.7" stop-color="#eef8fb" stop-opacity="0.92"/>' +
    '<stop offset="1" stop-color="#d3ecf4" stop-opacity="0.95"/></radialGradient></defs>' +
    '<circle cx="50" cy="50" r="46" fill="url(#next-glass)" stroke="#9cc8d6" stroke-width="3"/>',
  '0 0 100 100',
);
export const NEXT_BUBBLE_SHINE = svg(
  '<g transform="translate(50 50) scale(1.15) translate(-54 -46)">' +
    '<g fill="none" stroke-linecap="round">' +
    '<path d="M24 36A31 31 0 0 1 42 16" stroke="#fff" stroke-width="4.5" opacity="0.9"/>' +
    '<path d="M78 72A35 35 0 0 0 89 54" stroke="#bfe2ec" stroke-width="3" opacity="0.8"/></g>' +
    '<circle cx="23" cy="48" r="2.4" fill="#fff" opacity="0.9"/></g>',
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
  comboCharm: svg('<path d="M13.5 2L5 13.5h5.5L9.5 22 19 9.5h-5.8z" fill="currentColor"/>'),
  secondChance: svg(
    '<path d="M12 20.5S3.5 15.2 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2c0 6-8.5 11.3-8.5 11.3z" fill="currentColor"/>',
  ),
};

/**
 * The special balls as DOM icons (the NEXT bubble, GAME_DESIGN §15), like the canvas ones: the
 * magnet is a cream disc with a red horseshoe magnet; a boulder is grey stone with one iron band
 * per extra merge it needs. Box 100 × 100, the ball fills it.
 */
export const MAGNET_SVG = svg(
  '<circle cx="50" cy="50" r="46" fill="#fff4e2" stroke="#3b2620" stroke-width="5"/>' +
    '<path d="M31 74V48a19 19 0 0 1 38 0v26" fill="none" stroke="#3b2620" stroke-width="22"/>' +
    '<path d="M31 74V48a19 19 0 0 1 38 0v26" fill="none" stroke="#d9483b" stroke-width="15"/>' +
    '<rect x="20" y="70" width="22" height="14" fill="#3b2620"/>' +
    '<rect x="58" y="70" width="22" height="14" fill="#3b2620"/>' +
    '<rect x="23.5" y="73" width="15" height="8" fill="#d5dbe0"/>' +
    '<rect x="61.5" y="73" width="15" height="8" fill="#d5dbe0"/>',
  '0 0 100 100',
);

/** The hanabi (GAME_DESIGN §15.6): a navy ball with a firework burst and a fuse. */
export const HANABI_SVG = svg(
  '<circle cx="50" cy="50" r="46" fill="#2f3d72" stroke="#3b2620" stroke-width="5"/>' +
    '<g stroke-width="5" stroke-linecap="round">' +
    '<path d="M50 40V22M50 60V78" stroke="#ff5a4e"/>' +
    '<path d="M40 50H22M60 50H78" stroke="#ffd34d"/>' +
    '<path d="M43 43L31 31M57 57L69 69" stroke="#7fe0ff"/>' +
    '<path d="M57 43L69 31M43 57L31 69" stroke="#ff9ad5"/>' +
    '</g>' +
    '<path d="M50 15q6-4 3-9" fill="none" stroke="#8a5a3b" stroke-width="5" stroke-linecap="round"/>',
  '0 0 100 100',
);

/** The joker cat (GAME_DESIGN §15.7): a white ball with a rainbow ring and a gold star. */
export const JOKER_SVG = svg(
  '<circle cx="50" cy="50" r="46" fill="#fffaf2" stroke="#3b2620" stroke-width="5"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke-width="9" stroke="#ff5a4e" stroke-dasharray="31.4 157" stroke-dashoffset="0.0" transform="rotate(-90 50 50)"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke-width="9" stroke="#ffa63d" stroke-dasharray="31.4 157" stroke-dashoffset="-31.4" transform="rotate(-90 50 50)"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke-width="9" stroke="#ffd34d" stroke-dasharray="31.4 157" stroke-dashoffset="-62.8" transform="rotate(-90 50 50)"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke-width="9" stroke="#6fcf6a" stroke-dasharray="31.4 157" stroke-dashoffset="-94.2" transform="rotate(-90 50 50)"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke-width="9" stroke="#58a8ff" stroke-dasharray="31.4 157" stroke-dashoffset="-125.6" transform="rotate(-90 50 50)"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke-width="9" stroke="#a77bff" stroke-dasharray="31.4 157" stroke-dashoffset="-157.0" transform="rotate(-90 50 50)"/>' +
    '<path d="M50 31l5.3 11.6 12.7 1.4-9.4 8.6 2.6 12.5L50 58.8l-11.2 6.3 2.6-12.5-9.4-8.6 12.7-1.4z" fill="#f2b83b" stroke="#3b2620" stroke-width="2.5" stroke-linejoin="round"/>',
  '0 0 100 100',
);

const boulderSvgs = new Map<number, string>();

/** A boulder with `bands` iron bands (the merges it needs, minus one). */
export function boulderSvg(bands: number): string {
  let markup = boulderSvgs.get(bands);
  if (markup) return markup;
  const rows = Array.from({ length: bands }, (_, i) => {
    const y = 50 + ((i + 1) / (bands + 1) - 0.5) * 69 - 4.5;
    return (
      `<rect x="0" y="${y - 1.5}" width="100" height="12" fill="#3b2620"/>` +
      `<rect x="0" y="${y}" width="100" height="9" fill="#56606b"/>` +
      `<circle cx="29" cy="${y + 4.5}" r="1.8" fill="#e6eaee"/>` +
      `<circle cx="71" cy="${y + 4.5}" r="1.8" fill="#e6eaee"/>`
    );
  }).join('');
  markup = svg(
    '<defs><clipPath id="boulder-clip"><circle cx="50" cy="50" r="44"/></clipPath></defs>' +
      '<circle cx="50" cy="50" r="46" fill="#9d968d"/>' +
      `<g clip-path="url(#boulder-clip)">` +
      '<circle cx="34" cy="64" r="4" fill="#746d65"/><circle cx="64" cy="32" r="3" fill="#746d65"/>' +
      '<circle cx="70" cy="62" r="2.6" fill="#746d65"/>' +
      `${rows}</g>` +
      '<circle cx="50" cy="50" r="46" fill="none" stroke="#3b2620" stroke-width="5"/>',
    '0 0 100 100',
  );
  boulderSvgs.set(bands, markup);
  return markup;
}

/** One glyph per trial and blessing for the pick cards (GAME_DESIGN §15.5). */
export const PICK_ICONS: Readonly<Record<PickId, string>> = {
  moreBoulders: svg(
    '<circle cx="8.5" cy="15" r="5.5" fill="currentColor"/>' +
      '<circle cx="16.5" cy="10" r="5" fill="currentColor"/>' +
      '<circle cx="17" cy="18.5" r="3" fill="currentColor"/>',
  ),
  ironBands: svg(
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
      '<path d="M3.6 9h16.8M3.6 15h16.8" stroke="currentColor" stroke-width="3"/>',
  ),
  bigBoulders: svg(
    '<circle cx="13" cy="12" r="9" fill="currentColor"/>' +
      '<path d="M9 7l3 4-2 3 4 3" fill="none" stroke="#fff8ee" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  moreMagnets: svg(
    '<path d="M6.5 20V11a5.5 5.5 0 0 1 11 0v9" fill="none" stroke="currentColor" stroke-width="4.5"/>' +
      '<path d="M4.2 17.5h4.6M15.2 17.5h4.6" stroke="#fff8ee" stroke-width="2"/>',
  ),
  bigDrops: svg(
    '<circle cx="6.5" cy="16.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="15" cy="11" r="7" fill="currentColor"/>',
  ),
  goldenCats: svg(
    '<path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor"/>',
  ),
  hanabi: svg(
    '<path d="M12 9V2.5M12 15v6.5M9 12H2.5M15 12h6.5M9.9 9.9L5.3 5.3M14.1 14.1l4.6 4.6M14.1 9.9l4.6-4.6M9.9 14.1l-4.6 4.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ),
  joker: svg(
    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
      '<path d="M12 7.2l1.5 3.1 3.4.4-2.5 2.3.7 3.4-3.1-1.7-3.1 1.7.7-3.4-2.5-2.3 3.4-.4z" fill="currentColor"/>',
  ),
  wind: svg(
    '<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ),
  heavyDrop: svg(
    '<circle cx="12" cy="16" r="5.5" fill="currentColor"/>' +
      '<path d="M7.5 3v5M12 2v6M16.5 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  ),
  porcelain: svg(
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
      '<path d="M6.5 7.5l4 3.5-2 3 5 2-1 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  ),
  hubris: svg(
    '<circle cx="7.3" cy="16.5" r="4.6" fill="currentColor"/>' +
      '<circle cx="16.7" cy="16.5" r="4.6" fill="currentColor"/>' +
      '<circle cx="12" cy="8" r="4.6" fill="currentColor"/>',
  ),
  echo: svg(
    '<circle cx="9" cy="11" r="6.5" fill="currentColor"/>' +
      '<circle cx="18.5" cy="16.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M16.5 5.5a7.5 7.5 0 0 1 3 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  ),
};
