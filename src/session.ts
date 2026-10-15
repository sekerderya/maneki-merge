/**
 * The play session (composition root, next to main.ts): starts runs, wires a run's events to
 * the HUD, overlays, banners, coin flights and hints, and owns pause, game over and quit. It keeps
 * the run in progress saved (GAME_DESIGN §11), so closing the app never ends it. The
 * run decides the rules, the profile keeps what lasts, the game scene draws it, the DOM shows
 * its state; this file only connects them.
 */
import { COMBO_BANNER_MIN } from './config/economy';
import {
  BANNER_JAR_OFFSET,
  COMBO_JAR_OFFSET,
  STAGE_CLEAR_BANNER_MS,
  STAGE_CLEAR_EXIT_MS,
  SHRINE_GROWS_BANNER_MS,
  HINT_MERGE_DELAY_MS,
  GOLDEN_COIN_FLIGHTS,
  JACKPOT_COIN_FLIGHTS,
  LUCKY_GIFT_CARD_DELAY_MS,
  LUCKY_GIFT_COIN_FLIGHTS,
  RULE_HINT_MS,
} from './config/view';
import { introCard, isHazardCard } from './config/introCards';
import type { IntroCard, IntroCardId } from './config/introCards';
import { clearGrowsJar, stageJar } from './config/stages';
import { clearPicks, RULE_IDS } from './config/picks';
import type { PickId, PickKind } from './config/picks';
import type { ScenarioDef } from './config/scenarios';
import type { UpgradeId } from './config/upgrades';
import { jarCoinMultiplier } from './core/economy';
import { EventBus } from './core/events';
import type { GameEvents } from './core/events';
import { connectRunFeedback } from './feedback';
import type { FeedbackOutputs } from './feedback';
import { pickCard } from './core/picks';
import { newRecords } from './core/profile';
import type { Profile, Records, Settings } from './core/profile';
import type { RunSave } from './core/runSave';
import { comboBonus } from './core/upgrades';
import type { GameView } from './game';
import { resumeProfileRun, startProfileRun } from './run/profileRun';
import { startScenarioRun } from './run/scenario';
import type { RunController } from './run/RunController';
import type { BannerView } from './ui/banners/banner';
import type { HintView } from './ui/banners/hint';
import type { CoinFlyView } from './ui/fx/coinFly';
import type { DoorsView } from './ui/fx/doors';
import type { HudView } from './ui/hud/hud';
import type { GameOverView } from './ui/overlays/gameOverOverlay';
import type { PauseView } from './ui/overlays/pauseOverlay';
import type { PickView } from './ui/overlays/pickOverlay';
import type { GameBackResult } from './ui/screenManager';

/** Where the run in progress is kept; `RunSaveStore` fits. */
export interface RunSaveSink {
  save(save: RunSave): boolean;
  clear(): void;
}

export interface SessionParts {
  readonly profile: Profile;
  readonly runSave: RunSaveSink;
  readonly game: GameView;
  readonly hud: HudView;
  readonly hint: HintView;
  readonly banners: BannerView;
  readonly coins: CoinFlyView;
  readonly pause: PauseView;
  readonly gameOver: GameOverView;
  /** A stage clear's trial and blessing cards (GAME_DESIGN §15.5). */
  readonly picks: PickView;
  /** The doors that shut over the game while the picks are made (GAME_DESIGN §7.1). */
  readonly doors: DoorsView;
  /** The cards that bring a hazard or a rule in as a stage opens (GAME_DESIGN §15.5). */
  readonly introCard: { readonly visible: boolean; show(card: IntroCard): void; hide(): void };
  /** The garden behind the jar: a new one each time the jar grows (GAME_DESIGN §7). */
  readonly scenery: {
    setJar(jar: number, grow: boolean, newRun?: boolean): void;
    setPaused(paused: boolean): void;
    setWind(level: number, direction: 1 | -1): void;
  };
  /** Sound effects and haptics for the run's events. */
  readonly feedback: FeedbackOutputs;
  /** A fixed seed (`?seed=`) for every run, or null for a fresh one each time. */
  readonly seed: number | null;
  /** Gravity for every run as a multiple of the normal one (`?gravity=`), or null for normal. */
  readonly gravityScale: number | null;
  /** The wallet, records or settings changed (the menu shows them). */
  readonly onProfileChange: () => void;
}

