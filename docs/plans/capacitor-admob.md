# Plan: the Android app on Capacitor, ready for AdMob

> Written 2026-10-15 from the owner's request in chat. It is a work order for another agent
> session. Once something is built, its rules live in TECH_SPEC / PLAY_STORE / GAME_DESIGN; from
> then on those docs win over this file.

## 1. What and why

The owner wants three rewarded ads in the game later (a special ball from a small side box, one
more Lucky Save after the last one, double coins at game over). Google's ad SDK for apps,
**AdMob**, only runs in a native app, not in a web page, and the Play app is a Trusted Web
Activity (TECH_SPEC §16), which is Chrome showing the live site. So the Play app goes back to
**Capacitor**, as M14 first planned: a native Android app with the game's build inside it and the
AdMob SDK beside it.

This plan builds **the base only**: the Capacitor app, the AdMob SDK with Google's test ads, the
consent form, the online check, and an ad service the game can call. **The three ad placements
(where they show, what they give, their limits) are not part of this plan.** They come in a later
plan once the base works on the owner's phone.

## 2. Owner decisions (don't change them)

- The Google Play app becomes a **Capacitor** app that can use **AdMob** (stack change approved by
  the owner in chat, 2026-10-15). It replaces the TWA.
- **The game runs fully without internet.** The app carries the whole game; nothing in the game
  needs the network.
- **Without internet, ad options never appear.** Not greyed out, not "try again later": they are
  not shown at all.
- **No balance measurement for the ads** (no `npm run sim` arms for them). The owner plays and
  decides the numbers themself.
- **The in-game ad flows come later.** This plan only makes the game ready for them.
- The owner implements this plan with another agent session.

## 3. Decisions taken for the owner (list them in the CHANGELOG and the report)

1. **Web and iOS stay as they are, without ads.** GitHub Pages keeps serving the PWA (iOS home
   screen app, Android Chrome install, desktop). Only the Android app has ads. One codebase, two
   builds.
2. **Same package name:** `io.github.sekerderya.manekimerge` and the same upload key
   (`npm run android:key`, the repository secrets). Nothing is on Play yet, so nothing breaks.
3. **The app's version follows the game's.** `versionName` = `package.json`'s version;
   `versionCode` = `major × 1 000 000 + minor × 1 000 + patch` (0.53.0 → 53 000), computed in
   Gradle from `package.json`, so it always grows and is always above the TWA's 1.
4. **Game updates now need a Play release.** The game is inside the app, so a push to `main`
   updates the web version at once and the Android app only with the next uploaded bundle. The
   Android workflow builds the bundle; the owner uploads it in Play Console (automatic upload
   through the Play Developer API can come later, it needs a service-account secret).
5. **No service worker in the app.** The files are already on the phone. The update gate, the
   "Updating…" badge and the install hints are off in the app build. "An update never
   interrupts a run" still holds: Play updates only when the app is closed, and the run in
   progress is saved when the app goes to the background (TECH_SPEC §8).
6. **Saves don't carry over from Chrome.** The app's WebView has its own storage (origin
   `https://localhost`). The owner's progress in the Chrome web app stays there. There are no
   players yet, so no transfer tool. **Never change `server.hostname` or `server.androidScheme`
   later**: it would change the origin and lose every player's save.
