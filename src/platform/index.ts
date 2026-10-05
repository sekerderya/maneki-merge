/** Platform layer: browser and OS integration. Storage and haptics arrive in later milestones. */
export { BackStack } from './backButton';
export type { BackHandler } from './backButton';
export { loadFonts } from './fonts';
export { detectInstallContext, InstallPrompt, readInstallEnvironment } from './installContext';
export type { InstallContext } from './installContext';
export { watchPhoneLandscape } from './orientation';
export { registerServiceWorker } from './pwa';
export { UpdateGate } from './updateGate';
export { setupViewport } from './viewport';
export { watchLifecycle } from './visibility';
