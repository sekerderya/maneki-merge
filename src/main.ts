import './ui/styles/index.css';
import { AudioEngine } from './audio';
import { Profile } from './core/profile';
import { anyAffordable } from './core/upgrades';
import type { Scheduler } from './core/profile';
import { SaveStore } from './core/save';
import { parseUrlFlags } from './core/urlFlags';
import { installDebugHooks } from './debug';
import { createGame, loadArt } from './game';
import type { SceneSkin } from './game/GameScene';
import {
  BackStack,
  detectInstallContext,
  Haptics,
  InstallPrompt,
  loadFonts,
  openStorage,
  readInstallEnvironment,
  registerServiceWorker,
  requestPersistentStorage,
  setReduceMotion,
  setupViewport,
  UpdateGate,
  watchLifecycle,
  watchPhoneLandscape,
} from './platform';
import { GameSession } from './session';
import { setIconSkin } from './ui/catIcon';
import { byId } from './ui/dom';
import { createGameOverOverlay } from './ui/overlays/gameOverOverlay';
import { createSettingsPanel } from './ui/panels/settingsPanel';
import { createShopPanel } from './ui/panels/shopPanel';
import { createPauseOverlay } from './ui/overlays/pauseOverlay';
import { createRotateOverlay } from './ui/overlays/rotateOverlay';
import { ScreenManager } from './ui/screenManager';
import { createGameScreen } from './ui/screens/gameScreen';
import { createMenuScreen } from './ui/screens/menuScreen';
import type { InstallHint } from './ui/screens/menuScreen';
import type { InstallContext } from './platform';

