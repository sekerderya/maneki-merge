import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';
import { THEME_COLOR } from './src/config/app.ts';

// Generates the PWA icon set from public/icon.svg into public/ (`npm run icons`).
// The output is committed, so builds don't depend on sharp.
// The source is a full-bleed square, so no padding is added.
const resizeOptions = { background: THEME_COLOR, fit: 'contain' as const };

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0, resizeOptions },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions },
  },
  images: ['public/icon.svg'],
});
