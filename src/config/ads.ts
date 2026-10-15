/**
 * Rewarded ads in the Android app (TECH_SPEC §16, docs/plans/capacitor-admob.md). The web and iOS
 * builds show none. Where the ads show and what they give comes with the placements plan.
 */

/** Where a rewarded ad can be offered; each has its own ad unit, so AdMob reports them apart. */
export const AD_PLACEMENTS = ['specialBall', 'luckySave', 'doubleCoins'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/**
 * Google's sample rewarded ad unit: it always serves a test ad. The app's AdMob App ID is in the
 * Android resources (`admob_app_id`, android/app/src/main/res/values/strings.xml), Google's sample
 * `ca-app-pub-3940256099942544~3347511713` until the owner's account exists.
 */
export const TEST_REWARDED_AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';

/** The release app's ad unit per placement. Google's sample until the owner sends the real IDs. */
export const AD_UNITS: Readonly<Record<AdPlacement, string>> = {
  specialBall: TEST_REWARDED_AD_UNIT,
  luckySave: TEST_REWARDED_AD_UNIT,
  doubleCoins: TEST_REWARDED_AD_UNIT,
};

/** The dev app's units: it never shows a real ad. */
export const TEST_AD_UNITS: Readonly<Record<AdPlacement, string>> = {
  specialBall: TEST_REWARDED_AD_UNIT,
  luckySave: TEST_REWARDED_AD_UNIT,
  doubleCoins: TEST_REWARDED_AD_UNIT,
};

/**
 * Phones that get test ads even from the release app's real units (never tap a real ad on your own
 * phone): the hashed ID AdMob prints in logcat, or the one the dev app's debug panel shows.
 */
export const AD_TESTING_DEVICES: readonly string[] = [];

/** The ads' content rating: PG (the app's audience is 13 and over, not the Families program). */
export const AD_MAX_CONTENT_RATING = 'ParentalGuidance';

/** A failed load is retried after these delays, then every last one. */
export const AD_RETRY_DELAYS_MS: readonly number[] = [30_000, 60_000, 120_000, 300_000];

/** A loaded ad older than this is thrown away and loaded again (AdMob's expire after an hour). */
export const AD_MAX_AGE_MS = 55 * 60_000;

/**
 * At launch the consent check waits at most this long for AdMob's answer, counted from boot (the
 * loading screen runs meanwhile); a later answer still decides the ads, but never brings the form
 * up over the game.
 */
export const CONSENT_INFO_TIMEOUT_MS = 3000;

/** UMP's debug geography for `?consent=eea` (AdmobConsentDebugGeography.EEA). */
export const CONSENT_DEBUG_GEOGRAPHY_EEA = 1;

/** The fake ad (`?ads=fake`): seconds before its reward can be taken. */
export const FAKE_AD_SECONDS = 5;

/** The dev app (`.dev`, TECH_SPEC §16) always starts with these flags: debug panel, fake ads. */
export const DEV_APP_ID_SUFFIX = '.dev';
export const DEV_APP_FLAGS = 'debug=1&ads=fake';
