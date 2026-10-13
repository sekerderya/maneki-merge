# Maneki Merge on Google Play

How the game gets to Google Play, step by step, and what to type into Play Console. The technical
side (the Android project, the workflow, the asset links) is TECH_SPEC §16.

## 1. How the Play app works

- The Play app is a **Trusted Web Activity** (TWA, the owner's call on 2026-10-13, instead of the
  Capacitor wrapper M14 first planned): a small Android app (about 1 MB) that opens the live game,
  https://sekerderya.github.io/maneki-merge/, in the phone's Chrome, full screen, with no browser
  bar. It is the same game as the installed web app, running the same way.
- Package name: **`io.github.sekerderya.manekimerge`**. It can never change once the app is on
  Play.
- **Game updates need nothing on Play.** Every push to `main` deploys the site, and the Play app
  updates itself like the installed web app does (the loading screen or the menu's update badge,
  TECH_SPEC §9). A new Play release is only needed when `android/` changes (§7).
- Saves live in Chrome's storage for the site, so a player who already plays in Chrome (or has the
  web app installed) should keep their progress in the Play app.
- The very first launch needs a connection, like a first visit. After that it plays offline.
- Chrome only opens the app full screen when the site confirms the app is its own: the **Digital
  Asset Links** file (§4). Without it the app shows a browser bar at the top.

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
- prints the key's **SHA-256 fingerprint** (needed in §4).

**Back up both files** (a password manager, or a private cloud folder). If the key is ever lost,
Play Console → the app → Test and release → App integrity → App signing can reset the upload key
(it takes a few days); the app itself is never lost, because Play holds the signing key.

## 3. Building the app bundle

The **Android** workflow (`.github/workflows/android.yml`) builds the app on every push to `main`
that changes `android/`, or by hand: GitHub → Actions → Android → **Run workflow**.

When it's done, open the run and download the artifact **maneki-merge-android** (kept 30 days):

- `maneki-merge.aab`: the bundle that goes to Play.
- `maneki-merge.apk`: the same app to install directly on a phone (for a quick check; Chrome
  shows the browser bar on it until the upload key is in the asset links, §4).

The run's summary shows the upload key's fingerprint. Without the upload key secrets (§2) the
outputs are unsigned and Play refuses them.

## 4. Digital Asset Links

