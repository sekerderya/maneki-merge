import './ui/styles/index.css';
import { AudioEngine } from './audio';
import { Profile } from './core/profile';
import { anyAffordable } from './core/upgrades';
import type { ClipId } from './config/clips';
import type { IntroCard } from './config/introCards';
import type { Scheduler } from './core/profile';
import { RunSaveStore } from './core/runSave';
import { ScenesSwitch } from './core/scenesSwitch';
import { SaveStore } from './core/save';
import type { SaveData } from './core/save';
import { timeOfDayAt } from './core/timeOfDay';
import { bootFlags } from './core/urlFlags';
import type { UrlFlags } from './core/urlFlags';
import { installDebugHooks } from './debug';
import { createGame, loadArt, preloadImages } from './game';
import type { SceneSkin } from './game/GameScene';
import {
  AnalyticsHub,
  BackStack,
  browserNetwork,
  controlledByServiceWorker,
  CrashlyticsSink,
  detectInstallContext,
  FakeAds,
  FakeAnalyticsSink,
  FirebaseAnalyticsSink,
  GameAnalyticsSink,
  Haptics,
  InstallPrompt,
  loadFirebaseWeb,
  loadFonts,
  loadGameAnalytics,
  NoAds,
  openStorage,
  readInstallEnvironment,
  readStoredFlags,
  registerServiceWorker,
  requestPersistentStorage,
  setReduceMotion,
  setupViewport,
  storeFlag,
  UpdateGate,
  watchDisplayCutout,
  watchLifecycle,
  watchPhoneLandscape,
} from './platform';
import { GameSession } from './session';
import { TESTER_RESET_BEST_STAGE, TESTER_RESET_COINS } from './config/app';
import { CUTOUT_RECHECK_MS, UPDATE_LAUNCH_APPLY_MS } from './config/platform';
import { otherTimesFiles, SCENE_SPRITE_DIR } from './config/sceneSprites';
import type { TimeOfDay } from './config/timeOfDay';
import { setIconSkin } from './ui/catIcon';
import { byId } from './ui/dom';
import { createGameOverOverlay } from './ui/overlays/gameOverOverlay';
import { createScenesPanel } from './ui/panels/scenesPanel';
import { createSettingsPanel } from './ui/panels/settingsPanel';
import { createShopPanel } from './ui/panels/shopPanel';
import { createPauseOverlay } from './ui/overlays/pauseOverlay';
import { createPickOverlay } from './ui/overlays/pickOverlay';
import { createClipPopup } from './ui/overlays/clipPopup';
import { createClipButtons } from './ui/clipButtons';
import { createDoors } from './ui/fx/doors';
import { createRotateOverlay } from './ui/overlays/rotateOverlay';
import { ScreenManager } from './ui/screenManager';
import { loadingScreen } from './ui/loadingScreen';
import { createGameScreen } from './ui/screens/gameScreen';
import { createMenuScreen } from './ui/screens/menuScreen';
import type { InstallHint } from './ui/screens/menuScreen';
import type {
  AdService,
  AnalyticsScreen,
  AnalyticsSink,
  InstallContext,
  Network,
  ServiceWorkerControls,
} from './platform';
import type { NativeApp } from './platform/native';
import { AD_TESTING_DEVICES, AD_UNITS, TEST_AD_UNITS } from './config/ads';
import { showFakeAd } from './ui/overlays/fakeAd';
import { createAdOfferOverlay } from './ui/overlays/adOfferOverlay';
import { createStatsConsentOverlay } from './ui/overlays/statsConsentOverlay';

/**
 * Boot order (TECH_SPEC §3): the loading screen (fonts, every image, a new version's install; in the
 * Android app the ad consent) → save → UI → Phaser → service worker (on a first visit) → the
 * loading screen fades out → the play statistics card, once (TECH_SPEC §17).
 */
