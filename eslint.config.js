import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Headless layers must run in Node (tests, balance simulator): no Phaser, no DOM, no
// presentation layers. Each layer may only import the layers below it (TECH_SPEC §3):
// config → core → physics → run.
const PRESENTATION = {
  group: [
    '**/game',
    '**/game/**',
    '**/ui',
    '**/ui/**',
    '**/audio',
    '**/audio/**',
    '**/platform',
    '**/platform/**',
    '**/debug',
    '**/debug/**',
  ],
  message: 'Headless layers must not import presentation or platform layers.',
};
const PHASER = {
  group: ['phaser', 'phaser/*'],
  message: 'Headless layers must not import Phaser.',
};
const MATTER = {
  group: ['matter-js', 'matter-js/*'],
  message: 'Only the physics layer talks to matter-js.',
};
const layer = (name, below) => ({
  group: [`**/${name}`, `**/${name}/**`],
  message: `This layer sits below ${name}/ and must not import it (${below}).`,
});
const CORE = layer('core', 'config may only import types from it');
const PHYSICS = layer('physics', 'config → core → physics → run');
const RUN = layer('run', 'config → core → physics → run');

const headless = (files, patterns) => ({
  files,
  rules: {
    'no-restricted-imports': 'off',
    '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
  },
});

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
    files: ['src/config/**', 'src/core/**', 'src/physics/**', 'src/run/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'self',
        'document',
        'navigator',
        'location',
        'history',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'fetch',
        'XMLHttpRequest',
        'requestAnimationFrame',
        'cancelAnimationFrame',
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
  // config may name a core type (no code crosses), nothing else from above it.
  headless(
    ['src/config/**'],
    [PHASER, PRESENTATION, MATTER, { ...CORE, allowTypeImports: true }, PHYSICS, RUN],
  ),
  headless(['src/core/**'], [PHASER, PRESENTATION, MATTER, PHYSICS, RUN]),
  headless(['src/physics/**'], [PHASER, PRESENTATION, RUN]),
  headless(['src/run/**'], [PHASER, PRESENTATION]),
  prettier,
);
