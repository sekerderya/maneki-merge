import { PICK_IDS, PICKS } from '../config/picks';
import type { PickId } from '../config/picks';
import { STAGE_COUNT, stageHoldsTier, stageInfo } from '../config/stages';
import { SIZE_COUNT } from '../config/tiers';
import { AudioEngine } from '../audio';
import type { SoundName } from '../audio';
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
  readonly audio: AudioEngine;
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
  /** The persistent wallet (GAME_DESIGN §11). */
  readonly wallet: number;
  /** The combo as it stands (0 once its window has passed). */
  readonly combo: number;
  readonly luckySaves: number;
  readonly stage: number;
  readonly balls: number;
  readonly canDrop: boolean;
  /** The dropper holds a ready magnet (GAME_DESIGN §15.2). */
  readonly canTake: boolean;
  /** What the dropper holds and what comes next: 'cat', 'magnet' or 'boulder'. */
  readonly current: string | null;
  readonly next: string | null;
  /** The pick waiting for a choice (GAME_DESIGN §15.5), or null. */
  readonly pick: { readonly kind: string; readonly options: readonly string[] } | null;
  /** The trials' and blessings' levels this run. */
  readonly pickLevels: Readonly<Record<string, number>> | null;
  /** The run's level, and the XP towards the next one (GAME_DESIGN §15.6). */
  readonly level: number;
  readonly xp: number;
  readonly xpToNext: number;
  /** The danger countdown is running (a cat is over the line). */
  readonly danger: boolean;
  /** The stage's smallest and last cat (making the last one clears the stage). */
  readonly firstTier: number;
  readonly lastTier: number;
  /** The HUD bar: the biggest cat in the jar against the last cat, 0–1. */
  readonly progress: number;
  /** The running expansion, or null. */
  readonly expansion: {
    readonly from: number;
    readonly to: number;
    readonly phase: 'clear' | 'zoom' | 'reveal';
  } | null;
  readonly ticks: number;
  /** Device pixels per CSS pixel the canvas renders at (adaptive, TECH_SPEC §6). */
  readonly resolution: number;
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
  /** Ids of the balls a magnet could take (landed), oldest first. */
  takeableIds(): number[];
  /** Where the ball `id` is on the page, in CSS pixels (to tap it), or null. */
  ballPoint(id: number): { readonly x: number; readonly y: number } | null;
  /** The magnet in the dropper takes the ball `id` (the oldest takeable one by default). */
  take(id?: number): boolean;
  /** Chooses an option of the waiting pick (its first by default). */
  choose(id?: PickId): boolean;
  /** Puts a magnet, a boulder or a golden cat in the dropper. */
  give(kind: 'magnet' | 'boulder' | 'golden'): void;
  /** Sets a trial's or blessing's level for this run. */
  setPickLevel(id: PickId, level: number): void;
  /** Opens a stage clear's picks now. */
  offerPicks(): void;
  /** Adds XP to the run; a level up opens its blessing. */
  addXp(amount: number): void;
  /** Puts a boulder of the stage's `size` needing `hits` merges into the jar at world x. */
  spawnBoulder(x?: number, size?: number, hits?: number): void;
  addCoins(coins: number): void;
  /** Applies from the next run. */
  setUpgrade(id: UpgradeId, level: number): void;
  /** Clears stage after stage up to `stage`, playing each expansion in turn. */
  setStage(stage: number): void;
  /** Sets the run score (records only). */
  setScore(score: number): void;
  /** Drops a cat of `tier` at world x from the dropper's height; ignored if the stage can't hold it. */
  spawnTier(tier: number, x?: number): void;
  /**
   * Places `pairs` touching pairs of `tier` cats in rows on the jar floor, so they all merge on
   * the next physics step (M9: many simultaneous merges). `tier` defaults to the stage's smallest
   * and must be below its last cat.
   */
  mergeBurst(pairs?: number, tier?: number): void;
  /** The audio context's state and the output's current peak (0–1; ≥ 1 clips). */
  audio(): { readonly state: string; readonly peak: number };
  /**
   * Renders `merges` simultaneous merges (pops, chings and rising combo notes) offline through
   * the real mixer and returns the output peak (≥ 1 would clip).
   */
  renderPeak(merges: number): Promise<number>;
  forceGameOver(): void;
  /** Acts as if the danger timer ran out: a Lucky Save if one is left, else game over. */
  forceDangerTimeout(): void;
  /** Wipes the save back to defaults and reloads the page. */
  resetSave(): void;
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
        wallet: session.profile.coins,
        combo: run?.combo ?? 0,
        luckySaves: run?.luckySavesLeft ?? 0,
        stage: run?.stage ?? 1,
        balls: run?.balls.length ?? 0,
        canDrop: run?.canDrop ?? false,
        canTake: run?.canTake ?? false,
        current: run?.current.kind ?? null,
        next: run?.next.kind ?? null,
        pick: run?.pickOffer
          ? { kind: run.pickOffer.kind, options: [...run.pickOffer.options] }
          : null,
        pickLevels: run?.pickLevels ?? null,
        level: run?.level ?? 1,
        xp: run?.xp ?? 0,
        xpToNext: run?.xpToNext ?? 0,
        danger: run?.dangerActive ?? false,
        firstTier: stageInfo(run?.stage ?? 1).firstTier,
        lastTier: stageInfo(run?.stage ?? 1).lastTier,
        progress: run?.progress.fraction ?? 0,
        expansion: run?.expansion
          ? { from: run.expansion.from, to: run.expansion.to, phase: run.expansion.phase }
          : null,
        ticks: run?.ticks ?? 0,
        resolution: ctx.game.resolution,
      };
    },
    ballXs() {
      return session.run?.balls.map((ball) => ball.x) ?? [];
    },
    dropAt(x) {
      return session.run?.drop(x) ?? false;
    },
    takeableIds() {
      const run = session.run;
      return run ? run.balls.filter((ball) => run.takeable(ball)).map((ball) => ball.id) : [];
    },
    ballPoint(id) {
      const run = session.run;
      const ball = run?.balls.find((b) => b.id === id);
      const box = ctx.game.jarBox();
      const canvas = document.querySelector('#game-screen canvas');
      if (!run || !ball || !box || !canvas) return null;
      const area = canvas.getBoundingClientRect();
      const unit = (box.right - box.left) / run.geometry.width;
      return {
        x: area.left + (box.left + box.right) / 2 + ball.x * unit,
        y: area.top + box.bottom + ball.y * unit,
      };
    },
    take(id) {
      const target = id ?? hooks.takeableIds()[0];
      return target === undefined ? false : (session.run?.take(target) ?? false);
    },
    choose(id) {
      const offer = session.run?.pickOffer;
      const target = id ?? offer?.options[0];
      return target === undefined ? false : (session.run?.choose(target) ?? false);
    },
    give(kind) {
      session.run?.giveSpecial(kind);
    },
    setPickLevel(id, level) {
      session.run?.setPickLevel(id, level);
    },
    offerPicks() {
      session.run?.offerPicks();
    },
    addXp(amount) {
      session.run?.addXp(amount);
    },
    spawnBoulder(x = 0, size = 2, hits = 1) {
      const run = session.run;
      if (!run) return;
      const tier = stageInfo(run.stage).firstTier + size - 1;
      if (!stageHoldsTier(run.stage, tier)) return;
      run.spawnBall(tier, x, undefined, { kind: 'boulder', hits: Math.max(1, Math.round(hits)) });
    },
    addCoins(coins) {
      session.addCoins(Math.max(0, Math.round(coins)));
    },
    setUpgrade(id, level) {
      session.setUpgrade(id, level);
    },
    setStage(stage) {
      session.run?.jumpToStage(Math.round(stage));
    },
    setScore(score) {
      session.run?.setScore(Math.max(0, Math.round(score)));
    },
    spawnTier(tier, x = 0) {
      const run = session.run;
      if (!run || !stageHoldsTier(run.stage, tier)) return;
      run.spawnBall(tier, x);
    },
    mergeBurst(pairs = 10, tier) {
      const run = session.run;
      if (!run) return;
      const { firstTier, lastTier } = stageInfo(run.stage);
      const t = tier ?? firstTier;
      if (!stageHoldsTier(run.stage, t) || t >= lastTier) return;
      const r = run.radiusOf(t);
      const half = run.geometry.halfWidth;
      const slot = 4 * r + 16;
      const perRow = Math.max(1, Math.floor((2 * half) / slot));
      for (let i = 0; i < pairs; i++) {
        const row = Math.floor(i / perRow);
        const x = -half + slot * ((i % perRow) + 0.5);
        const y = -r - row * (2 * r + 12);
        run.spawnBall(t, x - r + 1, y);
        run.spawnBall(t, x + r - 1, y);
      }
    },
    audio() {
      return ctx.audio.debugMeter();
    },
    renderPeak(merges) {
      const sounds: [SoundName, number][] = [];
      for (let i = 0; i < merges; i++) {
        sounds.push(['merge', 2 + (i % 12)], ['coin', 0], ['combo', i + 2]);
      }
      sounds.push(['jackpot', 0], ['whoosh', 0], ['chime', 0]);
      return AudioEngine.renderPeak(sounds);
    },
    forceGameOver() {
      session.run?.forceGameOver();
    },
    forceDangerTimeout() {
      session.run?.forceDangerTimeout();
    },
    resetSave() {
      session.profile.reset();
      window.location.reload();
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

  // Sizes 1–9: the buttons spawn the current stage's tier of that size.
  const size = select(
    Array.from({ length: SIZE_COUNT }, (_, i) => i + 1),
    1,
  );
  size.title = "Size (1 = the stage's smallest cat)";
  const tierOfSize = (): number =>
    stageInfo(hooks.state().stage).firstTier + Number(size.value) - 1;
  const stage = select(
    Array.from({ length: STAGE_COUNT - 1 }, (_, i) => i + 2),
    2,
  );
  const score = el('input', 'debug-input');
  score.type = 'number';
  score.value = '5000';
  const upgrade = el('select', 'debug-input');
  for (const id of UPGRADE_IDS) upgrade.append(new Option(UPGRADES[id].name, id));
  const level = el('input', 'debug-input');
  level.type = 'number';
  level.min = '0';
  level.value = '1';
  // The level field follows the chosen upgrade's range (0…max).
  const syncLevelRange = (): void => {
    const max = UPGRADES[upgrade.value as UpgradeId].maxLevel;
    level.max = String(max);
    if (Number(level.value) > max) level.value = String(max);
  };
  upgrade.addEventListener('change', syncLevelRange);
  syncLevelRange();
  // Trials and blessings (GAME_DESIGN §15.5): this run only.
  const pick = el('select', 'debug-input');
  for (const id of PICK_IDS) pick.append(new Option(PICKS[id].name, id));
  const pickLevel = el('input', 'debug-input');
  pickLevel.type = 'number';
  pickLevel.min = '0';
  pickLevel.value = '1';

  body.append(
    stats,
    row(
      size,
      action('Spawn size', () => hooks.spawnTier(tierOfSize(), 0)),
      action('Merge ×10', () => hooks.mergeBurst(10, tierOfSize())),
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
      action('Magnet', () => hooks.give('magnet')),
      action('Boulder', () => hooks.give('boulder')),
      action('Golden', () => hooks.give('golden')),
      action('Picks', () => hooks.offerPicks()),
    ),
    row(
      action('+25 XP', () => hooks.addXp(25)),
      action('Level up', () => {
        const s = hooks.state();
        hooks.addXp(s.xpToNext - s.xp);
      }),
    ),
    row(
      pick,
      pickLevel,
      action('Set run', () => hooks.setPickLevel(pick.value as PickId, Number(pickLevel.value))),
    ),
    row(
      action('+1000 coins', () => hooks.addCoins(1000)),
      action('Game over', () => hooks.forceGameOver()),
    ),
    row(
      action('Danger timeout', () => hooks.forceDangerTimeout()),
      action('Reset save', () => {
        if (window.confirm('Reset the save?')) hooks.resetSave();
      }),
    ),
  );
  panel.append(toggle, body);
  document.body.append(panel);

  window.setInterval(() => {
    if (body.hidden) return;
    const s = hooks.state();
    stats.textContent =
      `fps ${ctx.game.fps.toFixed(0)}  bodies ${s.balls}  res ${s.resolution}\n` +
      `${s.screen} · ${s.runState ?? '-'} · stage ${s.stage}\n` +
      `score ${s.score}  wallet ${s.wallet}
` +
      `combo ${s.combo}  saves ${s.luckySaves}`;
  }, 250);
}
