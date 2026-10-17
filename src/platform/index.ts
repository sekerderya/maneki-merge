/**
 * Platform layer: browser and OS integration. The Android app's native side, platform/native/, is
 * loaded on its own (main.ts), so the web bundle never carries it.
 */
export { FakeAds, NoAds } from './ads';
export type { AdPlacement, AdResult, AdService, AdsStatus, RewardedAds } from './ads';
export {
  AnalyticsHub,
  CrashlyticsSink,
  FakeAnalyticsSink,
  FirebaseAnalyticsSink,
  GameAnalyticsSink,
} from './analytics';
export type {
  Analytics,
  AnalyticsEvent,
  AnalyticsScreen,
  AnalyticsSink,
  AnalyticsStatus,
} from './analytics';
export { loadFirebaseWeb, loadGameAnalytics } from './analyticsSdks';
export { BackStack } from './backButton';
export type { BackHandler } from './backButton';
export { readStoredFlags, storeFlag } from './debugFlags';
export { loadFonts } from './fonts';
export { Haptics } from './haptics';
export type { HapticPattern } from './haptics';
export { reducedMotion, setReduceMotion } from './motion';
export { detectInstallContext, InstallPrompt, readInstallEnvironment } from './installContext';
export type { InstallContext } from './installContext';
export { browserNetwork } from './network';
export type { Network } from './network';
export { watchPhoneLandscape } from './orientation';
export { controlledByServiceWorker, registerServiceWorker } from './pwa';
export type { ServiceWorkerControls } from './pwa';
export { UpdateGate } from './updateGate';
export { openStorage, requestPersistentStorage } from './storage';
export type { OpenedStorage } from './storage';
export { setupViewport } from './viewport';
export { cutoutBandLikely, watchDisplayCutout } from './displayCutout';
export { watchLifecycle } from './visibility';