/** Boot order (TECH_SPEC §3): fonts and cat art → save → UI → Phaser → service worker. */
async function boot(): Promise<void> {
  setupViewport();
  const flags = parseUrlFlags(window.location.search);
  let skin: SceneSkin = flags.skin ?? 'art';

  // The raster art loads with the fonts; if it can't, the game falls back to the vector art.
  const [, art] = await Promise.all([
    loadFonts(),
    skin === 'art' ? loadArt(import.meta.env.BASE_URL).catch(() => null) : null,
  ]);
  if (skin === 'art' && !art) skin = 'vector';
  setIconSkin(skin);

  // Save (TECH_SPEC §8): load it once; the profile writes it back, throttled.
  const storage = openStorage();
  const store = new SaveStore(storage.adapter);
  const loaded = store.load();
  if (loaded.status === 'corrupt' || loaded.status === 'repaired' || loaded.status === 'future') {
    console.warn(`Save ${loaded.status}; a copy was kept.`, loaded.issues);
  }
  const profile = new Profile(store, loaded.data, { scheduler: windowScheduler });
  if (storage.persistent) void requestPersistentStorage();

  // Sound and haptics (GAME_DESIGN §12): audio unlocks on the first tap (iOS needs a gesture).
  const audio = new AudioEngine();
  audio.setEnabled(profile.settings.sound);
  audio.listen();
  const haptics = Haptics.forNavigator();
  haptics.setEnabled(profile.settings.haptics);
  setReduceMotion(profile.settings.reduceMotion);
  // Every button clicks, except the ones that play their own sound (data-sfx="none").
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (target && !target.closest('[data-sfx="none"]')) audio.play('click');
  });

  // UI
  const back = new BackStack(window.history, window);
  let screens: ScreenManager | null = null;

  const gate = new UpdateGate({
    activate: () => sw.activate(),
    reload: () => window.location.reload(),
    onReadyChange: (ready) => menu.setUpdateReady(ready),
  });

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
    },
    skin === 'art',
  );

  menu.setInstallHint(installHintFor(installContext, installPrompt.available));

  // Shop panel (GAME_DESIGN §2.2) over the menu, with its own back layer.
  let shopLayer: number | null = null;
  const shop = createShopPanel(byId('overlays'), {
    onBuy: (id) => {
      if (!profile.buy(id).ok) return;
      showProfile();
      shop.purchased(id);
      audio.play('purchase');
    },
    onClose: () => closeShop(),
  });
  const openShop = (): void => {
    if (shop.visible) return;
    showProfile();
    shop.show();
    shopLayer = back.push(() => {
      shopLayer = null;
      shop.hide();
    });
  };
  const closeShop = (): void => {
    if (shopLayer !== null) back.release(shopLayer);
    shopLayer = null;
    shop.hide();
  };

  // Settings panel (GAME_DESIGN §2.4) over the menu, with its own back layer.
  let settingsLayer: number | null = null;
  const settingsPanel = createSettingsPanel(byId('overlays'), {
    onToggle: (key) => {
      session.setSetting(key, !session.settings[key]);
      if (key === 'haptics') haptics.play('tick');
    },
    onReplayTips: () => session.replayHints(),
    onClose: () => closeSettings(),
  });
  settingsPanel.setHapticsSupported(haptics.supported);
  const openSettings = (): void => {
    if (settingsPanel.visible) return;
    showProfile();
    settingsPanel.show();
    settingsLayer = back.push(() => {
      settingsLayer = null;
      settingsPanel.hide();
    });
  };
  const closeSettings = (): void => {
    if (settingsLayer !== null) back.release(settingsLayer);
    settingsLayer = null;
    settingsPanel.hide();
  };

  const gameScreen = createGameScreen(
    byId('game-screen'),
    { onPause: () => session.pauseRun() },
    skin === 'art',
  );
  const overlays = byId('overlays');
  const pause = createPauseOverlay(overlays, {
    onResume: () => session.resumeRun(),
    onToggleSound: () => toggleSound(),
    onToggleHaptics: () => {
      session.setSetting('haptics', !session.settings.haptics);
      haptics.play('tick');
    },
    onQuit: () => screens?.showMenu(),
  });
  const gameOver = createGameOverOverlay(overlays, {
    onPlayAgain: () => session.startRun(),
    onMenu: () => screens?.showMenu(),
  });

  // Phaser renders into the play area under the HUD; its loop sleeps while the menu is up. The
  // jar fits below the HUD, and the garden behind the canvas follows the jar.
  const game = createGame(gameScreen.playArea, skin, () => gameScreen.hudBottom(), art);
  gameScreen.onHudResize(() => game.refit());
  game.onJarBox((box, growing) => gameScreen.setJarBox(box, growing));
  // The menu and the pause overlay show what the profile holds.
  const showProfile = (): void => {
    const { bestScore, bestStage } = profile.records;
    const settings = profile.settings;
    menu.setCoins(profile.coins);
    menu.setRecords(bestScore, bestStage);
    menu.setUpgradesAffordable(anyAffordable(profile.upgrades, profile.coins));
    shop.update(profile.upgrades, profile.coins);
    audio.setEnabled(settings.sound);
    haptics.setEnabled(settings.haptics);
    setReduceMotion(settings.reduceMotion);
    settingsPanel.setValues(settings);
    pause.setSoundOn(settings.sound);
    pause.setHapticsOn(settings.haptics);
  };
  const session = new GameSession({
    profile,
    game,
    hud: gameScreen.hud,
    hint: gameScreen.hint,
    banners: gameScreen.banners,
    coins: gameScreen.coins,
    pause,
    gameOver,
    feedback: {
      play: (name, value) => audio.play(name, value),
      vibrate: (name) => haptics.play(name),
    },
    seed: flags.seed,
    onProfileChange: showProfile,
  });
  showProfile();

  const toggleSound = (): void => session.setSetting('sound', !session.settings.sound);

  screens = new ScreenManager(
    { menu: byId('menu-screen'), game: byId('game-screen') },
    back,
    (screen) => {
      gate.setMenuActive(screen === 'menu');
      if (screen === 'menu') session.endRun();
    },
    () => session.onBack(),
  );

  const setRotateOverlay = createRotateOverlay(byId('overlays'));
  watchPhoneLandscape((landscape) => {
    setRotateOverlay(landscape);
    if (landscape) session.autoPause();
  });

  watchLifecycle({
    onHidden: () => {
      session.autoPause();
      session.save();
      audio.suspend();
    },
    onVisible: () => audio.resume(),
  });

  if (flags.debug) {
    installDebugHooks({
      flags,
      session,
      game,
      audio,
      screen: () => screens?.screen ?? 'menu',
      simulateUpdateReady: () => gate.markReady(),
    });
  }

  const sw = registerServiceWorker(gate);
}

const windowScheduler: Scheduler = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (handle) => window.clearTimeout(handle),
};

function installHintFor(context: InstallContext, promptAvailable: boolean): InstallHint {
  if (context === 'ios-browser') return 'ios-share';
  if (context === 'browser' && promptAvailable) return 'install-button';
  return 'none';
}

void boot();
