# Maneki Merge on Google Play

How the game gets to Google Play, step by step, and what to type into Play Console and AdMob. The
technical side (the Android project, the ads, the workflow) is TECH_SPEC §16.

## 1. How the Play app works

- The Play app is a **Capacitor** app (v0.53, the owner's call on 2026-10-15; v0.43–v0.52 planned
  a Trusted Web Activity, which never reached Play): a native Android app with the whole game
  inside it and Google's **AdMob** beside it. Google's ad SDK only runs in a native app, which is
  why the app is no longer Chrome showing the live site.
- **It plays fully offline**, from the first launch: nothing in the game needs the network.
- **Ads exist only in this app, and only online.** Without a connection no ad option shows at all.
  The web app (GitHub Pages, the iOS home-screen app, Android Chrome's Install app) stays ad-free.
  Where the ads show in the game comes with the placements plan; until then the app only loads
  Google's test ads in the background (TECH_SPEC §16).
- Package name: **`io.github.sekerderya.manekimerge`**. It can never change once the app is on
  Play.
- **Game updates need a Play release.** The game is inside the app: a push to `main` updates the
  web app at once, and the Play app with the next bundle uploaded to Play (§7). The app's version is
  the game's (`0.53.0`, version code 53000).
- **Saves don't come over from Chrome.** The app keeps its own storage, so progress in the Chrome
  web app stays there (there are no players yet, so there is no transfer tool).
- **The dev app.** Every build also makes **Maneki Dev**, a second app beside the Play app with its
  own save: it starts with the debug panel and fake ads and only ever shows Google's test ads, so
  the owner can try things without touching their real progress or tapping a real ad (§8).

## 2. One time: the upload key

Play signs the app with its own key; the developer signs each upload with an **upload key**.
Create it once, on the Windows PC, in the repository folder:

```bash
npm run android:key
```

It needs Java (`keytool`, already installed) and the GitHub CLI logged in. It:

- writes the key to `C:\Users\<you>\maneki-merge-upload-key\upload-key.p12` and its password to
  `password.txt` in the same folder (never in the repository);
- stores both as repository secrets (`ANDROID_UPLOAD_KEYSTORE_BASE64`,
  `ANDROID_UPLOAD_KEYSTORE_PASSWORD`) so the Android workflow can sign;
- prints the key's **SHA-256 fingerprint**.

**Done on 2026-10-15** (v0.53.0, on the owner's PC with its Java 8 `keytool`): RSA 2048,
SHA256withRSA, valid until 2056, SHA-256
`D5:71:8A:DF:B8:92:5E:29:7A:78:86:25:56:97:04:0B:03:A3:C5:8D:65:3C:09:46:BA:2A:D3:F4:B2:E4:02:9A`.
Play Console shows the same fingerprint as the upload key certificate after the first upload.

**Back up both files** (a password manager, or a private cloud folder). If the key is ever lost,
Play Console → the app → Test and release → App integrity → App signing can reset the upload key
(it takes a few days); the app itself is never lost, because Play holds the signing key.

## 3. Building the app bundle

The **Android** workflow (`.github/workflows/android.yml`) builds the app for every release tag
(`vX.Y.Z`, pushed after each milestone and fix), on pushes that change `android/` or
`capacitor.config.ts`, and by hand: GitHub → Actions → Android → **Run workflow**.

When it's done, open the run and download the artifact **maneki-merge-android** (kept 30 days):

- `maneki-merge.aab`: the bundle that goes to Play.
- `maneki-merge.apk`: the same app to install directly on a phone.
- `maneki-merge-dev.apk`: **Maneki Dev**, the dev app (§1).

The run's summary shows the version and the upload key's fingerprint. Without the upload key
secrets (§2) the outputs are unsigned and Play refuses them.

**On the phone:** GitHub only offers a run's artifacts on a computer (as a zip). So a release tag's
run also puts the two signed APKs on a **draft release** for that tag: only the repository's owner
sees it, nobody else. In the phone's Chrome, signed in to GitHub, open
https://github.com/sekerderya/maneki-merge/releases, open the newest draft ("Maneki Merge vX.Y.Z
(Android)") and tap `maneki-merge-dev.apk` (or `maneki-merge.apk`) under Assets. Open the
download, allow installs from Chrome the first time, and install. A newer build installs over the
older one and keeps its save. Without a signed-in browser on the phone: download the artifact on
the computer, unzip it and send the APK to the phone (USB cable, Quick Share or Google Drive).

## 4. Digital Asset Links (not needed any more)

The TWA needed `https://sekerderya.github.io/.well-known/assetlinks.json` (in the user-site
repository `sekerderya/sekerderya.github.io`) to open full screen. The Capacitor app doesn't use
it. The file stays as it is (`[]`); it harms nothing. The same repository will hold `app-ads.txt`
(§9).

## 5. Play Console

### 5.1 The developer account

- https://play.google.com/console → sign up with a Google account, pay the one-time US$25 fee and
  verify your identity (an ID document). Choose **personal** unless you have a company with a
  D-U-N-S number.
- **New personal accounts must test first:** before the first production release, a closed test
  with **at least 12 testers opted in for 14 days in a row** (Google's rule for personal accounts
  created after 13 November 2023; organisation accounts don't need it). Friends and family with
  Android phones count; each joins with their Google account through the test's link. Then apply
  for production access (Play asks a few questions about the test).
- Play shows the developer name and the contact email on the app's page.

### 5.2 Create the app

Home → **Create app**: app name `Maneki Merge`, default language **English (United States)**,
**Game**, **Free**, and accept the declarations. (Free can't become paid later; paid can't become
free.)

### 5.3 App content (Policy → App content)

| Section                                  | Answer                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy                           | `https://sekerderya.github.io/maneki-merge/privacy.html` (also linked in the game's Settings). It has a section for the app's ads; read it before the release.                                                                                                                                                                                                                    |
| App access                               | All functionality is available without any access restrictions                                                                                                                                                                                                                                                                                                                    |
| Ads                                      | **Yes, the app contains ads** (Google AdMob)                                                                                                                                                                                                                                                                                                                                      |
| Content rating                           | Category: Game. No violence, sexuality, bad language, drugs or alcohol. Gambling: no (coins are earned by playing; they can't be bought, won by betting or cashed out). Users can't talk to each other or share anything; no location; no digital purchases. Expect an Everyone / PEGI 3 rating.                                                                                  |
| Target audience                          | **13 and over** (13–15, 16–17, 18+). Under 13 would put the app in the Families program, whose ads need certified SDKs and stricter rules. The ads are limited to PG content and not tagged child-directed (TECH_SPEC §16).                                                                                                                                                       |
| Data safety                              | **Yes**, the app collects and shares data: through the Google Mobile Ads SDK, and since v0.57 the play statistics (GameAnalytics, Firebase Analytics, Crashlytics), only after the player's yes. Google's lists: https://developers.google.com/admob/android/privacy/play-data-disclosure and https://firebase.google.com/docs/android/play-data-disclosure. See the table below. |
| Advertising ID                           | **Yes**, the app uses it, for **Advertising or marketing** (the Mobile Ads SDK adds the `AD_ID` permission)                                                                                                                                                                                                                                                                       |
| Government, financial, health, news apps | None of these                                                                                                                                                                                                                                                                                                                                                                     |

The Data safety answers for AdMob and the play statistics (check them against Google's pages
above, which are updated with the SDKs). "Shared" is AdMob's: the statistics services process the
data for the developer, which Play doesn't count as sharing.

| Data type                              | Collected | Shared | Purposes                                                                    |
| -------------------------------------- | --------- | ------ | --------------------------------------------------------------------------- |
| Location → Approximate location        | Yes       | Yes    | Advertising or marketing; Analytics; Fraud prevention, security, compliance |
| App activity → App interactions        | Yes       | Yes    | Advertising or marketing; Analytics; Fraud prevention, security, compliance |
| App info and performance → Crash logs  | Yes       | No     | Analytics (Crashlytics, v0.57)                                              |
| App info and performance → Diagnostics | Yes       | Yes    | Advertising or marketing; Analytics; Fraud prevention, security, compliance |
| Device or other IDs                    | Yes       | Yes    | Advertising or marketing; Analytics; Fraud prevention, security, compliance |

Then: the data is encrypted in transit (yes); collection is not optional while ads load (the
consent form covers it where the law asks), and crash logs are optional (the player's yes on the
statistics card, Settings → Play statistics); there is no account, so the way to ask for deletion
is the contact in the privacy policy.

### 5.4 Store listing (Grow users → Store presence → Main store listing)

- **App name:** Maneki Merge
- **Short description** and **full description:** §6.
- **App icon** (512×512 PNG): [`android/store_icon.png`](../android/store_icon.png), the app icon
  (`npm run icons` writes it).
- **Feature graphic** (1024×500): the owner's art, prompt in docs/ART_ASSETS.md §4.18; Claude crops
  it to size into `docs/play-store/feature-graphic.png`.
- **Phone screenshots** (1080×1920, in this order):
  [1](play-store/screenshots/1-play.jpg), [2](play-store/screenshots/2-combo.jpg),
  [3](play-store/screenshots/3-new-jar.jpg), [4](play-store/screenshots/4-blessing.jpg),
  [5](play-store/screenshots/5-upgrades.jpg), [6](play-store/screenshots/6-menu.jpg)
  (`docs/play-store/screenshots/`, taken from the game on a GPU at 360×640, 3×).
- Tablet screenshots are optional; skip them.
- **Store settings:** category **Games → Puzzle** (or Casual); contact email (required, shown on
  the page); website **`https://sekerderya.github.io/`** (AdMob looks for `app-ads.txt` at the
  root of the developer website, §9).

### 5.5 Releases

1. **Internal testing** (Test and release → Testing → Internal testing): create a release, accept
   **Play App Signing** with a Google-generated key, upload `maneki-merge.aab`. Add your own Google
   account as a tester and install from the opt-in link. Go through §8 on the phone.
2. **Closed testing** with 12+ testers for 14 days (personal accounts, §5.1). The same bundle can
   be promoted from internal testing.
3. **Production**: apply for access, then create the production release (countries: all), roll
   out. Google's review takes from a few hours to a few days.

## 6. Store listing texts (English, United States)

Play can translate the listing; a Turkish one can be added by hand under Store presence → Store
listings → Manage translations.

**Short description** (80 characters at most):

```text
Drop lucky cats, merge them into bigger ones and grow your shrine jar!
```

**Full description** (4000 characters at most):

```text
Drop lucky cats into the shrine jar. When two cats of the same size touch, they merge into a bigger cat and pay out coins. Keep merging up to the stage's biggest cat to clear the stage, and every five stages the jar grows and a new garden opens around it.

Maneki Merge is a cosy merge puzzle with maneki-neko, the beckoning cats that bring good luck.

HOW TO PLAY
• Drag to aim the paw, let go to drop the cat.
• Two cats of the same size merge into the next size.
• Quick merges in a row build a combo for extra score.
• Don't let the jar overflow: a cat that stays above the rim too long ends the run.

EVERY STAGE IS A CHOICE
After each stage, pick a trial that makes the next stages harder, then a blessing that helps you for the rest of the run: golden cats that skip a size, hanabi fireworks that clear space, a joker cat that merges with anything, lightning that clears a whole size at once, and more.

GROW YOUR LUCK
Coins stay with you between runs. Spend them on permanent upgrades: more coins from everything, bigger cats more often, a Lucky Save when the jar is full, and new blessings to find.

MADE TO RELAX
• Plays fully offline
• Optional ads: watch one only when you want its reward
• No in-app purchases, no accounts; your progress stays on your phone
• Soft pastel shrine-garden art, gentle sounds and haptics
• Portrait, one hand, short runs or long ones
```

## 7. Updating the Android app

- **Every release is a new bundle.** The version comes from `package.json` (the version code is
  major × 1,000,000 + minor × 1,000 + patch, so it always grows); the release tag builds the
  bundle (§3). Upload `maneki-merge.aab` as a new release in Play Console (internal testing first,
  then the track the app is on). Play refuses a version code it has seen.
- An update never interrupts a run: Play updates the app while it is closed, and a run in progress
  is saved whenever the app goes to the background.
- Automatic uploads through the Play Developer API can come later (they need a service account
  key as a repository secret).
- **Every year** Google raises the required target API level (new apps and updates must target the
  Android version of the year before, from 31 August; in 2026: API 36). Until the deadline nothing
  breaks; after it an update can't be published until `android/variables.gradle` targets the new
  level (TECH_SPEC §16).

## 8. Checks on the phone

On the dev APK first (Maneki Dev), then the release APK or the internal testing install:

1. Install the app, turn on **airplane mode before the first launch**: the game opens and plays.
2. Full screen, no black band at the camera cutout, the HUD inside the safe areas, portrait only;
   a swipe from the edge shows the bars for a moment.
3. The back button: game → pause → menu → leaves the app. Haptics, sound on and off, going to the
   background and coming back.
4. A run, kill the app, reopen: the run continues paused. Coins and upgrades are kept.
5. Online, Maneki Dev's debug panel (**DBG**) → **Use AdMob test ads** (the app restarts its page):
   the Ads lines show the consent and each placement `ready` after a few seconds; **Ad: Lucky
   Save** plays Google's test ad; closing it early shows `closed` in "last ad", watching to the end
   `rewarded`, and the game comes back with no pause overlay. Airplane mode: every placement shows
   not ready at once.
6. **EEA consent: off** → on, then **Reset consent** (the page restarts): Google's consent form
   shows before the menu; Settings shows **Privacy options**, which opens it again.
7. FPS in the debug panel with 150 cats (Merge ×10 a few times), against the Chrome web app on the
   same phone.
8. Settings → **Privacy policy** opens the live policy in the phone's browser.
9. The ads in play (GAME_DESIGN §2.7, with fake or AdMob test ads): from a stage's 8th drop the
   **Bonus** bubble on the left; its card's Watch ad puts the ball straight into the paw and the
   cat comes back after it. Out of room with no Lucky Save left: "Out of room!" once per run.
   Game Over: **Double coins**. Airplane mode: none of them shows.
10. The play statistics (v0.57, once §10 is done and a tag has built the app with them): the first
    launch asks **Play statistics** after the loading (after Google's consent form where it shows);
    **Yes, share**, play a stage, then GameAnalytics' test game (Realtime) and Firebase's Maneki
    Dev app (Realtime) show the events within minutes. The debug panel's Statistics lines say
    `test · granted` with each service `on`; **Stats test error**, then close and reopen the app:
    Crashlytics shows a non-fatal "Debug panel test error". Settings → **Play statistics** OFF:
    nothing more arrives.

## 9. AdMob (the owner's steps)

1. **Account:** https://admob.google.com, sign in with the Google account (free; payment and tax
   details only matter once earnings near the payout threshold). Add the app: Android, "not
   listed on a store yet". Create three **rewarded** ad units, named `specialBall`, `luckySave`
   and `doubleCoins`. Send Claude the **App ID** (`ca-app-pub-…~…`) and the three **ad unit IDs**
   (`ca-app-pub-…/…`); they are not secrets and go into `src/config/ads.ts` and the app's
   resources.
2. **Privacy & messaging:** create the **European regulations (GDPR)** message for the app, and the
   US states message if AdMob offers it. This is the consent form the app shows (TECH_SPEC §16).
3. **app-ads.txt:** AdMob shows a line like `google.com, pub-…, DIRECT, f08c47fec0942fa0`. It goes
   in `https://sekerderya.github.io/app-ads.txt` (the user-site repository, like the asset links);
   Claude can add it once the publisher ID is known. The store listing's website must be
   `https://sekerderya.github.io/` (§5.4).
4. **Test device:** never tap real ads on your own phone. Maneki Dev's debug panel shows the
   phone's test device ID (**Copy device ID**); send it to Claude for `AD_TESTING_DEVICES`, and the
   release app shows test ads on that phone too.
5. Until the app is on Play and linked in AdMob (Apps → the app → App settings → link to Google
   Play), AdMob serves few or no real ads; the dev app's test ads always work.

## 10. Play statistics: Firebase and GameAnalytics (the owner's steps)

The game's side is done (v0.57, TECH_SPEC §17); it sends nothing until these accounts exist and
their keys are in the repository's secrets. Both are free.

1. **Firebase** (https://console.firebase.google.com, the same Google account as Play and AdMob):
   1. **Add project** → name "Maneki Merge" → Google Analytics **on** → create an Analytics
      account (or pick yours), country Turkey.
   2. **Add app → Android**: package name `io.github.sekerderya.manekimerge`, nickname "Maneki
      Merge". Skip its "Add the SDK" steps (they are done).
   3. **Add app → Android** again: `io.github.sekerderya.manekimerge.dev`, nickname "Maneki Dev".
      Both apps are needed: without the dev app the build leaves Firebase out.
   4. Project settings (the gear) → General → Your apps → either Android app →
      **google-services.json**: download it after adding both (one file holds both).
   5. **Add app → Web** (`</>`): nickname "Maneki Merge web", no Firebase Hosting. Copy the
      `firebaseConfig = { … }` it shows.
   6. Build → **Crashlytics** → Get started / Enable (for the Android apps).
   7. Optional: Analytics' data retention (Project settings → Integrations → Google Analytics →
      the property's Admin → Data collection → Data retention) from 2 to 14 months.
2. **GameAnalytics** (https://gameanalytics.com, sign up free): create a studio, then **two
   games**, both for the web / HTML5 (the game uses its JavaScript SDK in the web app and in the
   Android app): "Maneki Merge" (the live one) and "Maneki Merge Test" (debug, the dev app). In each
   game's settings (Game settings → Keys) copy the **Game key** and the **Secret key**.
3. **Send Claude** google-services.json, the web `firebaseConfig` and the four GameAnalytics keys.
   They aren't passwords (the game carries them in its files), but the repository is public, so
   they go into its secrets, not into the code. Claude sets them with `gh secret set`; or by hand
   in GitHub → the repository → Settings → Secrets and variables → Actions → New repository secret:

   | Secret                          | Value                                              |
   | ------------------------------- | -------------------------------------------------- |
   | `GOOGLE_SERVICES_JSON`          | the whole google-services.json file                |
   | `FIREBASE_WEB_CONFIG`           | the web `firebaseConfig` as JSON (Claude converts) |
   | `GAMEANALYTICS_GAME_KEY`        | "Maneki Merge"'s game key                          |
   | `GAMEANALYTICS_SECRET_KEY`      | "Maneki Merge"'s secret key                        |
   | `GAMEANALYTICS_TEST_GAME_KEY`   | "Maneki Merge Test"'s game key                     |
   | `GAMEANALYTICS_TEST_SECRET_KEY` | "Maneki Merge Test"'s secret key                   |

4. The next deploy (a push to main) puts them in the web app, the next tag in the Android app;
   then the checks in §8 (10) and the Data safety answers in §5.3.