async function boot(): Promise<void> {
  setupViewport();
  const recheckCutout = watchDisplayCutout();
  const loading = loadingScreen();
  // The Android app's native side (TECH_SPEC §16); the web build carries none of it.
  const native = __NATIVE_APP__ ? await startNative() : null;
  const flags = bootFlags(window.location.search, readStoredFlags(), native?.devApp ?? false);
  let skin: SceneSkin = flags.skin ?? 'art';
  // Play statistics (TECH_SPEC §17): nothing is sent before the player's yes; until they answer,
  // a few events (an error at boot, the first screen) wait.
  const { analytics, fakeAnalytics } = createAnalytics(flags, native);
  window.addEventListener('error', (event) => analytics.error(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => analytics.error(event.reason));
  const trackScreen = (screen: AnalyticsScreen): void =>
    analytics.track({ type: 'screen', screen });

  // Updates (TECH_SPEC §9) go through the gate. On a launch after the first visit the service
  // worker registers now, so a new version installs and reloads the app on the loading screen; a
  // first visit registers it last, so its precaching doesn't slow the loading down. The Android
  // app has no service worker: its files are on the phone and Play updates it.
  let onUpdateReady = (_ready: boolean): void => {};
  const gate = new UpdateGate({
    activate: () => sw?.activate(),
    reload: () => window.location.reload(),
    schedule: (run, delayMs) => window.setTimeout(run, delayMs),
    onReadyChange: (ready) => onUpdateReady(ready),
  });
  let sw: ServiceWorkerControls | null =
    !__NATIVE_APP__ && controlledByServiceWorker() ? registerServiceWorker(gate) : null;
  const update = sw?.launchUpdate(() => loading.setStatus('updating')) ?? false;

  // Rewarded ads (TECH_SPEC §16): AdMob in the Android app, a fake one with `?ads=fake`, none on
  // the web. The consent check starts now, beside the loading; its form (where needed) shows once
  // the loading is done, before the menu and any saved run.
  const network = native?.network ?? browserNetwork();
  const ads = createAds(flags, network, native);
  let launched = (): void => {};
  const adsStarted = ads.start(new Promise<void>((resolve) => (launched = resolve)));

  // Every image loads with the fonts and the update check; if the cats' art can't, the game falls
  // back to the vector art.
  const base = import.meta.env.BASE_URL;
  // The gardens at the clock's time of day load now (GAME_DESIGN §7.3); the other times' wait.
  const clockTime = (): TimeOfDay => flags.time ?? timeOfDayAt(new Date());
  const otherTimes = new Set([...otherTimesFiles(clockTime())].map((f) => SCENE_SPRITE_DIR + f));
  const images =
    skin === 'art' ? preloadImages(base, (share) => loading.setProgress(share), otherTimes) : null;
  const [, art, updateWaiting] = await Promise.all([
    loadFonts().then(() => loading.fontsReady()),
    skin === 'art' ? loadArt(base).catch(() => null) : null,
    update,
    images,
  ]);
  loading.setProgress(1);
  if (updateWaiting) {
    // The gate activates it and reloads; if that stalls, the game opens and the menu retries.
    loading.setStatus('updating');
    gate.markReady();
    await new Promise((resolve) => window.setTimeout(resolve, UPDATE_LAUNCH_APPLY_MS));
  }
  launched();
  await adsStarted.catch(() => undefined);
  if (skin === 'art' && !art) skin = 'vector';
  setIconSkin(skin);

  // Save (TECH_SPEC §8): load it once; the profile writes it back, throttled.
  const storage = openStorage();
  const store = new SaveStore(storage.adapter);
  const loaded = store.load();
  if (loaded.status === 'corrupt' || loaded.status === 'repaired' || loaded.status === 'future') {
    console.warn(`Save ${loaded.status}; a copy was kept.`, loaded.issues);
  }
  // The run in progress has its own key (GAME_DESIGN §11); it is saved with every profile write.
  const runStore = new RunSaveStore(storage.adapter);
  const savedRun = runStore.load();
  if (savedRun.status === 'dropped') console.warn('The saved run was dropped.', savedRun.reason);
  let onProfileWrite = (): void => {};
  const profileStore = {
    save: (data: SaveData): boolean => {
      const ok = store.save(data);
      onProfileWrite();
      return ok;
    },
  };
  const profile = new Profile(profileStore, loaded.data, { scheduler: windowScheduler });
  // The gardens' time of day (GAME_DESIGN §7.3): the clock's, unless the setting keeps the day.
  const pickTime = (): TimeOfDay => flags.time ?? (profile.settings.dayNight ? clockTime() : 'day');
  if (storage.persistent) void requestPersistentStorage();
  // The answer saved with the profile; a profile that hasn't answered gets the card after the loading.
  if (profile.settings.statisticsAsked) analytics.setConsent(profile.settings.statistics);
  // The menu's Scenes button (GAME_DESIGN §2.6): `?scenes=1` or the tester reset (7 taps on the version) turn it on.
  const scenesSwitch = new ScenesSwitch(storage.adapter);
  if (flags.scenes !== null) scenesSwitch.set(flags.scenes);

  // Sound and haptics (GAME_DESIGN §12): audio unlocks on the first tap (iOS needs a gesture).
  const audio = new AudioEngine();
  audio.setEnabled(profile.settings.sound);
  audio.listen();
  const haptics = Haptics.forNavigator();
  haptics.setEnabled(profile.settings.haptics);
  setReduceMotion(profile.settings.reduceMotion);
  // Every button clicks, except the ones that play their own sound (data-sfx="none").
  document.addEventListener('click', (event) => {
    const target =
      event.target instanceof Element ? event.target.closest('button, [role="button"]') : null;
    if (target && !target.closest('[data-sfx="none"]')) audio.play('click');
  });

  // UI
  const back = new BackStack(window.history, window);
  let screens: ScreenManager | null = null;

  // A waiting update installs itself only while the menu is up with no panel over it.
  const syncUpdateGate = (): void => {
    const onMenu = (screens?.screen ?? 'menu') === 'menu';
    gate.setMenuActive(
      onMenu && !shop.visible && !settingsPanel.visible && !scenes.visible && !statsCard.visible,
    );
  };

  const installContext = detectInstallContext(readInstallEnvironment());
  const installPrompt = new InstallPrompt((available) => {
    menu.setInstallHint(installHintFor(installContext, available));
  });

  const menu = createMenuScreen(
    byId('menu-screen'),
    {
      onPlay: () => {
        screens?.showGame();
        session.startRun();
      },
      onUpgrades: () => openShop(),
      onSettings: () => openSettings(),
      onApplyUpdate: () => void gate.apply(),
      onInstall: () => void installPrompt.prompt(),
      onScenes: () => openScenes(),
    },
    skin === 'art',
  );
  menu.setScenesVisible(scenesSwitch.on);
  menu.setTimeOfDay(pickTime());

  menu.setInstallHint(installHintFor(installContext, installPrompt.available));
  onUpdateReady = (ready) => menu.setUpdateReady(ready);
  menu.setUpdateReady(gate.isReady);

  // How-it-works clips (GAME_DESIGN §2.5): a button on the shop and pick cards opens a
  // popup over them, with its own back layer. Opening a clip takes its buttons' new dot away.
  const clipButtons = createClipButtons(
    (id) => profile.clipSeen(id),
    (id, name) => openClip(id, name),
    skin === 'art',
  );
  // Over the shop and the picks, under the pause (clips.css).
  const clipPopup = createClipPopup(
    byId('overlays'),
    {
      onOpen: (id) => {
        profile.markClipSeen(id);
        clipButtons.refresh();
      },
      onClose: () => closeClip(),
    },
    skin === 'art',
  );
  let clipLayer: number | null = null;
  const openClip = (id: ClipId, name: string): void => {
    if (clipPopup.visible) return;
    clipPopup.show(id, name);
    clipLayer = back.push(() => {
      clipLayer = null;
      clipPopup.hide();
    });
  };
  const closeClip = (): void => {
    if (!clipPopup.visible) return;
    if (clipLayer !== null) back.release(clipLayer);
    clipLayer = null;
    clipPopup.hide();
  };

  // Shop panel (GAME_DESIGN §2.2) over the menu, with its own back layer.
  let shopLayer: number | null = null;
  const shop = createShopPanel(
    byId('overlays'),
    {
      onBuy: (id) => {
        const bought = profile.buy(id);
        if (!bought.ok) return;
        analytics.track({
          type: 'coinsSpent',
          upgrade: id,
          level: bought.levels[id],
          amount: bought.price,
        });
        showProfile();
        shop.purchased(id);
        audio.play('purchase');
      },
      onClose: () => closeShop(),
    },
    skin === 'art',
    clipButtons.create,
  );
  const openShop = (): void => {
    if (shop.visible) return;
    showProfile();
    shop.show();
    trackScreen('shop');
    syncUpdateGate();
    shopLayer = back.push(() => {
      shopLayer = null;
      shop.hide();
      syncUpdateGate();
    });
  };
  const closeShop = (): void => {
    if (shopLayer !== null) back.release(shopLayer);
    shopLayer = null;
    shop.hide();
    syncUpdateGate();
  };

  // Settings panel (GAME_DESIGN §2.4) over the menu, with its own back layer.
  let settingsLayer: number | null = null;
  const settingsPanel = createSettingsPanel(
    byId('overlays'),
    {
      onToggle: (key) => {
        session.setSetting(key, !session.settings[key]);
        if (key === 'haptics') haptics.play('tick');
        if (key === 'dayNight') menu.setTimeOfDay(pickTime());
        if (key === 'statistics') answerStatistics(session.settings.statistics);
      },
      onReplayTips: () => {
        session.replayHints();
        clipButtons.refresh();
      },
      onTesterReset: () => {
        // The run ends first, so the page hide doesn't save it again (as the debug Reset save).
        session.endRun();
        session.profile.reset(TESTER_RESET_COINS, TESTER_RESET_BEST_STAGE);
        scenesSwitch.set(true);
        window.location.reload();
      },
      onAccountReset: () => {
        // A new player's save; the Scenes button stays as the device has it (it isn't in the save).
        session.endRun();
        session.profile.reset();
        window.location.reload();
      },
      onPrivacyOptions: () => void ads.showPrivacyOptions(),
      onClose: () => closeSettings(),
    },
    skin === 'art',
  );
  settingsPanel.setHapticsSupported(haptics.supported);
  settingsPanel.setStatisticsAvailable(analytics.available);
  settingsPanel.setPrivacyOptionsVisible(ads.privacyOptionsRequired);
  ads.onChange(() => settingsPanel.setPrivacyOptionsVisible(ads.privacyOptionsRequired));
  const openSettings = (): void => {
    if (settingsPanel.visible) return;
    showProfile();
    settingsPanel.show();
    trackScreen('settings');
    syncUpdateGate();
    settingsLayer = back.push(() => {
      settingsLayer = null;
      settingsPanel.hide();
      syncUpdateGate();
    });
  };
  const closeSettings = (): void => {
    if (settingsLayer !== null) back.release(settingsLayer);
    settingsLayer = null;
    settingsPanel.hide();
    syncUpdateGate();
  };

  // The Scenes panel (GAME_DESIGN §2.6) over the menu, with its own back layer: a tap on a scene
  // plays it.
  let scenesLayer: number | null = null;
  const scenes = createScenesPanel(
    byId('overlays'),
    {
      onStart: (scene) => {
        closeScenes();
        screens?.showGame();
        session.startScenario(scene);
      },
      onClose: () => closeScenes(),
    },
    skin === 'art',
  );
  const openScenes = (): void => {
    if (scenes.visible) return;
    scenes.show();
    syncUpdateGate();
    scenesLayer = back.push(() => {
      scenesLayer = null;
      scenes.hide();
      syncUpdateGate();
    });
  };
  const closeScenes = (): void => {
    if (scenesLayer !== null) back.release(scenesLayer);
    scenesLayer = null;
    scenes.hide();
    syncUpdateGate();
  };

  const gameScreen = createGameScreen(
    byId('game-screen'),
    {
      onPause: () => session.pauseRun(),
      onTake: () => session.take(),
      onBonus: () => void session.offerBonus(),
    },
    skin === 'art',
    pickTime,
  );
  const overlays = byId('overlays');
  // The stage doors shut over the game screen, under the picks and the pause overlay.
  const doors = createDoors(overlays, import.meta.env.BASE_URL);
  // A stage clear's picks sit under the pause overlay, so a pause can cover them.
  const picks = createPickOverlay(
    overlays,
    { onChoose: (id) => session.choosePick(id) },
    skin === 'art',
    clipButtons.create,
  );
  // The cards that bring a hazard or a rule in as a stage opens (GAME_DESIGN §15.5): a clip popup
  // with a button under it, over the picks and under the pause.
  const introPopup = createClipPopup(
    overlays,
    { onOpen: () => undefined, onClose: () => session.closeIntroCard() },
    skin === 'art',
    { button: 'Got it', testId: 'intro-card' },
  );
  const introCard = {
    get visible() {
      return introPopup.visible;
    },
    show: (card: IntroCard) => introPopup.show(card.clip, card.title, card.line),
    hide: () => introPopup.hide(),
  };
  // A rewarded ad's card (GAME_DESIGN §2.7): over the game and the cards, under the pause.
  const adOffer = createAdOfferOverlay(overlays, skin === 'art');
  // The play statistics card (GAME_DESIGN §2.8): over everything.
  const statsCard = createStatsConsentOverlay(overlays, skin === 'art');
  const pause = createPauseOverlay(
    overlays,
    {
      onResume: () => session.resumeRun(),
      onToggleSound: () => toggleSound(),
      onToggleHaptics: () => {
        session.setSetting('haptics', !session.settings.haptics);
        haptics.play('tick');
      },
      onRestart: () => session.playAgain(),
      onQuit: () => screens?.showMenu(),
    },
    skin === 'art',
  );
  const gameOver = createGameOverOverlay(
    overlays,
    {
      onPlayAgain: () => session.playAgain(),
      onMenu: () => screens?.showMenu(),
      onDoubleCoins: () => void session.doubleCoins(),
    },
    skin === 'art',
  );

  // Phaser renders into the play area under the HUD; its loop sleeps while the menu is up. The
  // jar fits below the HUD, and the garden behind the canvas follows the jar.
  const game = createGame(
    gameScreen.playArea,
    skin,
    () => gameScreen.hudBottom(),
    art,
    flags.resolution,
    flags.interpolate,
  );
  gameScreen.onHudResize(() => game.refit());
  game.onJarBox((box, growing) => gameScreen.setJarBox(box, growing));
  game.onTakePrompt((prompt) => gameScreen.setTakePrompt(prompt));
  // The menu and the pause overlay show what the profile holds.
  const showProfile = (): void => {
    const { bestScore, bestStage } = profile.records;
    const settings = profile.settings;
    menu.setCoins(profile.coins);
    menu.setRecords(bestScore, bestStage);
    menu.setUpgradesAffordable(anyAffordable(profile.upgrades, profile.coins, bestStage));
    shop.update(profile.upgrades, profile.coins, bestStage);
    audio.setEnabled(settings.sound);
    haptics.setEnabled(settings.haptics);
    setReduceMotion(settings.reduceMotion);
    settingsPanel.setValues(settings);
    pause.setSoundOn(settings.sound);
    pause.setHapticsOn(settings.haptics);
  };
  const session = new GameSession({
    profile,
    runSave: runStore,
    game,
    hud: gameScreen.hud,
    hint: gameScreen.hint,
    banners: gameScreen.banners,
    coins: gameScreen.coins,
    pause,
    gameOver,
    picks,
    doors,
    introCard,
    ads,
    adOffer,
    scenery: gameScreen,
    feedback: {
      play: (name, value) => audio.play(name, value),
      vibrate: (name) => haptics.play(name),
    },
    analytics,
    seed: flags.seed,
    gravityScale: flags.gravity,
    onProfileChange: showProfile,
  });
  onProfileWrite = () => session.profileWritten();
  showProfile();

  const toggleSound = (): void => session.setSetting('sound', !session.settings.sound);

  // The play statistics' answer (the card or Settings) is saved with the profile.
  const answerStatistics = (yes: boolean): void => {
    session.setSetting('statistics', yes);
    session.setSetting('statisticsAsked', true);
    analytics.setConsent(yes);
  };
  const askStatistics = async (): Promise<void> => {
    const layer = back.push(() => statsCard.decline());
    const yes = await statsCard.ask();
    back.release(layer);
    answerStatistics(yes);
    syncUpdateGate();
  };

  screens = new ScreenManager(
    { menu: byId('menu-screen'), game: byId('game-screen') },
    back,
    (screen) => {
      closeClip();
      trackScreen(screen);
      // End (and save) the run first: back on the menu, a waiting update reloads the app soon.
      if (screen === 'menu') {
        session.endRun();
        menu.setTimeOfDay(pickTime());
      }
      gate.setMenuActive(
        screen === 'menu' && !shop.visible && !settingsPanel.visible && !scenes.visible,
      );
    },
    () => session.onBack(),
  );

  // A run the app was closed in comes back paused where it stopped (GAME_DESIGN §11).
  if (savedRun.save) {
    screens.showGame();
    if (!session.continueRun(savedRun.save)) screens.showMenu();
  }

  const setRotateOverlay = createRotateOverlay(byId('overlays'));
  watchPhoneLandscape((landscape) => {
    setRotateOverlay(landscape);
    if (landscape) {
      closeClip();
      session.autoPause();
    }
  });

  watchLifecycle({
    onHidden: () => {
      // A full-screen ad covers the app (platform/ads.ts): the run is saved, but coming back from
      // the ad must not open the pause overlay.
      if (!ads.showing) {
        closeClip();
        session.autoPause();
      }
      session.save();
      audio.suspend();
      analytics.suspend();
    },
    onVisible: () => {
      audio.resume();
      analytics.resume();
      // Back after a while on the menu: its garden catches up with the clock.
      if (screens?.screen === 'menu') menu.setTimeOfDay(pickTime());
    },
  });

  if (!__NATIVE_APP__) sw ??= registerServiceWorker(gate);
  gate.finishLaunch();
  loading.hide();
  // The play statistics card, once per profile, in a build that has a service (TECH_SPEC §17).
  if (analytics.available && !profile.settings.statisticsAsked) void askStatistics();
  // Chrome may have kept the app out of the camera cutout while it launched (platform/displayCutout.ts).
  recheckCutout();
  window.setTimeout(recheckCutout, CUTOUT_RECHECK_MS);

  if (flags.debug) {
    installDebugHooks({
      flags,
      session,
      game,
      audio,
      screen: () => screens?.screen ?? 'menu',
      simulateUpdateReady: () => gate.markReady(),
      ads,
      analytics,
      fakeAnalytics,
      nativeApp: native !== null,
      testDeviceId: native?.testDeviceId ?? null,
      storeFlag: (key, value) => {
        storeFlag(key, value);
        window.location.reload();
      },
    });
  }
}

/**
 * The play statistics' services for this build (TECH_SPEC §17), from the keys it was built with:
 * GameAnalytics everywhere (its test game in debug, the dev app and the dev server), Firebase
 * Analytics and Crashlytics through the Android app's native SDKs, Firebase Analytics through its
 * JS SDK on the live web app. `?analytics=fake` keeps the events on the page instead.
 */
function createAnalytics(
  flags: UrlFlags,
  native: NativeApp | null,
): { analytics: AnalyticsHub; fakeAnalytics: FakeAnalyticsSink | null } {
  if (flags.analytics === 'fake') {
    const fake = new FakeAnalyticsSink();
    return { analytics: new AnalyticsHub([fake], 'fake'), fakeAnalytics: fake };
  }
  const keys = __ANALYTICS_KEYS__;
  const test = flags.debug || (native?.devApp ?? false) || import.meta.env.DEV;
  const sinks: AnalyticsSink[] = [];
  const gameAnalytics = test ? keys.gameAnalyticsTest : keys.gameAnalytics;
  if (gameAnalytics) {
    const build = `${__NATIVE_APP__ ? 'android' : 'web'} ${__APP_VERSION__}`;
    sinks.push(new GameAnalyticsSink(() => loadGameAnalytics(test), gameAnalytics, build));
  }
  if (native && keys.firebaseApp) {
    // The dev app reports to its own Firebase app (`….dev`), apart from the Play app.
    const { analytics, crashlytics } = native.firebase;
    sinks.push(
      new FirebaseAnalyticsSink(() => Promise.resolve(analytics)),
      new CrashlyticsSink(() => Promise.resolve(crashlytics)),
    );
  } else if (!__NATIVE_APP__ && !test && keys.firebaseWeb) {
    const config = keys.firebaseWeb;
    sinks.push(new FirebaseAnalyticsSink(() => loadFirebaseWeb(config, import.meta.env.BASE_URL)));
  }
  const mode = sinks.length === 0 ? 'none' : test ? 'test' : 'live';
  return { analytics: new AnalyticsHub(sinks, mode), fakeAnalytics: null };
}

const windowScheduler: Scheduler = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (handle) => window.clearTimeout(handle),
};