/** No new records (a scene's Game Over). */
const NO_RECORDS = { score: false, stage: false, highestTier: false } as const;

/** A rule's hint pill (GAME_DESIGN §15.11, §15.13). */
const RULE_HINTS: Partial<Record<PickId, string>> = {
  hubris: 'Hubris: three small cats merge at once and skip a size',
  copycat: 'Copycat: the next cat copies your last merge',
  heavyDrop: 'Heavy Drop: cats shoot down like fireballs',
};

export class GameSession {
  private current: RunController | null = null;
  private hintTimer = 0;
  /** A rule's hint for the start of the next stage (GAME_DESIGN §15.11), and its timer. */
  private ruleHint: string | null = null;
  private ruleHintTimer = 0;
  private runSavePending = false;
  /** The last pick, chosen but held back until the doors are open (then the next stage starts). */
  private heldPick: PickId | null = null;
  /** When the latest stage clear started (performance.now()), so the doors wait for its banner. */
  private clearedAt = 0;
  /** The doors' wait for the stage-clear banner. */
  private doorsTimer = 0;
  /** The cards still to show as this stage opens, and the one showing. */
  private cards: IntroCardId[] = [];
  private shownCard: IntroCardId | null = null;
  /** Time is held (the run paused, without the pause overlay) for the cards. */
  private holding = false;
  /** A Lucky gift paid at this clear, shown as the next stage opens; and the timers that wait. */
  private pendingGift = 0;
  private giftTimer = 0;
  private cardTimer = 0;
  /** The records as they were when the current run started, for the Game Over badges. */
  private recordsBefore: Records;
  /**
   * The scene being played (GAME_DESIGN §2.6), or null for a real run. A scene's run is a sandbox:
   * nothing it earns reaches the profile, it is never saved, and it shows no first-run hints.
   */
  private scenario: ScenarioDef | null = null;