7. **Google's test ads until the owner has an AdMob account.** The test App ID
   `ca-app-pub-3940256099942544~3347511713` and the test rewarded ad unit
   `ca-app-pub-3940256099942544/5224354917` (Google's public sample IDs). The real IDs go into
   `src/config/ads.ts` and the Android resources once the owner sends them (they are not secrets).
8. **One ad unit per placement** (`specialBall`, `luckySave`, `doubleCoins`), so AdMob reports
   each one separately. Until the real ones exist, all three use the test unit.
9. **A dev app beside the release app.** CI also builds a debug APK with the application ID suffix
   `.dev` (label "Maneki Dev"), which always uses test ads and starts with the debug flags on
   (§5.8). It installs next to the Play app with its own save, so the owner can test without
   touching their real progress, and never risks clicking a real ad.
10. **Audience 13 and over** in Play Console (PLAY_STORE §5.3 already recommends it). Ads in the
    Families program need certified SDKs and stricter rules; not worth it now.
    `maxAdContentRating: 'PG'`, no child-directed tag.

## 4. Versions checked on 2026-10-15

| Package                      | Version | License | Note                                                        |
| ---------------------------- | ------- | ------- | ----------------------------------------------------------- |
| `@capacitor/core`, `cli`     | 8.5.3   | MIT     | minSdk 24, compile/target SDK 36, Android Studio not needed |
| `@capacitor/android`         | 8.5.3   | MIT     | peer `@capacitor/core ^8.5.0`                               |
| `@capacitor-community/admob` | 8.2.1   | MIT     | needs Capacitor ≥ 8.5; Google Mobile Ads 25.4.x, UMP 4.0    |
| `@capacitor/network`         | 8.0.1   | MIT     | online/offline with change events                           |
| `@capacitor/app`             | 8.1.2   | MIT     | back button, app state                                      |

Check them again with `npm view <pkg> version` before installing. Add only these (and
`@capacitor/haptics` if §5.6 needs it). The admob plugin's API: `AdMob.initialize`,
`requestConsentInfo`, `showConsentForm`, `showPrivacyOptionsForm`, `prepareRewardVideoAd`,
`showRewardVideoAd`, and `RewardAdPluginEvents` `Loaded` / `FailedToLoad` / `Rewarded` /
`Dismissed`. **Give a reward only on `Rewarded`**: `Dismissed` also comes when the player closes
the ad early. Read the plugin's README for the current details before writing the code.

## 5. Work

### 5.1 The Capacitor project

- Replace the Bubblewrap project in `android/` with Capacitor's (`npx cap add android`), keeping
  the folder name so the workflow paths and `.prettierignore` stay meaningful. Delete
  `twa-manifest.json`, the TWA's `LauncherActivity` change and `store_icon.png` only once the new
  icon pipeline (§5.5) makes its replacement.
- `capacitor.config.ts` at the repository root: `appId` `io.github.sekerderya.manekimerge`,
  `appName` "Maneki Merge", `webDir` `dist-android`, `android.backgroundColor` `#fcefdf`, server
  defaults (`https://localhost`, see decision 6, write the warning as a comment there).
- `android/app/build.gradle`: `versionName` / `versionCode` from `../../package.json` (decision 3);
  no signing config (the workflow signs, as now); a `debug` build type with
  `applicationIdSuffix ".dev"` and the label "Maneki Dev" (decision 9).
- Manifest: portrait (`android:screenOrientation="portrait"`), the AdMob App ID meta-data
  (`com.google.android.gms.ads.APPLICATION_ID` → `@string/admob_app_id`), the `VIBRATE`
  permission (§5.6). Keep `INTERNET` (Capacitor's template has it; AdMob needs it).
- `MainActivity`: immersive full screen like the TWA (hide the status and navigation bars, swipe
  shows them for a moment, `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`). Check what Capacitor 8's
  built-in SystemBars plugin does first and use it if it covers this; otherwise
  `WindowInsetsControllerCompat` in `onCreate`.
- Safe areas: the CSS reads `env(safe-area-inset-*)` (`src/ui/styles/tokens.css`,
  `index.html`). Capacitor 8 injects `--safe-area-inset-*` instead when its SystemBars
  `insetsHandling` is `css`; newer WebViews (Chromium 140+) report real `env()` values. Pick the
  setting that makes the existing CSS work on the owner's phone and on an old WebView; if needed,
  read `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` in `tokens.css` only.
- Splash: Android 12's splash with the cream background and the icon, hidden as soon as the web
  page draws its own loading screen (the loading screen stays the real one).

### 5.2 Two builds from one codebase

- `vite.config.ts` gets a mode `android`: `base: '/'`, `outDir: 'dist-android'`, the PWA plugin
  off (`disable: true`, no manifest, no service worker), and a define `__NATIVE_APP__ = true`
  (false in every other build). Add `__NATIVE_APP__` to `src/env.d.ts`.
- npm scripts (cross-platform, no bash): `build:android` = `vite build --mode android && cap sync
android`. Add `dist-android/` to `.gitignore`, and Capacitor's generated web copy
  (`android/app/src/main/assets/public/`) too.
- Everything that only the app needs is loaded with a dynamic `import()` behind
  `if (__NATIVE_APP__)`, so the web bundle carries no Capacitor or AdMob code. Check the web build's
  output for `capacitor` / `admob` strings.
- In the app build: no service worker registration (`platform/pwa.ts`), the update gate inert,
  `detectInstallContext` returns `installed` (no install hints).
- Links that leave the game (Settings → Privacy policy, `src/ui/panels/settingsPanel.ts`) must not
  navigate the WebView away from the game: in the app they open the live
  `https://sekerderya.github.io/maneki-merge/privacy.html` in the phone's browser. Verify on the
  phone; use `@capacitor/browser` only if a plain external link doesn't leave the app.

### 5.3 Online check (`src/platform/network.ts`)

- `Network`: `online` now and `onChange(listener)`. The app uses `@capacitor/network`; the web
  uses `navigator.onLine` with the `online` / `offline` events (the web build never shows ads, but
  the same interface keeps the code paths one).
- Unit tests with fakes, like `backButton.ts` and `haptics.ts` are tested.

### 5.4 The ad service (`src/platform/ads.ts`, config in `src/config/ads.ts`)

The game only talks to this interface; the later placements plan builds on it.

```ts
export type AdPlacement = 'specialBall' | 'luckySave' | 'doubleCoins';
export type AdResult = 'rewarded' | 'closed' | 'failed';

export interface RewardedAds {
  /** True only when an ad can be shown right now for this placement: online, consent allows
   *  ads, the SDK is ready and an ad is loaded. Ad options are shown only while this is true. */
  ready(placement: AdPlacement): boolean;
  /** Called whenever `ready` may have changed (connection, load, show, consent). */
  onChange(listener: () => void): () => void;
  /** Shows the ad; resolves after it closes. `rewarded` only when AdMob sent its reward. */
  show(placement: AdPlacement): Promise<AdResult>;
  /** True while a full-screen ad covers the game (see "Lifecycle" below). */
  readonly showing: boolean;
}
```

- **Three implementations:**
  - `NoAds`: the web and iOS build. `ready` is always false; `show` resolves `failed`.
  - `AdMobAds`: the app. Uses `@capacitor-community/admob`.
  - `FakeAds`: `?ads=fake` (and the dev app's debug panel, §5.8). A DOM overlay "Test ad" with a
    5 s countdown, then "Get reward" / "Close", so the flows can be built and tested on the desktop
    and in Playwright. `ready` follows the real online check, so offline hides it too.
- **`src/config/ads.ts`:** the ad unit per placement, the test IDs, retry delays, the ad's
  maximum age. No magic numbers in `ads.ts`.
- **Loading:** after consent allows it and while online, load one rewarded ad per placement and
  keep it ready. After a show, load the next one. A failed load retries after 30 s, 60 s, 2 min,
  then every 5 min (config); going online retries at once; going offline makes `ready` false at
  once (an already loaded ad is not shown offline, decision in §2). An ad older than 55 min is
  thrown away and reloaded (AdMob's loaded ads expire after an hour).
- **Lifecycle:** a full-screen ad is a native screen over the app, so the page becomes hidden and
  `watchLifecycle` pauses the run, saves and suspends the audio. That is fine (a crash during an
  ad keeps the run), but when the ad closes the game must not show the pause overlay for it:
  while `showing` is true the lifecycle code still saves but doesn't open the pause overlay, and
  audio resumes when the page is visible again. The placements plan decides what the run does
  after the reward.
- **Test devices:** the owner's phone can be added in `config/ads.ts` (`testingDevices`, the ID
  AdMob prints in logcat) so even the release app shows test ads on it.
- Unit tests: `AdMobAds` against a fake plugin (load, fail and retry, offline, consent refused,
  the 55-minute expiry, `Rewarded` vs only `Dismissed`), `FakeAds`, `NoAds`. Fake timers for the
  retries.

### 5.5 Consent (UMP) and privacy

- At launch in the app, after the loading screen and before the menu (never over a run: a saved
  run opens the game screen paused, so ask before that screen): `requestConsentInfo`, then
  `showConsentForm` when AdMob says it is required (EEA, UK, Switzerland; the owner sets the
  message up in AdMob's Privacy & messaging, §6). No internet: skip it, ads aren't ready anyway;
  ask again at the next launch with a connection.
- Settings gets a **Privacy options** row in the app when AdMob says the privacy options form is
  required (`showPrivacyOptionsForm`), so a player can change the answer. Not in the web build.
- Debug: `?consent=eea` (the dev app's debug panel too) asks for the EEA debug geography, and a
  "Reset consent" button in the debug panel.
- `public/privacy.html`: one policy for both, with a section for the Android app: it shows ads
  from Google AdMob, which can use the advertising ID and the device's data as Google's policy
  describes (link it), only when the player is online; the consent form; nothing else changes (no
  accounts, the save stays on the phone). The web part keeps "no ads, no data". The owner reads
  it before the release.

### 5.6 Phone features in the WebView

- **Back button:** check that the existing history-based `BackStack` works in the WebView
  (Capacitor goes back in the WebView's history when it can). If it doesn't, an `@capacitor/app`
  `backButton` listener calls `history.back()` when there is a layer, and otherwise leaves the
  app as now (`App.minimizeApp()`).
- **Haptics:** `navigator.vibrate` with the `VIBRATE` permission. If the WebView ignores it, add
  `@capacitor/haptics` behind the existing `Haptics` class (one `vibrate(ms)` per pattern step).
- **Audio:** the first gesture still unlocks it; check it plays, mutes with Sound off, and
  resumes after the app comes back.
- **Fonts, clips, images:** all from the app's files. Check the how-it-works clips play (they are
  fetched as blobs, TECH_SPEC §9) and the loading bar fills.
- **Storage:** `localStorage` keys stay `maneki-merge:*`. Check a save survives killing the app
  and a reinstall of a newer version over it (same signing key).

### 5.7 Icons

- Extend `tools/buildAppIcon.ts` (sharp is already there; no `@capacitor/assets`) to write the
  Android launcher icons from `art-source/app-icon.*`: an adaptive icon (cream background layer,
  the picture as foreground inside the 66% safe zone, the paw kept in like the maskable icon) and
  the legacy `mipmap-*` PNGs, plus Play's 512 store icon. Output committed, like the web icons.

### 5.8 Debug in the app

- URL flags can't be typed in an app. The dev app (`.dev`, decision 9) is built with a define
  that adds `debug=1&ads=fake` to the flags the game reads at boot (one place where the query
  string is parsed). The release app reads none.
- The debug panel gets an **Ads** group: online / consent / loaded state per placement, "Show
  test ad" per placement (shows the result), "Use fake ads" / "Use AdMob test ads", "EEA consent",
  "Reset consent".

### 5.9 CI (`.github/workflows/android.yml`)

- Runs on pushes of a tag `v*`, on changes to `android/`, `capacitor.config.ts` or the workflow,
  and by hand (a build per push to `main` would be wasted minutes; every release is tagged).
- Steps: checkout, Node 24 + `npm ci`, `npm run build:android`, Java 21 (what Capacitor 8's
  Gradle needs; check), `./gradlew bundleRelease assembleRelease assembleDebug`, then signing as
  now (the bundle with jarsigner, the APK with apksigner). Artifacts: `maneki-merge.aab` (Play),
  `maneki-merge.apk` (direct install), `maneki-merge-dev.apk`. Keep the summary with the key's
  fingerprint and the version name/code.
- `deploy.yml` / `e2e.yml` keep skipping `android/`-only pushes. The web deploy is unchanged.
- Update CLAUDE.md's Milestone workflow step 7 to say tags also build the Android app.

### 5.10 Docs to update in the same commits

- **CLAUDE.md:** hard constraints: "fully offline; the only network use is AdMob in the Android
  app, and the game never waits for it"; stack line (Capacitor + AdMob plugin for Android);
  commands (`npm run build:android`); the `?ads=` and `?consent=` flags.
- **TECH_SPEC:** §1 (the Android row), §2 (stack row: Capacitor replaces the TWA, the owner's
  call 2026-10-15), §3 (the new platform modules), §9 (no service worker in the app), §10 (back
  button, haptics, safe areas in the app), §11 (FakeAds in tests), §12 (the Android workflow),
  §16 rewritten for Capacitor.
- **PLAY_STORE.md:** §1 how the app works now; §3 building; §4 the asset links are no longer
  needed (say so; leave the file at `sekerderya.github.io` for now, it harms nothing); §5.3 "Ads:
  Yes", Data safety for AdMob (Google's AdMob data disclosure page lists what to declare: device
  or other IDs, approximate location, app interactions, diagnostics; shared for advertising),
  target audience 13+; §6 store texts without "No ads"; §7 updating = a new bundle per release;
  §8 the phone checks below.
- **GAME_DESIGN:** a short note where the menus are described: ads exist only in the Android app,
  only online, and their placements are designed later (link this plan until then).
- **ROADMAP:** a new milestone **M15: Android app on Capacitor, AdMob-ready** with this plan's
  checkboxes and the owner's steps; M14's TWA item stays as history.
- **CHANGELOG**, version bump (minor).

## 6. The owner's steps (not code; list them in the report)

1. Create an AdMob account (free; payments and tax info only matter once earnings near the payout
   threshold), add the app as Android, "not on a store yet", and create three rewarded ad units
   (`specialBall`, `luckySave`, `doubleCoins`). Send the App ID and the three unit IDs.
2. AdMob → Privacy & messaging: create the European regulations (GDPR) message, and the US states
   message if offered.
3. `app-ads.txt` at `https://sekerderya.github.io/app-ads.txt` (the user-site repository, like the
   asset links) with the line AdMob gives, and `https://sekerderya.github.io/` as the developer
   website in Play's store listing. The agent can add the file once the publisher ID is known.
4. Play Console: the new bundle to internal testing, the App content answers (§5.10), then the
   closed test (12 testers, 14 days) as before.
5. Until the app is on Play and linked in AdMob, only test ads show (AdMob limits ads on unreviewed
   apps). Never tap real ads on your own phone; add it as a test device.

## 7. Verify (the implementing agent)

- `npm run check` and `npm run build` pass; the web build is unchanged (no Capacitor or AdMob
  code in it, the service worker and update flow as before), checked in the browser at 390×844
  and 375×667 with a clean console.
- `npm run build:android` works on Windows; the Android workflow is green and its artifacts are
  signed.
- `?ads=fake` in the browser: the debug panel's "Show test ad" gives `rewarded` and `closed`;
  going offline (DevTools offline) makes every placement not ready at once.
- Unit tests for `network.ts`, `ads.ts` and the flag parsing; core/physics/run coverage stays
  ≥ 90%.
- Only the Playwright specs the change touches, one worker (CLAUDE.md).

## 8. Phone checks (the owner, on the dev APK first, then the release APK)

1. Install the APK, turn on airplane mode **before the first launch**: the game opens and plays
   (it couldn't in the TWA).
2. Full screen, no black band at the camera cutout, the HUD inside the safe areas, portrait only.
3. Back button: game → pause → menu → leaves the app. Haptics, sound on/off, backgrounding and
   coming back.
4. A run, kill the app, reopen: the run continues paused. Coins and upgrades are kept.
5. Online, debug panel → Ads: the test ad loads, "Show test ad" plays it, closing early gives
   `closed`, watching to the end gives `rewarded`, and the game comes back without the pause
   overlay. Airplane mode: the Ads group shows every placement not ready.
6. "EEA consent" + "Reset consent", relaunch: the consent form shows; Settings shows Privacy
   options.
7. FPS in the debug panel at 150 cats, against the Chrome web app on the same phone.

## 9. Not in this plan

- The three placements: the side box and its special balls, the Lucky Save ad, the double coins
  ad, their limits and looks (a later plan; the owner decides the numbers by playing).
- iOS app (the PWA stays ad-free), in-app purchases ("remove ads"), automatic Play uploads, ad
  revenue reporting in the game.
