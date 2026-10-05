/** Platform layer: browser and OS integration. Haptics arrive in M9. */
export { BackStack } from './backButton';
export type { BackHandler } from './backButton';
export { loadFonts } from './fonts';
export { detectInstallContext, InstallPrompt, readInstallEnvironment } from './installContext';
export type { InstallContext } from './installContext';
export { watchPhoneLandscape } from './orientation';
export { registerServiceWorker } from './pwa';
export { UpdateGate } from './updateGate';
export { openStorage, requestPersistentStorage } from './storage';
export type { OpenedStorage } from './storage';
export { setupViewport } from './viewport';
export { watchLifecycle } from './visibility';
