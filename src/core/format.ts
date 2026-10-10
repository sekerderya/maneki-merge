/** Number formatting for scores, coins and prices (GAME_DESIGN §9). Locale-independent. */
import { SHORT_NUMBER_FROM } from '../config/economy';

const SUFFIXES: readonly (readonly [number, string])[] = [
  [1e33, 'Dc'],
  [1e30, 'No'],
  [1e27, 'Oc'],
  [1e24, 'Sp'],
  [1e21, 'Sx'],
  [1e18, 'Qi'],
  [1e15, 'Qa'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/**
 * Below 10,000: whole number with thousands separators ("9,999").
 * From 10,000: short format with at most 3 significant digits ("12.5K", "125K", "3.2M"), then
 * B, T, Qa (10^15), Qi (10^18), Sx, Sp, Oc, No and Dc (10^33): later stages pay in the trillions
 * and more, without end (v0.33). From 10^36 a mantissa and an exponent ("1.2e36").
 * The short format truncates instead of rounding, so a balance never looks bigger than it is
 * (59,960 coins shows "59.9K", not "60K" next to a 60K price).
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.floor(Math.abs(value));
  if (abs < SHORT_NUMBER_FROM) return sign + groupThousands(abs);
  if (abs >= SCIENTIFIC_FROM) return sign + scientific(abs);

  for (const [unit, suffix] of SUFFIXES) {
    if (abs < unit) continue;
    const scaled = abs / unit;
    // One decimal below 100 units ("12.5K"), none from 100 ("125K").
    const decimals = scaled < 100 ? 1 : 0;
    const factor = 10 ** decimals;
    const truncated = Math.floor(scaled * factor + 1e-9) / factor;
    return sign + trimZeros(truncated.toFixed(decimals)) + suffix;
  }
  return sign + groupThousands(abs);
}

/** From here on numbers show as "1.2e36": there are no more suffixes. */
const SCIENTIFIC_FROM = 1e36;

/** "1.2e36", truncated to one decimal like the short format. */
function scientific(abs: number): string {
  let exponent = Math.floor(Math.log10(abs));
  // log10 can land a hair off at exact powers of ten.
  if (10 ** exponent > abs) exponent--;
  if (10 ** (exponent + 1) <= abs) exponent++;
  const mantissa = Math.floor((abs / 10 ** exponent) * 10 + 1e-9) / 10;
  return `${trimZeros(mantissa.toFixed(1))}e${exponent}`;
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}