/**
 * The Android app's native side (TECH_SPEC §16), loaded only by its build. If it can't start, the
 * game still opens, without ads.
 */
async function startNative(): Promise<NativeApp | null> {
  try {
    return await (await import('./platform/native')).startNativeApp();
  } catch (error) {
    console.warn('The native side could not start.', error);
    return null;
  }
}

/** The ads this build shows (TECH_SPEC §16). */
function createAds(flags: UrlFlags, network: Network, native: NativeApp | null): AdService {
  const mode = flags.ads ?? (native ? 'admob' : null);
  if (mode === 'fake') {
    return new FakeAds(network, (placement) => showFakeAd(document.body, placement));
  }
  if (mode !== 'admob' || !native) return new NoAds(network);
  const device = native.testDeviceId;
  return native.createAds(
    {
      // The dev app never shows a real ad.
      units: native.devApp ? TEST_AD_UNITS : AD_UNITS,
      testingDevices: device ? [...AD_TESTING_DEVICES, device] : AD_TESTING_DEVICES,
      consentDebugEea: flags.consent === 'eea',
    },
    windowScheduler,
  );
}

function installHintFor(context: InstallContext, promptAvailable: boolean): InstallHint {
  if (context === 'ios-browser') return 'ios-share';
  if (context === 'browser' && promptAvailable) return 'install-button';
  return 'none';
}

void boot();
