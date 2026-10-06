/**
 * The play session (composition root, next to main.ts): starts runs, wires a run's events to
 * the HUD, overlays, banners, coin flights and hints, and owns pause, game over and quit. The
 * run decides the rules, the profile keeps what lasts, the game scene draws it, the DOM shows
 * its state; this file only connects them.
 */
import { COMBO_BANNER_MIN } from './config/economy';
import {
  BANNER_JAR_OFFSET,
  BANNER_NEW_CATS_MS,
  COMBO_JAR_OFFSET,
  HINT_MERGE_DELAY_MS,
  JACKPOT_COIN_FLIGHTS,
} from './config/view';
import type { UpgradeId } from './config/upgrades';
import { EventBus } from './core/events';
import type { GameEvents } from './core/events';
import { connectRunFeedback } from './feedback';
import type { FeedbackOutputs } from './feedback';
import { newRecords } from './core/profile';
import type { Profile, Records, Settings } from './core/profile';
import { comboBonus } from './core/upgrades';
import type { GameView } from './game';
import { startProfileRun } from './run/profileRun';
import type { RunController } from './run/RunController';
import type { BannerView } from './ui/banners/banner';
import type { HintView } from './ui/banners/hint';
import type { CoinFlyView } from './ui/fx/coinFly';
import type { HudView } from './ui/hud/hud';
import type { GameOverView } from './ui/overlays/gameOverOverlay';
import type { PauseView } from './ui/overlays/pauseOverlay';
import type { GameBackResult } from './ui/screenManager';

export interface SessionParts {
  readonly profile: Profile;
  readonly game: GameView;
  readonly hud: HudView;
  readonly hint: HintView;
  readonly banners: BannerView;
  readonly coins: CoinFlyView;
  readonly pause: PauseView;
  readonly gameOver: GameOverView;
  /** Sound effects and haptics for the run's events. */
  readonly feedback: FeedbackOutputs;
  /** A fixed seed (`?seed=`) for every run, or null for a fresh one each time. */
  readonly seed: number | null;
  /** The wallet, records or settings changed (the menu shows them). */
  readonly onProfileChange: () => void;
}

export class GameSession {
  private current: RunController | null = null;
  private hintTimer = 0;
  /** The records as they were when the current run started, for the Game Over badges. */
  private recordsBefore: Records;

  constructor(private readonly parts: SessionParts) {
    this.recordsBefore = parts.profile.records;
    // Coins fly from wherever the scene shows a payout to the HUD counter.
    parts.game.onCoins((x, y, big) =>
      parts.coins.fly(x, y, big ? JACKPOT_COIN_FLIGHTS : 1, () => parts.hud.pulseCoins()),
    );
  }

  get run(): RunController | null {
    return this.current;
  }

  get profile(): Profile {
    return this.parts.profile;
  }

  get settings(): Settings {
    return this.parts.profile.settings;
  }

  /** Debug: coins from outside play. */
  addCoins(coins: number): void {
    this.parts.profile.grant(coins);
    this.parts.onProfileChange();
  }

  /** Debug: applies from the next run. */
  setUpgrade(id: UpgradeId, level: number): void {
    this.parts.profile.setUpgrade(id, level);
    this.parts.onProfileChange();
  }

  setSetting(key: keyof Settings, on: boolean): void {
    this.parts.profile.setSetting(key, on);
    this.parts.onProfileChange();
  }

  /** "How to play" (Settings): the first-run hints show again in the next run. */
  replayHints(): void {
    this.parts.profile.resetHints();
  }

  /** Writes everything pending (backgrounding, page hide, leaving a run). */
  save(): boolean {
    return this.parts.profile.flush();
  }