Android looks for the file at the root of the domain, so it lives in the owner's user-site
repository [`sekerderya/sekerderya.github.io`](https://github.com/sekerderya/sekerderya.github.io),
served at https://sekerderya.github.io/.well-known/assetlinks.json (`.nojekyll` makes Pages serve
the `.well-known` folder; the owner's other sites are not affected). Until there is a key it is an
empty list, `[]`.

It must list the SHA-256 fingerprints of both keys that sign the app:

1. **Play's app signing key**, for installs from Play: Play Console → the app → Test and release →
   App integrity → **App signing** → "App signing key certificate" → SHA-256. It exists after the
   first bundle is uploaded (§5.5).
2. **The upload key**, for the APK installed directly: printed by `npm run android:key` and in the
   Android workflow's summary.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "io.github.sekerderya.manekimerge",
      "sha256_cert_fingerprints": ["<Play app signing key SHA-256>", "<upload key SHA-256>"]
    }
  }
]
```

Fingerprints are written as Play shows them (`AB:CD:…`, 32 pairs). Pages publishes the change in a
minute; this checks what Google sees:
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://sekerderya.github.io&relation=delegate_permission/common.handle_all_urls

If the app still shows a browser bar after a fix, Chrome kept its old answer: clear the app's
storage (or reinstall it) and open it again.

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

| Section                                  | Answer                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Privacy policy                           | `https://sekerderya.github.io/maneki-merge/privacy.html` (also linked in the game's Settings)                                                                                                                                                                                                    |
| App access                               | All functionality is available without any access restrictions                                                                                                                                                                                                                                   |
| Ads                                      | No, the app does not contain ads                                                                                                                                                                                                                                                                 |
| Content rating                           | Category: Game. No violence, sexuality, bad language, drugs or alcohol. Gambling: no (coins are earned by playing; they can't be bought, won by betting or cashed out). Users can't talk to each other or share anything; no location; no digital purchases. Expect an Everyone / PEGI 3 rating. |
| Target audience                          | The owner's call. Ages 13 and over keeps the app out of the Families program (anyone can still install it). Including under 13 is possible too: the game already meets the Families rules (no ads, no data, no accounts), but reviews get stricter.                                              |
| Data safety                              | Does the app collect or share any of the required user data types? **No.** The listing then says "No data collected" and "No data shared". (The game sends nothing anywhere; GitHub's own server logs are the host's, not the app's, and the policy mentions them.)                              |
| Advertising ID                           | No, the app doesn't use it                                                                                                                                                                                                                                                                       |
| Government, financial, health, news apps | None of these                                                                                                                                                                                                                                                                                    |

### 5.4 Store listing (Grow users → Store presence → Main store listing)

- **App name:** Maneki Merge
- **Short description** and **full description:** §6.
- **App icon** (512×512 PNG): [`android/store_icon.png`](../android/store_icon.png), the app icon.
- **Feature graphic** (1024×500): the owner's art, prompt in docs/ART_ASSETS.md §4.18; Claude crops
  it to size into `docs/play-store/feature-graphic.png`.
- **Phone screenshots** (1080×1920, in this order):
  [1](play-store/screenshots/1-play.jpg), [2](play-store/screenshots/2-combo.jpg),
  [3](play-store/screenshots/3-new-jar.jpg), [4](play-store/screenshots/4-blessing.jpg),
  [5](play-store/screenshots/5-upgrades.jpg), [6](play-store/screenshots/6-menu.jpg)
  (`docs/play-store/screenshots/`, taken from the game on a GPU at 360×640, 3×).
- Tablet screenshots are optional; skip them.
- **Store settings:** category **Games → Puzzle** (or Casual); contact email (required, shown on
  the page); website `https://sekerderya.github.io/maneki-merge/`.

### 5.5 Releases

1. **Internal testing** (Test and release → Testing → Internal testing): create a release, accept
   **Play App Signing** with a Google-generated key, upload `maneki-merge.aab`, release name `1.0.0`.
   Add your own Google account as a tester and install from the opt-in link.
2. Copy Play's app signing fingerprint into the asset links (§4), wait a minute, reopen the app:
   no browser bar. Go through §8 on the phone.
3. **Closed testing** with 12+ testers for 14 days (personal accounts, §5.1). The same bundle can
   be promoted from internal testing.
4. **Production**: apply for access, then create the production release (countries: all), roll
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
• Plays offline once it has started the first time
• No ads, no in-app purchases, no accounts
• No tracking: your progress stays on your phone
• Soft pastel shrine-garden art, gentle sounds and haptics
• Portrait, one hand, short runs or long ones
```

## 7. Updating the Android app

- **The game:** nothing to do on Play; a deploy reaches the Play app.
- **A new Play release** is needed when `android/` changes: raise `versionCode` (and
  `versionName`) in `android/app/build.gradle` and the same numbers (`appVersionCode`,
  `appVersion`) in `android/twa-manifest.json`, push, download the new bundle and upload it as a
  new release. Play refuses a `versionCode` it has seen.
- **Every year** Google raises the required target API level (new apps and updates must target the
  Android version of the year before, from 31 August; in 2026: API 36). Until the deadline nothing
  breaks; after it an update can't be published until `android/` targets the new level (TECH_SPEC
  §16).

## 8. Checks on the phone (the internal testing install)

- It opens full screen from the **Maneki** icon, with no browser bar (else §4), no black band at
  the top where the camera is, and no Install button on the menu.
- Progress from Chrome is there (when Chrome is the phone's browser).
- The back button: game → pause → menu → leaves the app.
- Sound, vibration, portrait only.
- After one launch, airplane mode: the game still starts and plays.
- Settings → **Privacy policy** opens the policy.
- After the next deploy, the update arrives as in the installed web app.
- The old installed web app and the Play app can live side by side (two icons); remove the web app
  if two icons are confusing.
