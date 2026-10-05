import './ui/styles/index.css';
import { parseUrlFlags } from './core/urlFlags';
import { installDebugHooks } from './debug';
import { createGame } from './game';
import {
  BackStack,
  detectInstallContext,
  InstallPrompt,
  loadFonts,
  readInstallEnvironment,
  registerServiceWorker,
  setupViewport,
  UpdateGate,
  watchLifecycle,
  watchPhoneLandscape,
} from './platform';
import { GameSession } from './session';
import { byId } from './ui/dom';
import { createGameOverOverlay } from './ui/overlays/gameOverOverlay';
import { createPauseOverlay } from './ui/overlays/pauseOverlay';
import { createRotateOverlay } from './ui/overlays/rotateOverlay';
import { ScreenManager } from './ui/screenManager';
import { createGameScreen } from './ui/screens/gameScreen';
import { createMenuScreen } from './ui/screens/menuScreen';
import type { InstallHint } from './ui/screens/menuScreen';
import type { InstallContext } from './platform';

/** Boot order (TECH_SPEC §3): fonts → save → UI → Phaser → service worker. */
async function boot(): Promise<void> {
  setupViewport();
  const flags = parseUrlFlags(window.location.search);

  await loadFonts();

  // Save: loaded here from M7. Until then the session keeps settings and coins in memory.

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

  const menu = createMenuScreen(byId('menu-screen'), {
    onPlay: () => {
      screens?.showGame();
      session.startRun();
    },
    onUpgrades: () => undefined, // The shop panel arrives in M8.
    onToggleSound: () => toggleSound(),
    onApplyUpdate: () => void gate.apply(),
    onInstall: () => void installPrompt.prompt(),
  });

  menu.setUpgradesAvailable(false);
  menu.setInstallHint(installHintFor(installContext, installPrompt.available));

  const gameScreen = createGameScreen(byId('game-screen'), {
    onPause: () => session.pauseRun(),
  });
  const overlays = byId('overlays');
  const pause = createPauseOverlay(overlays, {
    onResume: () => session.resumeRun(),
    onToggleSound: () => toggleSound(),
    onToggleHaptics: () => {
      session.settings.haptics = !session.settings.haptics;
      pause.setHapticsOn(session.settings.haptics);
    },
    onQuit: () => screens?.showMenu(),
  });
  const gameOver = createGameOverOverlay(overlays, {
    onPlayAgain: () => session.startRun(),
    onMenu: () => screens?.showMenu(),
  });

  // Phaser renders into the play area; its loop sleeps while the menu is up.
  const game = createGame(gameScreen.playArea);
  const session = new GameSession({
    game,
    hud: gameScreen.hud,
    hint: gameScreen.hint,
    banners: gameScreen.banners,
    pause,
    gameOver,
    seed: flags.seed,
    onWalletChange: (coins) => menu.setCoins(coins),
  });

  const toggleSound = (): void => {
    session.settings.sound = !session.settings.sound;
    menu.setSoundOn(session.settings.sound);
    pause.setSoundOn(session.settings.sound);
  };
  menu.setSoundOn(session.settings.sound);
  pause.setSoundOn(session.settings.sound);
  pause.setHapticsOn(session.settings.haptics);

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
      // From M7: save. From M9: suspend audio.
    },
    onVisible: () => {
      // From M9: resume audio.
    },
  });

  if (flags.debug) {
    installDebugHooks({
      flags,
      session,
      game,
      screen: () => screens?.screen ?? 'menu',
      simulateUpdateReady: () => gate.markReady(),
    });
  }

  const sw = registerServiceWorker(gate);
}

function installHintFor(context: InstallContext, promptAvailable: boolean): InstallHint {
  if (context === 'ios-browser') return 'ios-share';
  if (context === 'browser' && promptAvailable) return 'install-button';
  return 'none';
}

void boot();