  constructor(private readonly parts: SessionParts) {
    this.recordsBefore = parts.profile.records;
    // Coins fly from wherever the scene shows a payout to the HUD counter: a shower for a
    // Jackpot, three coins for a golden merge.
    parts.game.onCoins((x, y, kind) => {
      const flights =
        kind === 'jackpot' ? JACKPOT_COIN_FLIGHTS : kind === 'golden' ? GOLDEN_COIN_FLIGHTS : 1;
      parts.coins.fly(x, y, flights, () => parts.hud.pulseCoins());
    });
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

  /** The scene being played, or null. */
  get scene(): ScenarioDef | null {
    return this.scenario;
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

  /** Debug: the best stage, which opens the shop's cards (GAME_DESIGN §2.2). */
  setBestStage(stage: number): void {
    this.parts.profile.setBestStage(stage);
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

  /**
   * The pick panel's Choose: the waiting pick takes `id`. The last pick waits for the doors to
   * fold open, so the next stage starts as they open (GAME_DESIGN §7.1).
   */
  choosePick(id: PickId): void {
    const run = this.current;
    const offer = run?.pickOffer;
    if (!run || !offer?.options.includes(id)) return;
    if (run.pickFollows) {
      run.choose(id);
      return;
    }
    this.parts.picks.hide();
    this.heldPick = id;
    this.parts.game.setCovered(false);
    this.parts.doors.open(() => this.releasePick(run));
  }

  /**
   * The cards due as `run`'s stage opens (GAME_DESIGN §15.5), each once per profile: the hazard the
   * cleared stage brings in, and every rule this run has taken that the profile hasn't been shown.
   * None in a scene.
   */
  private dueCards(run: RunController): IntroCardId[] {
    const { profile } = this.parts;
    if (this.scenario) return [];
    const cleared = run.stage - 1;
    const due: IntroCardId[] = [];
    const hazard = clearPicks(cleared, clearGrowsJar(cleared)).card;
    if (hazard && !profile.hintSeen(hazard)) due.push(hazard);
    for (const rule of RULE_IDS) {
      if (run.pickLevels[rule] > 0 && !profile.hintSeen(rule)) due.push(rule);
    }
    return due;
  }

  /**
   * The stage opens: a Lucky gift's banner and coins, then the cards, once the stage-clear banner
   * is gone (it still shows when no doors came). Time is held from now until the last card closes.
   */
  private openStage(run: RunController, cards: readonly IntroCardId[], gift: number): void {
    const wait =
      this.clearedAt > 0 ? this.clearedAt + STAGE_CLEAR_BANNER_MS - performance.now() : 0;
    this.clearedAt = 0;
    if (gift === 0 && cards.length === 0) return;
    if (cards.length > 0) {
      this.holding = true;
      // Once the run has finished opening the stage.
      queueMicrotask(() => {
        if (this.current === run && this.holding && run.state === 'playing') run.pause();
      });
    }
    window.clearTimeout(this.giftTimer);
    this.giftTimer = window.setTimeout(
      () => {
        if (this.current !== run) return;
        if (gift > 0) this.showGift(gift);
        if (cards.length === 0) return;
        window.clearTimeout(this.cardTimer);
        this.cardTimer = window.setTimeout(
          () => {
            if (this.current === run) this.showCards(run, cards);
          },
          gift > 0 ? LUCKY_GIFT_CARD_DELAY_MS : 0,
        );
      },
      Math.max(0, wait),
    );
  }

  /** "Lucky gift!" with its coins, which fly to the counter (GAME_DESIGN §15.5). */
  private showGift(coins: number): void {
    const { banners, game, feedback, hud } = this.parts;
    const y = this.jarY(BANNER_JAR_OFFSET);
    banners.show('Lucky gift!', { coins, y });
    feedback.play('chime');
    const box = game.jarBox();
    if (!box || y === undefined) return;
    this.parts.coins.fly((box.left + box.right) / 2, y, LUCKY_GIFT_COIN_FLIGHTS, () => {
      hud.pulseCoins();
      feedback.play('coin');
    });
  }

  /** A point in the jar, `fraction` of the way from its top to its floor (CSS pixels). */
  private jarY(fraction: number): number | undefined {
    const box = this.parts.game.jarBox();
    return box ? box.top + fraction * (box.bottom - box.top) : undefined;
  }

  private showCards(run: RunController, cards: readonly IntroCardId[]): void {
    this.cards = [...cards];
    this.nextCard(run);
  }

  /** The next card, or, after the last, time goes on (unless the pause covers the game). */
  private nextCard(run: RunController): void {
    const id = this.cards.shift();
    this.shownCard = id ?? null;
    if (id) {
      this.parts.introCard.show(introCard(id, run.windDirection === -1));
      return;
    }
    this.holding = false;
    if (!this.parts.pause.visible && this.current === run) run.resume();
  }

  /** A card's Got it (or the back button): it is seen for good, and the next one shows. */
  closeIntroCard(): void {
    const { introCard: card, profile } = this.parts;
    if (!card.visible || !this.current) return;
    card.hide();
    if (this.shownCard) profile.markHintSeen(this.shownCard);
    this.nextCard(this.current);
  }

  /** Forgets the cards and the gift waiting (a new run, game over, the menu). */
  private clearStageOpening(): void {
    window.clearTimeout(this.giftTimer);
    window.clearTimeout(this.cardTimer);
    this.cards = [];
    this.shownCard = null;
    this.holding = false;
    this.pendingGift = 0;
    this.parts.introCard.hide();
  }

  /** The held pick goes to the run once the doors are open and the run isn't paused. */
  private releasePick(run: RunController): void {
    const id = this.heldPick;
    if (id === null || this.current !== run) return;
    if (run.state !== 'choosing' || !this.parts.doors.isOpen) return;
    this.heldPick = null;
    run.choose(id);
  }

  /** The magnet's Take button: it takes the selected ball (GAME_DESIGN §15.2). */
  take(): void {
    this.parts.game.confirmTake();
  }

  /** Writes everything pending, the run in progress too (backgrounding, page hide). */
  save(): boolean {
    const ok = this.parts.profile.flush();
    this.saveRun();
    return ok;
  }

  /**
   * The profile was just written: the run is saved with it, so the wallet and the run's coins
   * agree after a crash. The profile may write in the middle of a tick (a payout), so the run is
   * saved once the tick is over.
   */
  profileWritten(): void {
    if (this.runSavePending) return;
    this.runSavePending = true;
    queueMicrotask(() => {
      this.runSavePending = false;
      this.saveRun();
    });
  }

  /** Starts a new run (PLAY, Play Again). */
  startRun(): void {
    this.reset();
    this.scenario = null;
    this.parts.pause.setRestartVisible(false);
    const events = new EventBus<GameEvents>();
    this.recordsBefore = this.parts.profile.records;
    const run = startProfileRun(this.parts.profile, {
      seed: this.parts.seed ?? freshSeed(),
      events,
      gravityScale: this.parts.gravityScale ?? 1,
    });
    this.play(run, events);
    this.saveRun();
  }

  /**
   * Plays a scene (GAME_DESIGN §2.6): its jar set up and settled, at its stage. The run is a
   * sandbox: no wallet, records, stats or saved run, so it changes nothing in the player's profile.
   */
  startScenario(def: ScenarioDef): void {
    this.reset();
    this.scenario = def;
    this.parts.pause.setRestartVisible(true);
    const events = new EventBus<GameEvents>();
    this.recordsBefore = this.parts.profile.records;
    const run = startScenarioRun(def, { events, gravityScale: this.parts.gravityScale ?? 1 });
    this.play(run, events);
  }

  /** Game Over's Play Again and the pause's Restart scene: the same scene again, or a new run. */
  playAgain(): void {
    if (this.scenario) this.startScenario(this.scenario);
    else this.startRun();
  }

  /**
   * Continues the run the app was closed in (GAME_DESIGN §11), paused where it stopped, with a
   * waiting pick under the pause. Returns false (and forgets it) when this version can't.
   */
  continueRun(saved: RunSave): boolean {
    this.reset();
    this.scenario = null;
    this.parts.pause.setRestartVisible(false);
    const events = new EventBus<GameEvents>();
    let run: RunController;
    try {
      run = resumeProfileRun(this.parts.profile, saved.run, {
        events,
        gravityScale: this.parts.gravityScale ?? 1,
      });
    } catch (error) {
      console.warn('The saved run could not be restored.', error);
      this.parts.runSave.clear();
      return false;
    }
    this.recordsBefore = saved.recordsBefore;
    this.play(run, events);
    const offer = run.pickOffer;
    if (offer) {
      this.parts.doors.closeNow();
      this.parts.game.setCovered(true);
      this.showPick(run, offer.kind, offer.options);
    } else if (!run.expansion && run.stageDrops === 0) {
      // Saved as the stage opened: its cards come back, under the pause.
      const cards = this.dueCards(run);
      if (cards.length > 0) {
        this.holding = true;
        this.showCards(run, cards);
      }
    }
    this.parts.banners.setPaused(true);
    this.parts.scenery.setPaused(true);
    this.parts.pause.show();
    return true;
  }

  /** Clears what the last run left on screen. */
  private reset(): void {
    const { hint, banners, coins, pause, gameOver, picks, doors } = this.parts;
    this.heldPick = null;
    this.clearStageOpening();
    this.clearedAt = 0;
    window.clearTimeout(this.doorsTimer);
    doors.reset();
    this.parts.game.setCovered(false);
    pause.hide();
    gameOver.hide();
    picks.hide();
    hint.hide();
    banners.clear();
    coins.clear();
    // A run quit from its pause never resumed: its clouds and petals would stay frozen.
    this.parts.scenery.setPaused(false);
    window.clearTimeout(this.hintTimer);
    window.clearTimeout(this.ruleHintTimer);
    this.ruleHint = null;
  }

  private showPick(run: RunController, kind: PickKind, options: readonly PickId[]): void {
    this.parts.banners.combo(0);
    const levels = run.pickLevels;
    this.parts.picks.show(
      kind,
      options.map((id) => pickCard(id, levels, run.stats.bigCatchTilt, run.windDirection)),
    );
  }

  /** Shows `run` and wires its events to the screen. */
  private play(run: RunController, events: EventBus<GameEvents>): void {
    const { game, hud, hint, banners, profile } = this.parts;
    this.current = run;
    connectRunFeedback(events, this.parts.feedback);

    const showPreview = (): void => hud.setNext(run.next);
    hud.setScore(run.score);
    hud.setCoins(run.coins);
    hud.setStage(run.stage, run.stageBestSize);
    // A run starting (or coming back) picks the garden's time of day anew (GAME_DESIGN §7.3).
    this.parts.scenery.setJar(stageJar(run.stage), false, true);
    this.parts.scenery.setWind(run.pickLevels.wind, run.windDirection);
    showPreview();

    events.on('scoreChanged', (e) => hud.setScore(e.score));
    // The menu catches up with the wallet when the run ends (it is hidden until then).
    events.on('runCoinsChanged', (e) => hud.setCoins(e.coins));
    events.on('catDropped', showPreview);
    events.on('stageBestChanged', (e) => hud.reachSize(e.size));
    // Copycat (GAME_DESIGN §15.13): NEXT took the size of the latest merge.
    events.on('nextChanged', () => {
      showPreview();
      hud.popNext();
    });

    // Banners sit in the empty top of the jar (GAME_DESIGN §2.3).
    const jarY = (fraction: number): number | undefined => this.jarY(fraction);
    const bannerY = (): number | undefined => jarY(BANNER_JAR_OFFSET);

    // Combo (GAME_DESIGN §5): "Combo ×N" from N = 2, with the Combo Charm coin bonus when it has
    // one (the score bonus is not shown, v0.42.4).
    events.on('comboChanged', (e) => {
      if (e.combo < COMBO_BANNER_MIN) {
        banners.combo(0);
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

    // Stage clears and expansions (GAME_DESIGN §7, §7.1): "Stage clear!" at every clear; it slides
    // up off the screen as the doors come.
    events.on('stageCleared', () => {
      banners.combo(0);
      banners.show('Stage clear!', {
        y: bannerY(),
        durationMs: STAGE_CLEAR_BANNER_MS + STAGE_CLEAR_EXIT_MS,
        exit: 'up',
      });
      this.clearedAt = performance.now();
    });
    // Every JAR_GROWTH_STAGES stages the jar grows right after "Stage clear!", before the doors:
    // "The shrine grows!" and the next garden (v0.33.2, the owner's call). It slides up as the
    // doors come for the picks.
    events.on('expansionStarted', (e) => {
      // Every jar pays more: its number times the coins (GAME_DESIGN §4).
      banners.show('The shrine grows!', {
        detail: `Coins ×${jarCoinMultiplier(e.to)}`,
        y: bannerY(),
        durationMs: SHRINE_GROWS_BANNER_MS,
        exit: 'up',
      });
      this.parts.scenery.setJar(stageJar(e.to), true);
    });
    // The new stage's cats in NEXT; no banner (v0.29.5, the owner's call).
    // The stage words move on as the new stage starts: when the jar grows, before its picks.
    events.on('expansionRevealed', () => {
      showPreview();
      hud.setStage(run.stage, run.stageBestSize);
    });
    // The wind's petals (GAME_DESIGN §15.8) show its level and direction.
    events.on('windChanged', (e) => this.parts.scenery.setWind(e.level, e.direction));
    // A blessing pick with nothing open paid a Lucky gift (GAME_DESIGN §15.5): it shows as the next
    // stage opens (at once from the debug panel's picks, which open no stage).
    events.on('luckyGift', (e) => {
      if (run.expansion) this.pendingGift += e.coins;
      else this.showGift(e.coins);
    });
    events.on('expansionFinished', () => {
      showPreview();
      hud.setStage(run.stage, run.stageBestSize);
      // The stage opens: a gift, and the cards that bring a hazard or a rule in. A debug jump
      // skips them, as it skips the picks.
      const cards = run.debugJumping ? [] : this.dueCards(run);
      const gift = this.pendingGift;
      this.pendingGift = 0;
      this.openStage(run, cards, gift);
      // A rule picked at this clear: what it does, once, as the stage starts (its card instead,
      // the first time).
      const ruleHint = cards.some((id) => !isHazardCard(id)) ? null : this.ruleHint;
      this.ruleHint = null;
      if (ruleHint) {
        hint.show(ruleHint);
        window.clearTimeout(this.ruleHintTimer);
        this.ruleHintTimer = window.setTimeout(() => {
          if (this.current === run) hint.hide();
        }, RULE_HINT_MS);
      }
      // A run restored in the middle of a zoom gets its new garden here.
      this.parts.scenery.setJar(stageJar(run.stage), false);
    });

    // A stage clear's picks (GAME_DESIGN §7.1, §15.5): the doors shut, then a trial and a
    // blessing; the doors open again onto the next stage (choosePick). When the jar grows, the
    // picks come after the zoom.
    const { doors } = this.parts;
    events.on('pickOffered', () => {
      const shut = (): void =>
        doors.close(() => {
          const offer = run.pickOffer;
          if (this.current !== run || !offer) return;
          // The doors hide the jar: it needn't be drawn until they open.
          this.parts.game.setCovered(true);
          this.showPick(run, offer.kind, offer.options);
        });
      // The doors set off as the banner slides away: they come in from off the screen, slowly at
      // first, so the banner is gone before they show.
      const wait = this.clearedAt + STAGE_CLEAR_BANNER_MS - performance.now();
      this.clearedAt = 0;
      window.clearTimeout(this.doorsTimer);
      if (wait > 0) this.doorsTimer = window.setTimeout(shut, wait);
      else shut();
    });
    events.on('pickChosen', (e) => {
      this.ruleHint = RULE_HINTS[e.id] ?? this.ruleHint;
      this.parts.picks.hide();
      // Picks made some other way (the debug tools) open the doors as the run moves on.
      queueMicrotask(() => {
        if (this.current === run && run.state !== 'choosing' && run.state !== 'paused') {
          this.parts.game.setCovered(false);
          doors.open();
        }
      });
    });
    // Time held for a stage's cards leaves the banners and the garden moving.
    events.on('paused', () => {
      if (this.holding) return;
      banners.setPaused(true);
      this.parts.scenery.setPaused(true);
    });
    events.on('resumed', () => {
      banners.setPaused(false);
      this.parts.scenery.setPaused(false);
      this.releasePick(run);
    });
    events.on('gameOver', (e) => this.onGameOver(e));

    // A scene shows no first-run hints: its clips shouldn't have them.
    this.hintTimer = 0;
    if (this.scenario) {
      game.show(run);
      return;
    }

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
    // The first magnet (GAME_DESIGN §15.2): how to use it, until it has taken a ball.
    events.on('dropReady', (e) => {
      if (e.kind === 'magnet' && !profile.hintSeen('magnet')) hint.show('Tap a cat, then Take');
    });
    events.on('ballTaken', () => {
      if (profile.hintSeen('magnet')) return;
      profile.markHintSeen('magnet');
      hint.hide();
    });
    // The first curse of a profile (GAME_DESIGN §15.12): what to do about it, for a few seconds.
    events.on('curseBegan', () => {
      if (profile.hintSeen('curse')) return;
      profile.markHintSeen('curse');
      hint.show('Cursed! Merge this cat before it turns to stone');
      window.clearTimeout(this.ruleHintTimer);
      this.ruleHintTimer = window.setTimeout(() => {
        if (this.current === run) hint.hide();
      }, RULE_HINT_MS);
    });

    game.show(run);
  }

  /** Saves the run in progress, or forgets it once it is over. A scene is never saved. */
  private saveRun(): void {
    const run = this.current;
    if (!run || this.scenario) return;
    const snapshot = run.snapshot();
    if (snapshot) this.parts.runSave.save({ run: snapshot, recordsBefore: this.recordsBefore });
    else this.parts.runSave.clear();
  }

  pauseRun(): void {
    const run = this.current;
    if (!run || this.parts.gameOver.visible) return;
    run.pause();
    if (run.state === 'paused') this.parts.pause.show();
  }

  resumeRun(): void {
    this.parts.pause.hide();
    // Time held for a stage's cards goes on when the last one closes.
    if (this.holding) return;
    this.current?.resume();
  }

  /** Leaves the game for the menu: the run ends (its coins are already banked). */
  endRun(): void {
    window.clearTimeout(this.hintTimer);
    this.parts.pause.hide();
    this.parts.gameOver.hide();
    this.parts.picks.hide();
    this.clearStageOpening();
    this.heldPick = null;
    this.clearedAt = 0;
    window.clearTimeout(this.doorsTimer);
    this.parts.doors.reset();
    this.parts.game.setCovered(false);
    this.parts.hint.hide();
    this.parts.banners.clear();
    this.parts.coins.clear();
    this.parts.game.sleep();
    this.current = null;
    this.scenario = null;
    // Quitting ends the run: it doesn't come back on the next launch.
    this.parts.runSave.clear();
    this.save();
    this.parts.onProfileChange();
  }

  /** Back in the game: game → pause; pause or game over → menu; a stage's card closes. */
  onBack(): GameBackResult {
    if (this.parts.pause.visible || this.parts.gameOver.visible || !this.current) return 'menu';
    if (this.parts.introCard.visible) {
      this.closeIntroCard();
      return 'stay';
    }
    this.pauseRun();
    return 'stay';
  }

  /** Backgrounding or a sideways phone pauses a run in progress (a pick waits under the pause). */
  autoPause(): void {
    const state = this.current?.state;
    if (state === 'playing' || state === 'expanding' || state === 'choosing') this.pauseRun();
    else if (this.holding && !this.parts.gameOver.visible) this.parts.pause.show();
  }

  private onGameOver(e: GameEvents['gameOver']): void {
    window.clearTimeout(this.hintTimer);
    this.clearStageOpening();
    this.parts.hint.hide();
    this.parts.banners.clear();
    this.parts.pause.hide();
    this.parts.picks.hide();
    this.heldPick = null;
    this.clearedAt = 0;
    window.clearTimeout(this.doorsTimer);
    this.parts.doors.reset();
    this.parts.game.setCovered(false);
    this.parts.runSave.clear();
    // A scene's numbers are made up: they never set a record.
    const records = this.scenario ? NO_RECORDS : newRecords(this.recordsBefore, e);
    this.parts.gameOver.show({
      score: e.score,
      bestScore: this.parts.profile.records.bestScore,
      stage: e.stage,
      coins: e.coins,
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
