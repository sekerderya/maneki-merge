/**
 * The headless pieces of the play statistics (TECH_SPEC §17): the stage names, a stage's coins by
 * source, its frame-rate samples, error stacks read into frames, and the filter that sends each
 * error once. `platform/analytics.ts` and `runAnalytics.ts` build on them.
 */
import {
  ANALYTICS_ERROR_MESSAGE_MAX,
  ANALYTICS_ERRORS_PER_LAUNCH,
  ANALYTICS_STACK_FRAMES_MAX,
  COIN_SOURCES,
  STAGE_LABEL_DIGITS,
} from '../config/analytics';
import type { CoinSource } from '../config/analytics';

/** A stage's progression name: `stage01`, `stage12`, `stage120`. */
export function stageLabel(stage: number): string {
  const n = Number.isFinite(stage) ? Math.max(0, Math.round(stage)) : 0;
  return `stage${String(n).padStart(STAGE_LABEL_DIGITS, '0')}`;
}

/** The coins a stage paid, by source, until they are reported. */
export class CoinTally {
  private readonly totals = new Map<CoinSource, number>();

  add(source: CoinSource, amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.totals.set(source, (this.totals.get(source) ?? 0) + amount);
  }

  /** The totals that aren't zero, in `COIN_SOURCES` order; the tally starts over. */
  take(): { readonly source: CoinSource; readonly amount: number }[] {
    const out = COIN_SOURCES.flatMap((source) => {
      const amount = this.totals.get(source) ?? 0;
      return amount > 0 ? [{ source, amount }] : [];
    });
    this.totals.clear();
    return out;
  }
}

/** A stage's frame-rate samples. */
export class FpsSamples {
  private count = 0;
  private sum = 0;
  private lowest = Infinity;

  add(fps: number): void {
    if (!Number.isFinite(fps) || fps <= 0) return;
    this.count++;
    this.sum += fps;
    this.lowest = Math.min(this.lowest, fps);
  }

  /** The average and the lowest sample, rounded, or null without samples; starts over. */
  take(): { readonly average: number; readonly low: number } | null {
    const out =
      this.count === 0
        ? null
        : { average: Math.round(this.sum / this.count), low: Math.round(this.lowest) };
    this.count = 0;
    this.sum = 0;
    this.lowest = Infinity;
    return out;
  }
}

/** One line of an error's stack. */
export interface StackFrame {
  readonly functionName?: string;
  readonly fileName?: string;
  readonly lineNumber?: number;
}

/** V8 (Chrome, the Android WebView): `    at fn (https://…/index.js:1:2)` or `    at https://…:1:2`. */
const V8_FRAME = /^\s*at (?:(.+?) \()?(.+?):(\d+):\d+\)?$/;
/** WebKit (Safari) and Firefox: `fn@https://…/index.js:1:2`, `@https://…:1:2`. */
const AT_FRAME = /^(.*?)@(.+?):(\d+):\d+$/;

/** Reads an error's stack into frames (at most `max`); lines it can't read are skipped. */
export function parseStack(
  stack: string | null | undefined,
  max: number = ANALYTICS_STACK_FRAMES_MAX,
): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split('\n')) {
    if (frames.length >= max) break;
    const match = V8_FRAME.exec(line) ?? AT_FRAME.exec(line.trim());
    if (!match) continue;
    const [, fn, file, lineNumber] = match;
    frames.push({
      ...(fn ? { functionName: fn } : {}),
      ...(file ? { fileName: file } : {}),
      lineNumber: Number(lineNumber),
    });
  }
  return frames;
}

/** An error, a rejection's reason or anything thrown, as a message and a stack. */
export function describeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    const name = error.name || 'Error';
    return { message: `${name}: ${error.message}`, stack: error.stack ?? null };
  }
  if (typeof error === 'string') return { message: error, stack: null };
  try {
    return { message: JSON.stringify(error) ?? String(error), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

/** Lets each error message through once, and at most `limit` a launch. */
export class ErrorFilter {
  private readonly seen = new Set<string>();

  constructor(private readonly limit: number = ANALYTICS_ERRORS_PER_LAUNCH) {}

  /** The message to send (cut to ANALYTICS_ERROR_MESSAGE_MAX), or null when it is held back. */
  accept(message: string): string | null {
    const text = message.trim().slice(0, ANALYTICS_ERROR_MESSAGE_MAX) || 'Unknown error';
    if (this.seen.has(text) || this.seen.size >= this.limit) return null;
    this.seen.add(text);
    return text;
  }
}
