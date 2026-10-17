/**
 * The Android app's native side (TECH_SPEC §16). Only the app's build loads it
 * (`if (__NATIVE_APP__) await import('./platform/native')` in main.ts), so the web bundle carries
 * no Capacitor, AdMob or native Firebase code.
 */
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { AdmobConsentDebugGeography, MaxAdContentRating } from '@capacitor-community/admob';
import { App } from '@capacitor/app';
import { ConsentStatus, ConsentType, FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { registerPlugin } from '@capacitor/core';
import { Network as NetworkPlugin } from '@capacitor/network';
import { DEV_APP_ID_SUFFIX } from '../../config/ads';
import type { Scheduler } from '../../core/profile';
import { AdMobAds } from '../ads';
import type { AdMobApi, AdMobSetup, AdService } from '../ads';
import type { CrashlyticsApi, FirebaseAnalyticsApi } from '../analytics';
import { pluginNetwork } from '../network';
import type { Network } from '../network';

export interface NativeApp {
  /** The dev app (application ID `….dev`): it starts with the debug flags and test ads. */
  readonly devApp: boolean;
  /** The online check through Capacitor's Network plugin. */
  readonly network: Network;
  /** The ads through AdMob (`@capacitor-community/admob`). */
  createAds(setup: AdMobSetup, timers: Scheduler): AdService;
  /**
   * The hashed ID AdMob and its consent check know this phone by (the dev app only, for the debug
   * panel and the EEA consent test), or null.
   */
  readonly testDeviceId: string | null;
  /**
   * Firebase's native SDKs (TECH_SPEC §17), for the play statistics. They only work when the build
   * had Firebase's config (`__ANALYTICS_KEYS__.firebaseApp`); the statistics switch them on only
   * after the player's yes.
   */
  readonly firebase: {
    readonly analytics: FirebaseAnalyticsApi;
    readonly crashlytics: CrashlyticsApi;
  };
}

/** The app's own small plugin (android/…/DevicePlugin.java). */
interface DevicePlugin {
  testDeviceId(): Promise<{ readonly id: string }>;
}
const Device = registerPlugin<DevicePlugin>('ManekiDevice');

/** Starts the native side: reads which app this is, the connection, and takes the back button. */
export async function startNativeApp(): Promise<NativeApp> {
  const [info, network] = await Promise.all([
    App.getInfo().catch(() => null),
    pluginNetwork(NetworkPlugin),
  ]);
  const devApp = info?.id.endsWith(DEV_APP_ID_SUFFIX) ?? false;
  const testDeviceId = devApp
    ? await Device.testDeviceId().then(
        (result) => result.id,
        () => null,
      )
    : null;
  watchBackButton();
  return {
    devApp,
    network,
    testDeviceId,
    createAds: (setup, timers) => new AdMobAds(adMobApi(), network, setup, timers),
    firebase: { analytics: firebaseAnalyticsApi(), crashlytics: crashlyticsApi() },
  };
}

/**
 * The back button. Without a listener Capacitor goes back in the WebView's history and does
 * nothing at its start, so the menu could never leave the app. The game's layers are history
 * entries (`platform/backButton.ts`): back pops one; with none left the app goes to the
 * background, as the installed web app leaves.
 */
function watchBackButton(): void {
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}

function adMobApi(): AdMobApi {
  return {
    initialize: (options) =>
      AdMob.initialize({
        ...options,
        maxAdContentRating: options.maxAdContentRating as MaxAdContentRating,
      }),
    requestConsentInfo: (options) =>
      AdMob.requestConsentInfo({
        ...options,
        ...(options.debugGeography === undefined
          ? {}
          : { debugGeography: options.debugGeography as AdmobConsentDebugGeography }),
      }),
    showConsentForm: () => AdMob.showConsentForm(),
    showPrivacyOptionsForm: () => AdMob.showPrivacyOptionsForm(),
    resetConsentInfo: () => AdMob.resetConsentInfo(),
    prepareRewardVideoAd: (options) => AdMob.prepareRewardVideoAd(options),
    showRewardVideoAd: (options) => AdMob.showRewardVideoAd(options),
    onRewardEvent: (event, listener) => {
      switch (event) {
        case 'rewarded':
          void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => listener());
          break;
        case 'dismissed':
          void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => listener());
          break;
        case 'failedToShow':
          void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => listener());
          break;
      }
    },
  };
}

/**
 * Firebase Analytics' native SDK. The manifest starts it switched off; the yes switches it on with
 * analytics storage granted and Google's ad signals denied (the statistics are not for ads).
 */
function firebaseAnalyticsApi(): FirebaseAnalyticsApi {
  return {
    setEnabled: async (on) => {
      if (on) {
        await FirebaseAnalytics.setConsent({
          type: ConsentType.AnalyticsStorage,
          status: ConsentStatus.Granted,
        });
        for (const type of [
          ConsentType.AdStorage,
          ConsentType.AdUserData,
          ConsentType.AdPersonalization,
        ]) {
          await FirebaseAnalytics.setConsent({ type, status: ConsentStatus.Denied });
        }
      }
      await FirebaseAnalytics.setEnabled({ enabled: on });
    },
    setScreen: (name) =>
      FirebaseAnalytics.setCurrentScreen({ screenName: name, screenClassOverride: name }),
    logEvent: (name, params) => FirebaseAnalytics.logEvent({ name, params: { ...params } }),
  };
}

/** Crashlytics' native SDK; the manifest starts its collection switched off. */
function crashlyticsApi(): CrashlyticsApi {
  return {
    setEnabled: (on) => FirebaseCrashlytics.setEnabled({ enabled: on }),
    recordException: (message, frames) =>
      FirebaseCrashlytics.recordException({
        message,
        stacktrace: frames.map((frame) => ({ ...frame })),
      }),
    log: (message) => FirebaseCrashlytics.log({ message }),
    setCustomKey: (key, value) =>
      FirebaseCrashlytics.setCustomKey(
        typeof value === 'number' ? { key, value, type: 'long' } : { key, value, type: 'string' },
      ),
  };
}
