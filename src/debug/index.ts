import { stageInfo, STAGE_COUNT } from '../config/stages';
import { MAX_TIER } from '../config/tiers';
import { UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';
import type { UrlFlags } from '../core/urlFlags';
import type { GameView } from '../game';
import type { GameSession } from '../session';
import { button, el } from '../ui/dom';
import type { ScreenId } from '../ui/screenManager';

export interface DebugContext {
  readonly flags: UrlFlags;
  readonly session: GameSession;
  readonly game: GameView;
  screen(): ScreenId;
  /** Pretends a new service worker is waiting, to test the update badge policy. */
  simulateUpdateReady(): void;
}

/** A snapshot for tests; `run*` fields are null on the menu before the first run. */
export interface GameStateSnapshot {
  readonly screen: ScreenId;
  readonly runState: string | null;
  readonly score: number;
  readonly runCoins: number;
  readonly wallet: number;
  readonly stage: number;
  readonly balls: number;
  readonly canDrop: boolean;
  /** The danger countdown is running (a cat is over the line). */
  readonly danger: boolean;
  /** The next stage exists but isn't unlocked (the HUD shows a lock). */
  readonly locked: boolean;
  /** The running expansion, or null. */
  readonly expansion: {
    readonly from: number;
    readonly to: number;
    readonly phase: 'zoom' | 'reveal';
  } | null;
  readonly ticks: number;
}

/** Test hooks on `window.__game` (TECH_SPEC §11), installed only with `?debug=1`. */
export interface GameHooks {
  readonly flags: UrlFlags;
  screen(): ScreenId;
  simulateUpdateReady(): void;
  state(): GameStateSnapshot;
  /** World x of every cat in the jar, oldest first. */
  ballXs(): number[];
  /** Drops the dropper's cat at world x (0 is the jar's centre). False during the cooldown. */
  dropAt(x: number): boolean;
  addCoins(coins: number): void;
  /** Applies from the next run. */
  setUpgrade(id: UpgradeId, level: number): void;
  /**
   * Plays every expansion up to `stage`, one at a time, even past a locked stage (it opens them
   * for this run only).
   */
  setStage(stage: number): void;
  /** Sets the run score; the stage locks still apply. */
  setScore(score: number): void;
  spawnTier(tier: number, x?: number): void;
  forceGameOver(): void;
}

declare global {
  interface Window {
    __game?: GameHooks;
  }
}

export function installDebugHooks(ctx: DebugContext): GameHooks {
  const { session } = ctx;
  const hooks: GameHooks = {
    flags: ctx.flags,
    screen: ctx.screen,
    simulateUpdateReady: ctx.simulateUpdateReady,
    state() {
      const run = session.run;
      return {
        screen: ctx.screen(),
        runState: run?.state ?? null,
        score: run?.score ?? 0,
        runCoins: run?.coins ?? 0,
        wallet: session.wallet,
        stage: run?.stage ?? 1,
        balls: run?.balls.length ?? 0,
        canDrop: run?.canDrop ?? false,
        danger: run?.dangerActive ?? false,
        locked: run?.progress.locked ?? false,
        expansion: run?.expansion
          ? { from: run.expansion.from, to: run.expansion.to, phase: run.expansion.phase }
          : null,
        ticks: run?.ticks ?? 0,
      };
    },
    ballXs() {
      return session.run?.balls.map((ball) => ball.x) ?? [];
    },
    dropAt(x) {
      return session.run?.drop(x) ?? false;
    },
    addCoins(coins) {
      session.addCoins(coins);
    },
    setUpgrade(id, level) {
      session.setUpgrade(id, Math.max(0, Math.min(UPGRADES[id].maxLevel, Math.round(level))));
    },
    setStage(stage) {
      session.run?.jumpToStage(Math.round(stage));
    },
    setScore(score) {
      session.run?.setScore(Math.max(0, Math.round(score)));
    },
    spawnTier(tier, x = 0) {
      const run = session.run;
      if (!run || tier < 1 || tier > MAX_TIER) return;
      run.spawnBall(tier, x);
    },
    forceGameOver() {
      session.run?.forceGameOver();
    },
  };
  window.__game = hooks;
  createDebugPanel(ctx, hooks);
  return hooks;
}

/** The `?debug=1` panel: FPS, body count and the hooks as buttons. */
function createDebugPanel(ctx: DebugContext, hooks: GameHooks): void {
  const panel = el('aside', 'debug-panel');
  panel.dataset['testid'] = 'debug-panel';
  const toggle = button('debug-toggle', 'DBG');
  const body = el('div', 'debug-body');
  body.hidden = true;
  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
  });

  const stats = el('pre', 'debug-stats');
  const row = (...children: HTMLElement[]): HTMLElement => {
    const node = el('div', 'debug-row');
    node.append(...children);
    return node;
  };
  const action = (label: string, fn: () => void): HTMLButtonElement => {
    const node = button('debug-btn', label);
    node.addEventListener('click', fn);
    return node;
  };
  const select = (values: number[], initial: number): HTMLSelectElement => {
    const node = el('select', 'debug-input');
    for (const v of values) node.append(new Option(String(v), String(v), false, v === initial));
    return node;
  };

  const tier = select(
    Array.from({ length: MAX_TIER }, (_, i) => i + 1),
    1,
  );
  const stage = select(
    Array.from({ length: STAGE_COUNT - 1 }, (_, i) => i + 2),
    2,
  );
  const score = el('input', 'debug-input');
  score.type = 'number';
  score.value = String(stageInfo(2).threshold);
  const upgrade = el('select', 'debug-input');
  for (const id of UPGRADE_IDS) upgrade.append(new Option(UPGRADES[id].name, id));
  const level = el('input', 'debug-input');
  level.type = 'number';
  level.min = '0';
  level.value = '1';

  body.append(
    stats,
    row(
      tier,
      action('Spawn tier', () => hooks.spawnTier(Number(tier.value))),
    ),
    row(
      score,
      action('Set score', () => hooks.setScore(Number(score.value))),
    ),
    row(
      stage,
      action('Jump to stage', () => hooks.setStage(Number(stage.value))),
    ),
    row(
      upgrade,
      level,
      action('Set', () => hooks.setUpgrade(upgrade.value as UpgradeId, Number(level.value))),
    ),
    row(
      action('+1000 coins', () => hooks.addCoins(1000)),
      action('Game over', () => hooks.forceGameOver()),
    ),
  );
  panel.append(toggle, body);
  document.body.append(panel);

  window.setInterval(() => {
    if (body.hidden) return;
    const s = hooks.state();
    stats.textContent =
      `fps ${ctx.game.fps.toFixed(0)}  bodies ${s.balls}\n` +
      `${s.screen} · ${s.runState ?? '-'} · stage ${s.stage}\n` +
      `score ${s.score}  wallet ${s.wallet}`;
  }, 250);
}
