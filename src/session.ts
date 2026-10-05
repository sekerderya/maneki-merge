/**
 * The play session (composition root, next to main.ts): starts runs, wires a run's events to
 * the HUD, overlays and hints, and owns pause, game over and quit. The run decides the rules,
 * the game scene draws it, the DOM shows its state; this file only connects them.
 *
 * Until the save system is wired in (M7), the wallet, best score, settings, upgrade levels and
 * seen hints live in memory for the session.
 */
import { HINT_MERGE_DELAY_MS } from './config/view';
import type { UpgradeId } from './config/upgrades';
import { EventBus } from './core/events';
import type { GameEvents } from './core/events';
import { defaultUpgradeLevels } from './core/upgrades';
import type { GameView } from './game';
import { RunController } from './run/RunController';
import type { HintView } from './ui/banners/hint';
import type { HudView } from './ui/hud/hud';
import type { GameOverView } from './ui/overlays/gameOverOverlay';
import type { PauseView } from './ui/overlays/pauseOverlay';
import type { GameBackResult } from './ui/screenManager';

export interface SessionParts {
  readonly game: GameView;
  readonly hud: HudView;
  readonly hint: HintView;
  readonly pause: PauseView;
  readonly gameOver: GameOverView;
  /** A fixed seed (`?seed=`) for every run, or null for a fresh one each time. */
  readonly seed: number | null;
  readonly onWalletChange: (coins: number) => void;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

export class GameSession {
  readonly settings: Settings = { sound: true, haptics: true };
  readonly upgrades = defaultUpgradeLevels();
  private walletCoins = 0;
  private best = 0;
  private readonly seen = { aim: false, merge: false };
  private current: RunController | null = null;
  private hintTimer = 0;

  constructor(private readonly parts: SessionParts) {}

  get run(): RunController | null {
    return this.current;
  }

  get wallet(): number {
    return this.walletCoins;
  }

  get bestScore(): number {
    return this.best;
  }

  addCoins(coins: number): void {
    this.walletCoins += coins;
    this.parts.onWalletChange(this.walletCoins);
  }

  setUpgrade(id: UpgradeId, level: number): void {
    this.upgrades[id] = level;
  }

  /** Starts a new run (PLAY, Play Again). */
  startRun(): void {
    const { game, hud, hint, pause, gameOver } = this.parts;
    pause.hide();
    gameOver.hide();
    hint.hide();
    window.clearTimeout(this.hintTimer);

    const events = new EventBus<GameEvents>();
    const run = new RunController({
      seed: this.parts.seed ?? freshSeed(),
      upgrades: { ...this.upgrades },
      events,
      bank: (coins) => this.addCoins(coins),
    });
    this.current = run;

    const showProgress = (): void => {
      const p = run.progress;
      hud.setStage(run.stage, p.fraction, p.locked, p.target === null);
    };
    const showPreview = (): void => hud.setPreview(run.preview);
    hud.setScore(run.score);
    hud.setCoins(run.coins);
    showPreview();
    showProgress();

    events.on('scoreChanged', (e) => {
      hud.setScore(e.score);
      showProgress();
    });
    events.on('runCoinsChanged', (e) => hud.setCoins(e.coins));
    events.on('catDropped', showPreview);
    events.on('expansionFinished', () => {
      showPreview();
      showProgress();
    });
    events.on('gameOver', (e) => this.onGameOver(e));

    // First-run hints (GAME_DESIGN §2.3).
    if (!this.seen.aim) hint.show('Drag to aim, release to drop');
    events.on('catDropped', () => {
      if (!this.seen.aim) {
        this.seen.aim = true;
        hint.hide();
      }
      if (!this.seen.merge && this.hintTimer === 0) {
        this.hintTimer = window.setTimeout(() => {
          if (this.current === run && !this.seen.merge) hint.show('Merge two identical cats');
        }, HINT_MERGE_DELAY_MS);
      }
    });
    events.on('merged', () => {
      if (this.seen.merge) return;
      this.seen.merge = true;
      window.clearTimeout(this.hintTimer);
      hint.hide();
    });
    this.hintTimer = 0;

    game.show(run);
  }

  pauseRun(): void {
    const run = this.current;
    if (!run || this.parts.gameOver.visible) return;
    run.pause();
    if (run.state === 'paused') this.parts.pause.show();
  }

  resumeRun(): void {
    this.parts.pause.hide();
    this.current?.resume();
  }

  /** Leaves the game for the menu: the run ends (its coins are already banked). */
  endRun(): void {
    window.clearTimeout(this.hintTimer);
    this.parts.pause.hide();
    this.parts.gameOver.hide();
    this.parts.hint.hide();
    this.parts.game.sleep();
    this.current = null;
  }

  /** Back in the game: game → pause; pause or game over → menu. */
  onBack(): GameBackResult {
    if (this.parts.pause.visible || this.parts.gameOver.visible || !this.current) return 'menu';
    this.pauseRun();
    return 'stay';
  }

  /** Backgrounding or a sideways phone pauses a run in progress. */
  autoPause(): void {
    const state = this.current?.state;
    if (state === 'playing' || state === 'expanding') this.pauseRun();
  }

  private onGameOver(e: GameEvents['gameOver']): void {
    window.clearTimeout(this.hintTimer);
    this.parts.hint.hide();
    this.parts.pause.hide();
    const newBestScore = e.score > this.best;
    if (newBestScore) this.best = e.score;
    this.parts.gameOver.show({
      score: e.score,
      bestScore: this.best,
      stage: e.stage,
      coins: e.coins,
      newBestScore,
    });
  }
}

function freshSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? Date.now() >>> 0;
}
