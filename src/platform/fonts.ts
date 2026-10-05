import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-700.css';
import { FONT_LOAD_TIMEOUT_MS } from '../config/platform';

/**
 * Waits until the bundled Fredoka faces are ready (canvas text needs them loaded up front),
 * but never blocks boot for longer than the timeout.
 */
export async function loadFonts(): Promise<void> {
  if (!('fonts' in document)) return;
  const loads = Promise.all([
    document.fonts.load('500 1em Fredoka'),
    document.fonts.load('700 1em Fredoka'),
  ]).then(() => undefined);
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, FONT_LOAD_TIMEOUT_MS));
  await Promise.race([loads.catch(() => undefined), timeout]);
}
