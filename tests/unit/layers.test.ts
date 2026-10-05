import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * TECH_SPEC §3: the headless layers (config → core → physics → run) never import Phaser, the DOM
 * or the presentation layers, and only import the layers below them. These tests lint small
 * snippets as if they lived in each layer, to prove the ESLint rules really block them.
 */
// The first lint loads ESLint's config and parsers, which takes seconds while the suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const root = fileURLToPath(new URL('../..', import.meta.url));
let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: root });
});

async function errors(layer: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(`${code}\n`, { filePath: `src/${layer}/__probe__.ts` });
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? 'fatal');
}

const IMPORT_RULE = '@typescript-eslint/no-restricted-imports';

describe('headless layer rules', () => {
  it.each(['config', 'core', 'physics', 'run'])('%s/ may not import Phaser', async (layer) => {
    expect(await errors(layer, "import Phaser from 'phaser';\nexport const x = Phaser;")).toContain(
      IMPORT_RULE,
    );
  });

  it.each([
    ['config', '../ui/dom'],
    ['core', '../game'],
    ['physics', '../platform/storage'],
    ['run', '../audio'],
    ['run', '../debug/index'],
  ])('%s/ may not import %s', async (layer, path) => {
    expect(await errors(layer, `import { x } from '${path}';\nexport const y = x;`)).toContain(
      IMPORT_RULE,
    );
  });

  it.each([
    ['window.innerWidth'],
    ['document.body'],
    ['navigator.vibrate'],
    ['localStorage.getItem("k")'],
    ['requestAnimationFrame(() => 0)'],
    ['fetch("/x")'],
  ])('blocks the browser global in %s', async (expr) => {
    expect(await errors('core', `export const y = ${expr};`)).toContain('no-restricted-globals');
  });

  it('blocks Math.random', async () => {
    expect(await errors('physics', 'export const y = Math.random();')).toContain(
      'no-restricted-properties',
    );
  });

  it.each([
    ['config', '../core/rng'],
    ['config', '../physics'],
    ['config', '../run'],
    ['core', '../physics/index'],
    ['core', '../run'],
    ['physics', '../run/index'],
  ])('%s/ may not import the higher layer %s', async (layer, path) => {
    expect(await errors(layer, `import { x } from '${path}';\nexport const y = x;`)).toContain(
      IMPORT_RULE,
    );
  });

  it('keeps matter-js inside the physics layer', async () => {
    const code = "import Matter from 'matter-js';\nexport const y = Matter;";
    expect(await errors('core', code)).toContain(IMPORT_RULE);
    expect(await errors('config', code)).toContain(IMPORT_RULE);
    expect(await errors('physics', code)).toEqual([]);
  });

  it.each([
    ['core', '../config/tiers'],
    ['physics', '../core/rng'],
    ['physics', '../config/physics'],
    ['run', '../physics'],
    ['run', '../core/events'],
  ])('%s/ may import the lower layer %s', async (layer, path) => {
    expect(await errors(layer, `import { x } from '${path}';\nexport const y = x;`)).toEqual([]);
  });

  it('lets config/ name a core type, but not import core code', async () => {
    expect(
      await errors('config', "import type { Rng } from '../core/rng';\nexport type R = Rng;"),
    ).toEqual([]);
  });

  it('leaves the presentation layers free to use the browser', async () => {
    expect(
      await errors('ui', "import Phaser from 'phaser';\nexport const y = [Phaser, window];"),
    ).toEqual([]);
  });

  it('lints the real headless sources cleanly', async () => {
    const results = await eslint.lintFiles(
      ['config', 'core', 'physics', 'run'].map((layer) => `src/${layer}`),
    );
    const problems = results.flatMap((r) => r.messages.map((m) => `${r.filePath}: ${m.message}`));
    expect(problems).toEqual([]);
  });
});