  /** Starts a new run (PLAY, Play Again). */
  startRun(): void {
    const { game, hud, hint, banners, coins, pause, gameOver, profile } = this.parts;
    pause.hide();
    gameOver.hide();
    hint.hide();
    banners.clear();
    coins.clear();
    window.clearTimeout(this.hintTimer);

    this.recordsBefore = profile.records;
    const events = new EventBus<GameEvents>();
    const run = startProfileRun(profile, {
      seed: this.parts.seed ?? freshSeed(),
      events,
    });
    this.current = run;
    connectRunFeedback(events, this.parts.feedback);

    const showProgress = (): void => {
      const p = run.progress;
      hud.setStage(run.stage, p.fraction, p.goalTier, p.locked, p.final);
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
    // The menu catches up with the wallet when the run ends (it is hidden until then). Coins also
    // change when cats pop, which can shrink the biggest cat in the jar.
    events.on('runCoinsChanged', (e) => {
      hud.setCoins(e.coins);
      showProgress();
    });
    events.on('catDropped', () => {
      showPreview();
      showProgress();
    });

    // Banners sit in the empty top of the jar (GAME_DESIGN §2.3).
    const jarY = (fraction: number): number | undefined => {
      const box = game.jarBox();
      return box ? box.top + fraction * (box.bottom - box.top) : undefined;
    };
    const bannerY = (): number | undefined => jarY(BANNER_JAR_OFFSET);

    // Combo (GAME_DESIGN §5): "Combo ×N" from N = 2, with the Combo Charm bonus when it has one.
    events.on('comboChanged', (e) => {
      if (e.combo < COMBO_BANNER_MIN) {
        banners.combo(0, 0);
        return;
      }
      banners.combo(
        e.combo,
        comboBonus(run.stats.comboCharmLevel, e.combo),
        jarY(COMBO_JAR_OFFSET),
      );
    });
    events.on('jackpot', (e) =>
      banners.show('Jackpot!', { coins: e.coins, y: bannerY(), tone: 'jackpot' }),
    );
    events.on('luckySave', (e) =>
      banners.show('Lucky Save!', {
        detail: e.savesLeft > 0 ? `${e.savesLeft} left` : undefined,
        y: bannerY(),
      }),
    );

    // Stage clears and expansions (GAME_DESIGN §7, §7.1, §7.2).
    events.on('stageCleared', (e) => {
      banners.combo(0, 0);
      showProgress();
      banners.show(e.next === 'expand' ? 'The shrine grows!' : 'Stage clear!', { y: bannerY() });
    });
    events.on('expansionRevealed', (e) => {
      showPreview();
      showProgress();
      // The new stage's last cat is the next goal.
      const goal = e.newTiers[e.newTiers.length - 1];
      banners.show('New cats unlocked!', {
        detail: 'Next goal',
        tiers: goal === undefined ? [] : [goal],
        durationMs: BANNER_NEW_CATS_MS,
        y: bannerY(),
      });
    });
    events.on('expansionFinished', () => {
      showPreview();
      showProgress();
    });
    events.on('expansionLocked', () => {
      showProgress();
      hud.pulseLock();
      banners.toast('Expansion locked — upgrade the Shrine in the shop');
    });
    events.on('paused', () => banners.setPaused(true));
    events.on('resumed', () => banners.setPaused(false));
    events.on('gameOver', (e) => this.onGameOver(e));

    // First-run hints (GAME_DESIGN §2.3), remembered in the save.
    if (!profile.hintSeen('aim')) hint.show('Drag to aim, release to drop');
    events.on('catDropped', () => {
      if (!profile.hintSeen('aim')) {
        profile.markHintSeen('aim');
        hint.hide();
      }
      if (!profile.hintSeen('merge') && this.hintTimer === 0) {
        this.hintTimer = window.setTimeout(() => {
          if (this.current === run && !profile.hintSeen('merge')) {
            hint.show('Merge two identical cats');
          }
        }, HINT_MERGE_DELAY_MS);
      }
    });
    events.on('merged', () => {
      if (profile.hintSeen('merge')) return;
      profile.markHintSeen('merge');
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
    this.parts.banners.clear();
    this.parts.coins.clear();
    this.parts.game.sleep();
    this.current = null;
    this.save();
    this.parts.onProfileChange();
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
    this.parts.banners.clear();
    this.parts.pause.hide();
    const records = newRecords(this.recordsBefore, e);
    this.parts.gameOver.show({
      score: e.score,
      bestScore: this.parts.profile.records.bestScore,
      stage: e.stage,
      coins: e.coins,
      highestTier: e.highestTier,
      records,
    });
    this.parts.onProfileChange();
  }
}

function freshSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? Date.now() >>> 0;
}
