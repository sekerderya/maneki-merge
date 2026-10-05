import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Headless layers must run in Node (tests, balance simulator): no Phaser, no DOM, no presentation layers.
const HEADLESS_LAYERS = ['src/config/**', 'src/core/**', 'src/physics/**', 'src/run/**'];

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'playwright-report/', 'test-results/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: HEADLESS_LAYERS,
    languageOptions: {
      globals: { ...globals.es2022 },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*'],
              message: 'Headless layers must not import Phaser.',
            },
            {
              group: ['**/game/**', '**/ui/**', '**/audio/**', '**/platform/**', '**/debug/**'],
              message: 'Headless layers must not import presentation or platform layers.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'sessionStorage',
        'requestAnimationFrame',
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG in src/core/rng.ts.',
        },
      ],
    },
  },
  prettier,
);
