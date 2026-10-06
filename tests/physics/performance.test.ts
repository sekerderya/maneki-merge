import { describe, expect, it } from 'vitest';
import { fillJar, STEPS_PER_SECOND } from './fixtures';

/**
 * ROADMAP M4: the average physics step stays under 2 ms with 150 cats in Node on the dev machine.
 * `npm run test:perf` runs this file alone, without coverage, and enforces that budget. Inside
 * the full suite, coverage instrumentation and parallel test files slow the loop down several
 * times over, so there it only catches gross regressions.
 */
const STRICT = import.meta.env.MODE === 'perf';
const BUDGET_MS = STRICT ? 2 : 20;

describe('performance', () => {
  it(`steps 150 settled cats in under ${BUDGET_MS} ms on average`, () => {
    const world = fillJar(1);
    for (let i = 0; i < 8 * STEPS_PER_SECOND; i++) world.step();
    const steps = 5 * STEPS_PER_SECOND;
    const start = performance.now();
    for (let i = 0; i < steps; i++) world.step();
    const average = (performance.now() - start) / steps;
    console.info(`Average physics step, 150 cats in the jar: ${average.toFixed(3)} ms`);
    expect(world.balls).toHaveLength(150);
    expect(average).toBeLessThan(BUDGET_MS);
  }, 60_000);
});
