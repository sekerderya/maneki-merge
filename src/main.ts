import './ui/styles/index.css';
import { parseUrlFlags } from './core/urlFlags';
import { installDebugHooks } from './debug';
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
import { byId } from './ui/dom';
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

  // Save: loaded here from M7. Until then settings live in memory.
  const settings = { sound: true };

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
    onPlay: () => screens?.showGame(),
    onUpgrades: () => undefined, // The shop panel arrives in M8.
    onToggleSound: () => {
      settings.sound = !settings.sound;
      menu.setSoundOn(settings.sound);
    },
    onApplyUpdate: () => void gate.apply(),
    onInstall: () => void installPrompt.prompt(),
  });
  menu.setSoundOn(settings.sound);
  menu.setUpgradesAvailable(false);
  menu.setInstallHint(installHintFor(installContext, installPrompt.available));

  createGameScreen(byId('game-screen'), { onBack: () => screens?.showMenu() });
  screens = new ScreenManager(
    { menu: byId('menu-screen'), game: byId('game-screen') },
    back,
    (screen) => gate.setMenuActive(screen === 'menu'),
  );

  const setRotateOverlay = createRotateOverlay(byId('overlays'));
  watchPhoneLandscape((landscape) => {
    setRotateOverlay(landscape);
    // From M5: pause the run while the phone is sideways.
  });

  watchLifecycle({
    onHidden: () => {
      // From M5: pause the run. From M7: save. From M9: suspend audio.
    },
    onVisible: () => {
      // From M9: resume audio.
    },
  });

  if (flags.debug) {
    installDebugHooks({
      flags,
      screen: () => screens?.screen ?? 'menu',
      simulateUpdateReady: () => gate.markReady(),
    });
  }

  // Phaser: created here from M5.

  const sw = registerServiceWorker(gate);
}

function installHintFor(context: InstallContext, promptAvailable: boolean): InstallHint {
  if (context === 'ios-browser') return 'ios-share';
  if (context === 'browser' && promptAvailable) return 'install-button';
  return 'none';
}

void boot();
