/** Platform layer: browser and OS integration. */
export { BackStack } from './backButton';
export type { BackHandler } from './backButton';
export { loadFonts } from './fonts';
export { Haptics } from './haptics';
export type { HapticPattern } from './haptics';
export { reducedMotion, setReduceMotion } from './motion';
export { detectInstallContext, InstallPrompt, readInstallEnvironment } from './installContext';
export type { InstallContext } from './installContext';
export { watchPhoneLandscape } from './orientation';
export { controlledByServiceWorker, registerServiceWorker } from './pwa';
export type { ServiceWorkerControls } from './pwa';
export { UpdateGate } from './updateGate';
export { openStorage, requestPersistentStorage } from './storage';
export type { OpenedStorage } from './storage';
export { setupViewport } from './viewport';
export { cutoutBandLikely, watchDisplayCutout } from './displayCutout';
export { watchLifecycle } from './visibility';
