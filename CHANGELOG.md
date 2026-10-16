# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.56.2] - 2026-10-16

### Changed

- **A rounder frog**, the owner's second sheet (docs/ART_ASSETS.md §4.22): the same frog and four faces, its body less wide at the bottom, so it sits better on its round physics body as it rolls.

## [0.56.1] - 2026-10-16

### Changed

- **Frogs eat only cats of sizes 1–2** (GAME_DESIGN §15.17), the owner's pick: with every Frog pick, frogs ate faster than the paw dropped and emptied the jar of the small cats the big ones are made from, so runs stalled (the smart bot: 0 of 30 runs cleared three stages, all 30 out of time). Of four limits measured (one frog at a time, sizes 1–2, a cat with no partner of its size, a meal every second drop), only sizes 1–2 never stalls: with every pick 14 cleared, 0 out of time, 16 lost. A jar with no small landed cat feeds a frog nothing and costs no meal. The cards say "a small cat".

## [0.56.0] - 2026-10-16

The Frog, the second weapon (GAME_DESIGN §15.17; the owner's design, docs/plans/weapons-and-passives.md §3.4): a frog that sits in the jar and, each time a ball leaves the paw, swallows the smallest cat with its tongue.

### Added

- **The frog:** a size-3 ball, dropped from the paw like the others. In the jar it rolls like any ball (the owner's call), never merges and never counts for the danger line, so it never ends a run. Each time a ball leaves the paw (not its own drop), its tongue swallows the jar's smallest landed cat, the nearest between cats of one size, and the cat pops into its value (coins, no score, no combo). After 5 meals it falls asleep and goes; a stage clear takes it too. A jar with no landed cat feeds it nothing and costs no meal.
- **Its picks** (blessings): **Frog** (frogs start to come, 2.25%), then, once it is taken, **Quick Frog** (+2.25%, two levels), **Long Stay** (+2 meals, two levels: 5, 7, 9) and **Big Gulp** (two cats at each meal).
- **Its shop card** among the blessings, after the Katana's: it opens at stage 13, and each of its four levels opens one of its picks for every run (Frog 22K, Quick Frog 35K, Long Stay 55K, Big Gulp 80K). Until a profile buys the first, every run plays as before.
- **The owner's art:** the frog's four poses (calm in the paw, in NEXT, on its cards and at rest; mouth open; gulping; asleep) and its tongue. The tongue shoots from the mouth (which turns with the rolling frog) to the cat in 0.11 s and pulls it back in 0.17 s, the cat's own picture riding in on its tip; the frog gulps, and after its last meal sleeps a moment and shrinks away in a puff of sparks. New sounds: a wet snap and gulp for the tongue, two soft croaks as it goes.
- Debug panel: a Frog button; `window.__game.give('frog')`.

### Decisions taken for the owner

- A meal counts once whatever it swallowed (Big Gulp's two cats are one meal), and only a meal that swallowed something counts.
- A cat still falling from the paw isn't in the jar yet, so the frog never eats the ball just dropped; the tongue reaches through anything in the way.
- The magnet can take a frog; it keeps its meals left.
- The frog's mouth is drawn a fifth of its radius above its centre, turning with it; the payout shows where the cat was.
- The Frog's cards show the calm frog until the family's pictures come.

### Measured

- The smart bot, 30 seeds of three stages from a fresh profile (cleared / out of time / lost): no picks 13 / 0 / 17; Frog 19 / 0 / 11; with Quick Frog 2 14 / 11 / 5; with Long Stay 2 17 / 0 / 13; with Big Gulp 15 / 3 / 12; with all of them 0 / 30 / 0. Frogs that eat faster than the paw drops empty the jar of the small cats, so runs stall without ending: how to keep the eating below the dropping is the owner's call (GAME_DESIGN §15.17).

### Known issues

- The frog sheet in the game is the first generation, pear-shaped; the owner's rounder sheet replaces it with `npm run art` (docs/ART_ASSETS.md §4.22).

### Technical

- Headless: ball and drop kind `frog` (its meals left in `hitsLeft` / `hits`, like a boulder's bands, so a saved run and the magnet keep them), `physics/frog.ts` (`frogMeal`), `RunController.feedFrogs` at every drop after the curse's count, events `frogSwallowed` and `frogLeft`, reason `frog` on `catPopped`, kind `frog` on `specialPopped`; `countsForDanger` and `luckySaveVictims` skip frogs. The frog is rolled last, after the katana, so every seed's other drops stay where they were.
- Picks and shop: `FROG_*` in `config/picks.ts`, `frogChance`, `frogMeals`, `frogBites` in `core/picks.ts`, `WEAPON_CARD_OPENS.frog`.
- Art: `tools/buildFrog.ts` (the 2×2 sheet through `artBall.ts`, the tongue's band sliced from its even middle and its tip), `config/frogSprites.ts`, `SpecialSkin.frog(size, pose)`, `BallRenderer.setFrogPose`, `game/fx/FrogFx.ts` (stand-ins without the art).
- Tests: `frog.test.ts` (14) and the picks, shop, upgrades, config and clips tests for the new picks and card. The bot drops a frog low and out of the way and takes the Frog's picks after the Katana's.

## [0.55.6] - 2026-10-16

### Changed

- **Wide Blade's card shows its own picture**, the owner's art (the owner's pick of two): the red katana ball with one broad, heavy katana standing on it and a gold arrow on each side (docs/ART_ASSETS.md §4.21, picture 10). Every Katana card now shows the katana ball: the plain ball for the Katana, the ball with an hourglass, with three katanas or with a broad blade for its upgrades. The icon-kit icons of v0.55.0 are no longer shown or preloaded.

## [0.55.5] - 2026-10-16

### Changed

- **More Blades' card shows its own picture**, the owner's art: the red katana ball with three crossed katanas on it (one straight down, two in an X) instead of its one (docs/ART_ASSETS.md §4.21, picture 9). Only Wide Blade still shows its icon until its picture comes.

### Technical

- A pick's own picture replaces its icon-kit icon (`iconSprite` returns null for it), and icons that no card shows any more (the Katana's and More Blades') are no longer preloaded.

## [0.55.4] - 2026-10-16

### Changed

- **Quick Katana's card shows its own picture**, the owner's art: the red katana ball with a small wooden hourglass of gold sand (docs/ART_ASSETS.md §4.21, picture 8). It is the first of the Katana family's pictures: every Katana pick shows the ball with one small addition, like the boulder and curse families; More Blades and Wide Blade keep their icons until theirs come.

## [0.55.3] - 2026-10-16

### Changed

- **No Weapons section in the Upgrades screen** (the owner's call): the Katana's card is the last of the blessings, with the red katana ball as its icon, like the other special balls. Its levels still open its picks one by one.
- **The Katana and Quick Katana pick cards show the red katana ball**; More Blades and Wide Blade keep their icons.

## [0.55.2] - 2026-10-16

### Added

- **The katana's ball is the owner's art**: crimson lacquer with gold waves and the katana across it, in the paw and in NEXT (docs/ART_ASSETS.md §4.21, image 7).

## [0.55.1] - 2026-10-16

### Changed

- **The katana is a ball in the paw and in NEXT**, like the other special balls (the owner's call); dropped, the sword shoots out of it and falls as before. Until the owner's picture of the ball comes (docs/ART_ASSETS.md §4.21, image 7) it is a cream ball with a sword across it. It is now size 2 like the others (size 1 before).

## [0.55.0] - 2026-10-16

The Katana, the first weapon (GAME_DESIGN §15.16; the owner's design, docs/plans/weapons-and-passives.md §3.1): dropped from the paw it falls straight down through everything and cuts every small cat in its line into coins. Its upgrades are picks of their own, and a new Weapons section of the shop opens them one by one.

### Added

- **The katana:** it hangs from the paw point down, its aim guide the cut itself, straight to the floor. Dropped, it shoots down in 0.24 s, cutting each cat of sizes 1–4 in its line as the point reaches it: the cat splits in two along the cut and pops into its value (coins, no score, no combo). It breaks every boulder it crosses at once, whatever its bands; big cats, hanabi, jokers and lightning balls let it through. Wind and Heavy Drop don't touch it. Then it sticks in the floor a moment and fades.
- **Its picks** (blessings): **Katana** (katanas start to come, 2.25%), then, once it is taken, **Quick Katana** (+2.25%, two levels), **Wide Blade** (a wider cut, two levels) and **More Blades** (a diagonal from the top corner on the aim's side, the other diagonal for an X, then one straight across). Two of them can show on one pick.
- **Weapons in the shop:** the Katana's card opens at stage 10; each of its four levels opens one of its picks for every run (Katana 20K, Quick Katana 32K, Wide Blade 50K, More Blades 75K). Until a profile buys the first, every run plays as before.
- **The owner's art:** the katana (in the paw, falling, in NEXT), its streaks of light, the cut flash, glint, sparks, swoosh and the strike on the floor, and the Katana, More Blades and Wide Blade icons. New sounds: a steel "shing" as it leaves the paw, a slice per cut.
- Debug panel: a Katana button; `window.__game.give('katana')` and `state().katana`.

### Decisions taken for the owner

- The cut reaches a cat whose body the blade crosses, give or take 8 world units (Wide Blade 33 and 58), and a cat that rolls into the line before the point passes is cut too.
- The blade across the jar (More Blades 3) runs through the middle of the jar from the aim's side; aimed exactly at the middle counts as the right.
- A cut cat's halves are its own art cropped down the middle: the picture turns up to 45° to lie along the cut as it splits, under the flash.
- The katana counts as a drop for the curse's bell and the cooldown, and a queued one becomes a cat at a stage clear, like a hanabi.
- Quick Katana's card shows the Katana's icon (the owner's call); the Katana's card has no clip yet.

### Measured

- The smart bot, 30 seeds of three stages from a fresh profile (cleared / lost): no picks 13 / 17; Katana 11 / 19; with Quick Katana 2 23 / 7; with Wide Blade 2 16 / 14; with More Blades 3 16 / 14; with all of them 25 / 5, against Hanabi 5 23 / 7 and Lightning 5 26 / 4 (GAME_DESIGN §15.16).

### Technical

- Headless: `physics/katana.ts` (`katanaBlades`, `katanaCuts`), `RunController`'s fall (`katana` view, `dropKatana`, `cutKatana`, saved as `katana` in a run snapshot), events `katanaDropped`, `katanaCut`, `katanaLanded`, reason `katana` on `catPopped` / `boulderBroken`. The katana is rolled last, so every seed's other drops stay where they were.
- Shop: section `weapon`, `WEAPON_CARD_OPENS`, `DerivedStats.pickCaps` (blessing caps plus the weapon's).
- Art: `tools/buildKatana.ts` (the sword's two ends; the sheets through Lightning's helpers), `config/katanaSprites.ts`, `game/fx/KatanaFx.ts` and `katanaFrames.ts` (stand-ins without the art); the icon kit's aliases (`quickKatana` → `katana`).
- Tests: `katana.test.ts` (14) and the picks, shop, upgrades, clips and icons tests for the new picks and card. The bot aims a katana down the line that cuts the most.

## [0.54.0] - 2026-10-15

The rewarded ads in play (GAME_DESIGN §2.7, the owner's choices): a bonus ball once per stage, one more Lucky Save once per run, the run's coins doubled at Game Over. Only in the Google Play app and only while an ad is ready; offline, on the web and in a scene none of it shows.

### Added

- **The bonus ball:** from a stage's 8th drop, once per stage, NEXT's bubble shows mirrored on the left under the score card, tagged "Bonus", with a hanabi, a joker cat, a lightning ball or a magnet (rolled per stage from the run's seed) and the play medallion. A tap holds time and asks ("A free Joker cat!", Watch ad / Not now). After the ad the ball goes **straight into the paw** (the owner's call): the cat that was there waits and comes back after it, and NEXT stays as it was. Not now or an ad closed early gives nothing and leaves the bubble for the rest of the stage.
- **One more Lucky Save:** when the danger timer runs out with no Lucky Save left, once per run, time stops and "Out of room!" asks; after the ad it is a Lucky Save like the upgrade's, otherwise the run ends.
- **Double coins** at Game Over: a gold pill under the stats when the run earned coins; after the ad the run's coins are paid once more and the number doubles.
- All three work with `?ads=fake` on the web too, for testing.

### Decisions taken for the owner

- The cat displaced by the bonus ball isn't lost: it waits and comes back after the ball.
- A bonus ball still in the paw when the stage clears comes after the new stage's first drop (an empty jar has nothing for a magnet, a hanabi or a lightning ball).
- Every ad starts from a card or a pill that says what it gives; a tap on the bubble alone never starts an ad (it sits where a finger may start aiming).
- The bubble shows from the stage's 8th drop; the balls are the four helpful ones. Both in `config/ads.ts`, to tune by playing.
- No new art: NEXT's bubble, the pause card, the PLAY and Buy pills and the icon kit's play medallion.

### Technical

- Headless rules: `RunController.adBall` / `giveAdBall()` (`core/bonusBall.ts` rolls the ball on a generator of its own), `DropQueue.cutIn` and its `held` slot, the run state `lastChance` with `setLastChanceReady`, `takeLastChance` and `declineLastChance`. Saved runs keep `adBallStage`, `lastChanceUsed` and the queue's held ball only when there are any, so other saves are unchanged and the simulator plays as before.
- `GameSession` shows the options from `RewardedAds.ready`; `ui/overlays/adOfferOverlay.ts` is the card; `HudView.setBonus`, `GameOverView.setDoubleCoins`.
- Tests: `adRewards.test.ts` (13), the queue's cut-in (5), `adRewards.spec.ts` (3 flows with the fake ad).

## [0.53.0] - 2026-10-15

The Google Play app on Capacitor, ready for AdMob (M15, docs/plans/capacitor-admob.md; the owner's request): the game is inside the app and plays fully offline, and Google's ad SDK is in it with test ads, the consent form, an online check and an ad service the game can call. Where the ads show comes with the next plan. The web app is unchanged and has no ads.

### Added

- **The Android app is a Capacitor app** (replacing the Trusted Web Activity, which never reached Play): the same package, `io.github.sekerderya.manekimerge`, and upload key; the game's own files inside it, so it **opens and plays in airplane mode from the first launch**. Full screen with the bars hidden (a swipe shows them for a moment), into the camera cutout, portrait only, the cream splash with the cat, the back button (game → pause → menu → leaves the app), vibration. The app's version is the game's (0.53.0, version code 53000).
- **Maneki Dev**, the dev app: every build also makes it. It installs beside the Play app with its own save, starts with the debug panel and fake ads, and only ever shows Google's test ads.
- **Rewarded ads, ready for the game** (`platform/ads.ts`): `ready(placement)`, `show(placement)` → rewarded, closed or failed, for the three placements to come (`specialBall`, `luckySave`, `doubleCoins`, an ad unit each). In the app AdMob keeps one ad loaded per unit, retries a failed load (30 s, 1 min, 2 min, then every 5 min; at once when the connection returns) and replaces an ad before AdMob's hour runs out. **Offline no ad is ever ready**, even one already loaded. A reward counts only when AdMob sends it, not when the player closes the ad early.
- **Consent**: in the EEA, the UK and Switzerland the app shows Google's consent form at launch, after the loading screen and before the menu (never over a run); Settings gets **Privacy options** there to change the answer.
- **`?ads=fake`**: a test ad drawn by the page (a 5 s countdown, then Get reward; Close ends it early), in any build, to build and test the ad flows on a desktop. `?ads=admob` and `?consent=eea` for the app.
- **The debug panel's Ads group**: the connection, the consent answer, each placement's ad and the last test ad's result; a test ad per placement; fake or AdMob test ads; the EEA consent test and its reset; the dev app's test device ID to copy. The panel now scrolls when it is taller than the screen.
- The privacy policy has a section for the app's ads (Google AdMob, only online, the consent form); the web app keeps "no ads, no data".

### Changed

- **Game updates reach the Play app with a Play release**: a push to `main` updates the web app; every release tag builds the app's bundle, APK and dev APK (the Android workflow), and the owner uploads the bundle.
- Saves don't come over from the Chrome web app (the app has its own storage; nobody plays it yet).
- docs/PLAY_STORE.md: the Capacitor app, "Ads: yes", the Data safety answers for AdMob, audience 13 and over, the store text without "No ads", the phone checks, and the owner's AdMob steps.

### Decisions taken for the owner

- Web and iOS stay ad-free; only the Android app has ads. Same package name and upload key. The version code follows the game's version. No service worker in the app. Google's test IDs until the owner's AdMob account exists. One ad unit per placement. Audience 13 and over, ads rated PG, not child-directed. (The plan's decisions, §3.)
- The dev app is recognised by its application ID (`….dev`) instead of a second web build with a define: one web build serves both APKs.
- The back button needs `@capacitor/app`'s listener: without one Capacitor does nothing at the WebView's first page, so the menu could never leave the app.
- The splash stays until the page has loaded (at most 2 s), not until its first paint: the splash holds back the WebView's drawing, so a first paint would never come.
- The safe areas use Capacitor's `native` insets: WebView 140+ hands the real values to the existing `env(safe-area-inset-*)` CSS, so `tokens.css` is unchanged.
- The consent check waits at most 3 s from boot (it runs beside the loading screen). After an offline launch it is asked when the connection comes, without the form.
- The dev app reads its own test device ID (a small native plugin), so the EEA consent test works on the owner's phone and the ID can be copied for the release app.
- The launcher says "Maneki", as the TWA did; the app's name is Maneki Merge.

### Technical

- `capacitor.config.ts` (origin `https://localhost`, never to change: it holds the saves), `npm run build:android` (`vite build --mode android`: base `/`, `dist-android/`, no PWA plugin, `__NATIVE_APP__`; then `cap sync`). Capacitor and AdMob code is only in `platform/native/`, a separate chunk the web build never loads; the web bundle has no Capacitor or AdMob code.
- `platform/network.ts` (`@capacitor/network` in the app, `navigator.onLine` on the web), `config/ads.ts`, `core/urlFlags.ts` `bootFlags` (the page's flags, the debug panel's stored choices, the dev app's), `ui/overlays/fakeAd.ts`.
- The Android project: `MainActivity` (immersive, the cutout, the splash), `DevicePlugin`, the version from `package.json`, the `.dev` build type, light themes, the manifest. `npm run icons` writes the launcher icons and Play's store icon (and runs again on its own: until now `npm run icons` did nothing, only `npm run art` built the icons).
- `android.yml`: on every `v*` tag, Node + `npm run build:android`, Java 21, the bundle, APK and dev APK, all signed with the upload key.
- Tests: `ads.test.ts` (a fake AdMob and clock: consent and its form after the loading, the 3 s limit, offline launches, the SDK start and its retry, one load per unit, the retries, offline, the 55-minute expiry, Rewarded against a plain Dismissed, Privacy options; FakeAds, NoAds), `network.test.ts`, the boot flags, the install context; `ads.spec.ts` (the fake ad's closed and rewarded, none ready offline, no ads on the web, no pause overlay after an ad). The `android` build was booted in a desktop browser through the plugins' web stand-ins: no service worker, no request off its own origin, a run played.
- Not checked on a phone yet: everything native (docs/PLAY_STORE.md §8).

## [0.52.0] - 2026-10-15

The first stage's help (the owner's idea, GAME_DESIGN §8): stage 1 goes a little quicker, without it showing.

### Added

- **During stage 1, the cat that comes into NEXT leans towards the sizes the jar is waiting for**: the cats of sizes 1–4 on top of the jar that a cat of their size, dropped straight above, would land on, once the cats still on their way (falling, just dropped, in the paw) have each taken such a partner or begun to wait for one. Each wanted size comes three times as often as its weight says (`MATCH_HELP_FACTOR`). Nothing shows it: two or three of the four sizes are usually wanted, so the drops only shift from 40/30/20/10% to about 33/32/23/12%. The smart bot from a fresh profile clears stage 1 in 82% of runs instead of 69%, in 102 s instead of 117 s (127 drops instead of 145; 200 seeds). From stage 2 on the queue rolls as before.

### Technical

- `physics/reach.ts` finds the cats on top of the jar and the wanted sizes; `DropQueue.take` takes them and still draws once, so the rolls after it stay the seed's. Without counting the cats still on their way, the same help did nothing measurable.
- The meta bot (`npm run sim -- --meta 30 --seeds 24`, GAME_DESIGN §14): stage 5 within 15 / 30 minutes 2 / 8 of 24 players → 3 / 10 (the smart bot alone, its first run still ending around stage 2–3) and 6 / 16 → 9 / 17 with one extra Lucky Save (the median player there after 18.2 minutes instead of 23.4).
- The v0.33.5 legacy prints were re-recorded (its run drops a few cats in stage 1 before it jumps to stage 2), and one Copycat test now plays at stage 2, past the help.

## [0.51.0] - 2026-10-15

Sunset and night (the owner's idea, like Pokémon GO's map; GAME_DESIGN §7.3): the gardens follow the phone's clock.

### Added

- **Every jar's garden at sunset and at night**, the owner's edits of the five day pictures (docs/ART_ASSETS.md phase 19): a dusty-rose sky and warm low light with the lanterns just lit; a deep indigo sky with a full moon, a few stars and every lantern glowing (on the peak the sun becomes the moon). The sunset shows from an hour before the sun sets to half an hour after, then night until sunrise. The sun's times come from the date (41° N, the sun highest at 13:00: Turkey's clock), with no location asked for: 19:00 is night in winter and day in summer.
- **Never in the middle of a jar**: the time is picked as a run starts or comes back and each time the jar grows, behind the growth clouds. The menu picks it each time it shows.
- **Day and night** in Settings (a crescent moon, on by default; a save without it has it on): off, the gardens stay in the day.
- `?time=day|sunset|night` pins a time of day; the clip recorder pins the day.

### Changed

- **The menu shows the first jar's garden** (the owner's call), at the time of day: its own garden with the stone path is gone (`public/assets/menu/background.webp` removed). The loading screen shows the day garden and fades into the menu's.
- **The loading screen loads only the clock's time's gardens**; the other times' load when they are picked (the service worker still keeps them all for offline).

### Technical

- The image tool hands an edit back zoomed in by 1–3% (the peak's night at 937 × 1679). The art pipeline converts the pictures as they are (no resampling, no quality lost) and measures each one's fit onto its day picture from the outlines (`tools/backgroundFit.ts`); the game places it by that fit, so the jar's feet stay on the rug. Checked at 390 × 844 for all ten (`docs/screenshots/v0.51.0/`).

## [0.50.3] - 2026-10-15

### Changed

- **The goal's ring no longer breathes** (the owner's call): it stays still when the stage has its first size-8 cat (GAME_DESIGN §2.3).

### Fixed

- **Less drawing behind the HUD** (the owner's report: better since v0.50.2 but still not as smooth as before today's updates; TECH_SPEC §13). The goal strip shared the HUD's layer, so every repaint of the coins card (about 10 a second while coins land), the score or NEXT drew the strip's nine outlined cats again: the HUD's raster work doubled against v0.47.3. The goal strip and the coins card now have layers of their own, and that work is now below v0.47.3's (software raster: 15–39 ms a second with v0.47.3, 48–57 with v0.50.2, 6–10 now). Nothing looks different.

## [0.50.2] - 2026-10-15

### Fixed

- **Stutter in the second half of every stage** (the owner's report: the game started stuttering after the last updates; TECH_SPEC §13). Since v0.48 the goal's ring breathed from the stage's first size-8 cat until its clear, and a CSS animation that keeps running makes the browser restyle the page in every frame the game draws: about 10% more main-thread work, and on a slow CPU 6–15% fewer frames (v0.47.3 against v0.50.1, production builds, CPU throttled 14×). The ring now breathes three times when the first 8 is made and rests (GAME_DESIGN §2.3). Without an 8 the goal strip cost nothing measurable.
- **A goal cat's pop no longer lays the page out mid-frame**: it started by reading `offsetWidth` inside the physics step that made the new size; it now just adds its class (the pop looks the same).

## [0.50.1] - 2026-10-15

### Added

- **Account reset** (the owner's request; GAME_DESIGN §2.4): exactly five quick taps on the version in Settings, then a 1.5 s pause, start the save over as a new player's (no coins, best stage 1, every card and hint unseen, the saved run dropped) and reload the app. No confirmation. The Scenes button stays as the device has it. Seven taps are still the tester reset: it fires on the seventh tap, so the five-tap reset only runs when the taps stop at five.

## [0.50.0] - 2026-10-15

The teaching order (the owner's schedule; GAME_DESIGN §15.5): the first ten clears bring the hazards in one at a time, each shown on a card as a stage opens and offered as a trial only from that stage's clear, so a player is never asked to pick a trial about something they haven't been shown.

### Changed

- **The picks of the first ten clears** follow a table (`TEACHING_CLEARS` in `src/config/picks.ts`; `LATE_CLEARS_FROM` = 11 replaces `FIRST_TRIAL_CLEAR`): 1 blessing → Boulders card; 2 a boulder trial + blessing; 3 blessing → Cursed Bell card; 4 a boulder or curse trial + blessing; 5 rule + blessing; 6 blessing → Wind card; 7 a boulder, curse or wind trial + blessing; 8 blessing → Porcelain card; 9 any trial + blessing; 10 rule + blessing. From stage 11 the picks are as before. Follow-ups still need Cursed Bell; fewer than three open trials show fewer cards, none skips the pick. Before stage 10 a run now meets 4 trials instead of 8. The debug panel's Picks and Rule pick open the picks as after stage 10.
- **The boulders' card** now holds time as stage 2 opens, like the new cards, instead of holding the blessing back; a run saved under it comes back to it (under the pause).

### Added

- **Cursed Bell, Wind and Porcelain cards** as stages 4, 7 and 9 open: the boulders' card's popup with the mechanic's clip (the Wind's blows the run's way), one line saying what it does and that a trial can bring it, and Got it.
- **A card for each rule** the first time a profile takes it, as the next stage opens: its name, clip and line. Its hint pill shows only when no card does.
- Every card shows once per profile (new first-run hints, no save version step: a v0.49 save sees each new card once); "How to play" and the tester reset bring them back; never in a scene or on a debug jump. Time is held from the moment the stage opens until the last card closes; only Got it (after 0.4 s) or the back button closes one.
- **Lucky gift**: a clear whose blessing pick has nothing open (a fresh profile can take only two blessing levels in a run) has no pick; a "Lucky gift!" banner pays the cleared stage's last cat's pop value again (`LUCKY_GIFT_FACTOR` = 1) as run coins, which fly to the counter with the coin sound. It shows as the next stage opens; a card that comes with it waits 1.4 s.

### Balance

Measured with the meta bot before (v0.49.0) and after, 24 players each (bots compare versions, they don't predict people):

|                                                               |      v0.49.0 |         v0.50.0 |
| ------------------------------------------------------------- | -----------: | --------------: |
| Stage 5 within 15 / 30 min, weak bot (`--meta 30 --seeds 24`) |  1 / 9 of 24 |     2 / 8 of 24 |
| Stage 5 within 15 / 30 min, better player (`--extra-saves 1`) | 9 / 17 of 24 |    6 / 16 of 24 |
| Maxed profile, stage reached (median of 60, `--upgrades max`) |            8 |               7 |
| Every card bought (`--meta 720`, median)                      |      575 min | 576 min (+0.2%) |

The gift keeps the pace well inside the 10% the owner allowed, so `LUCKY_GIFT_FACTOR` stays 1. No other number changed.

## [0.49.0] - 2026-10-15

The first clear and the boulders' card (the owner's request; GAME_DESIGN §15.3, §15.5).

### Changed

- **Stage 1's clear offers only a blessing**, no trial: a new player's first jar ends with a gift. From stage 2's clear on, a trial (or a rule where the jar grows) and a blessing as before. The debug panel's Picks still opens a trial and a blessing.

### Added

- **The boulders' card**: boulders come from stage 2, so when the doors fold open after stage 1's blessing, a card shows over the empty jar before stage 2 starts: "Boulders" in the title lettering, a new clip (`boulderIntro`: a boulder dropped from the paw lands beside a 2, then a 2 dropped onto it merges right beside the boulder and breaks it), one line on what a boulder is and how it breaks, and a small **Got it** button (the coral PLAY pill). It shows once per profile ("How to play" brings it back, as does the tester reset), never in a scene. Only Got it or the back button closes it (it ignores taps for its first 0.4 s); time stays stopped under it, and the blessing applies as it closes.

## [0.48.0] - 2026-10-15

The goal strip (the owner's playtest: the goal, the cats' order and the progress couldn't be seen; GAME_DESIGN §2.3).

### Added

- **The goal strip** along the top of the play screen, left of the pause button, after the owner's approved mockup (`art-source/ui/goal-strip-mockup.webp`): a cream card like the coins card, the menu's torii with the stage number between its posts, the stage's cats 1 to 8 in order, and its last cat, the goal, in a round slot with a flat gold ring. Every cat shows in full colour; the ones the stage hasn't had in its jar yet are pale, and a cat lights up with a small pop the first time the stage gets one (dropped or merged). Once a size 8 is made, the goal's ring breathes: one cat to go. Reduced motion keeps both still.
- `run.stageBestSize` and the `stageBestChanged` event: the biggest cat size the stage has had. It never goes down within a stage and starts over at the next one. A saved run keeps it; a run saved by an older version takes the biggest cat in its jar.

### Changed

- The stage words at the top ("STAGE 2") are gone: the strip's number shows the stage.

### Notes

- The goal's slot is CSS for now; its image (docs/ART_ASSETS.md §4.19, prompt 3) can replace it. The silhouettes for cats not made yet were turned down, and there is no progress bar (both the owner's calls).

## [0.47.3] - 2026-10-14

### Removed

- **The background music is gone** (the owner's call): v0.47.0–v0.47.2 are reverted in full. No music file, no Music switch in Settings or Pause (the Pause switches show "Sound" and "Haptics" again), sound effects off silences everything again, and the docs read as they did in v0.46.3. A save written by v0.47 keeps working: its music setting is simply dropped.

## [0.47.2] - 2026-10-14

### Changed

- **Much quieter music** (the owner's call: v0.47.1's was still far too loud; GAME_DESIGN §12): its gain went from 0.12 to 0.04, another 9.5 dB lower (17.5 dB under v0.47.0), so its peaks sit about 28–33 dB under a merge's.

## [0.47.1] - 2026-10-14

### Changed

- **Quieter music** (the owner's call: v0.47.0's was far too loud; GAME_DESIGN §12): its gain went from 0.3 to 0.12, 8 dB lower, so its peaks sit about 18–23 dB under a merge's.

## [0.47.0] - 2026-10-14

### Added

- **Background music** (the owner's request: a light koto or shamisen loop; GAME_DESIGN §12). Of the owner's four tracks, the calm koto one (track 3: about 115 BPM, koto plucks over soft pads and a soft bass) fits a long merge session best: tracks 1 and 2 are fast (about 167 BPM) and bass-heavy, track 4 is sparse and only loops every 35 s. It plays a 12 s intro once, then repeats an 85.6 s section the song itself repeats, so the jump back is seamless (the two sides correlate at 0.91 over 5 s; a 150 ms crossfade at the seam). It plays from the first tap on, on the menu and in runs, fades in over 2.5 s, and sits 10–15 dB under the sound effects. The file is 1.6 MB and precached, so it plays offline (TECH_SPEC §10).
- **A Music switch** in Settings ("A gentle koto tune") and in Pause, on by default; an older save gets it on without a migration. Switching it off fades the music out; switching it back on goes on where it was. Sound effects off no longer silences the music.

### Changed

- **The Pause switches show their icon only** (a speaker, two notes, a phone): three labelled pills didn't fit side by side.

## [0.46.3] - 2026-10-14

### Changed

- **The sounds are back to v0.45.1's** (the owner's call): v0.46.0–v0.46.2 are reverted in full. The soft set, its reverb, the bubble-only merge, the debug Sounds board and `?sfx=` are gone; every sound plays as it did before, a merge rings the coin notes again, and the docs read as they did in v0.45.1.

## [0.46.2] - 2026-10-14

### Changed

- **A merge is just the bubble now** (the owner's call; GAME_DESIGN §12): every merge used to play the coin's two high music-box notes right after the bubble; it no longer does (in both sound sets). The soft bubble also lost the tiny noise click on its start. The cats popped at a stage clear still ring the coin notes.

## [0.46.1] - 2026-10-14

### Fixed

- **No more echo on the sounds** (the owner's report: every sound rang "as if in a cave"; GAME_DESIGN §12): the soft set's room reverb is gone, from the engine and the config. The sounds keep their own short natural decay; their loudness barely moved (the reverb only fed the tails), so the volumes stay as they were.

## [0.46.0] - 2026-10-14

### Changed

- **Softer, sweeter sound effects** (the owner's request: the old ones were "ringing, like an Atari game"; GAME_DESIGN §12). A new soft set is now the default: every sound is built from sine tones (no square, saw or bright triangle tones), with gentler attacks and a lower register. Merges are rising water-drop bubbles, coins two little music-box notes, combos kalimba plucks, the chimes glass wind bells, the danger countdown a wooden knock, and a short room reverb rounds everything off. The tiny high "ching" partials are gone; offline, the share of energy above 2 kHz fell sharply (the coin from 75% to 36%, the porcelain shatter from 94% to 26%), and each sound's loudness was matched to sit 0–2 dB under the old one. Twelve merges, a Jackpot and an expansion at once still peak at about half of full scale.

### Added

- **A sound board for choosing sounds by ear** (`?debug=1` → DBG → **Sounds**): every sound in the game with an **Old** and a **New** button and when it plays (merges play sizes 2, 5 and 9; combos ×2 to ×7; the danger tick 3, 2, 1), and a switch for the set the game plays until the page reloads. `?sfx=classic` plays the old set for a whole session.

## [0.45.1] - 2026-10-14

### Changed

- **The tester reset opens every upgrade** (the owner's request; GAME_DESIGN §2.4): seven taps on the version now also start the save at best stage 20, past every card's stage gate (the highest is 8), so nothing in Upgrades waits for a stage.

## [0.45.0] - 2026-10-14

### Changed

- **Seven quick taps on the version in Settings are now the tester reset** (the owner's request; GAME_DESIGN §2.4): the save starts over at once with 1,000,000 coins in the wallet (records, upgrades, stats, settings, hints and the saved run go back to a fresh start), the menu's Scenes button turns on, and the app reloads. There is no confirmation. The taps no longer turn the Scenes button off; `?scenes=0` still does.

## [0.44.1] - 2026-10-14

### Fixed

- **The Scenes list scrolls on a phone** (the owner's report): a finger couldn't scroll it, because the game blocks touch scrolling everywhere but in lists marked scrollable, and this one wasn't (a mouse wheel scrolled it, so it slipped through). A test now swipes it with real touch events.

## [0.44.0] - 2026-10-14

### Added

- **Scenes for the owner's publisher clips** (the owner's request; GAME_DESIGN §2.6). A hidden Scenes panel on the main menu plays 18 runs, each set up for one of the game's big moments: two for each special ball (lightning, hanabi, joker, golden cat, magnet), two for Lucky Save and two each for the Hubris, Heavy Drop and Dice rules. The jar is set up and settled at the scene's stage, the right ball waits in the paw, and the player drops one or two balls to set the moment off: a lightning bolt breaking every boulder so the 8s meet, a full jar caving in after six 3s pop, a Lucky Save that sets off a chain to the last cat, two Hubris threes in a row, a fireball knocking an 8 into the other, a lucky die. Four of them end in the shrine growing. Nothing plays by itself.
  - The button shows only on a device that turned it on: `?scenes=1` in the address, or seven quick taps on the version in Settings (`?scenes=0` or seven more taps hide it).
  - A scene is a sandbox: its coins, records and stats never reach the profile, it is never saved, and it shows no first-run hints. Game Over's Play Again and the pause's new **Restart scene** set it up again for another take.
  - Every scene was tuned headless; a test plays its moment from several drop points and checks its jar holds still until the first drop.

### Fixed

- Opening the game from a panel in the same tap (a Scenes row) no longer leaves the back button one step off: the game's history entry waits for the panel's to go, so Quit to Menu no longer left the app.

## [0.43.0] - 2026-10-13

### Added

- **The Google Play app, ready to publish** (the owner's request; docs/PLAY_STORE.md, TECH_SPEC §16). The owner chose a Trusted Web Activity over the Capacitor wrapper M14 planned: a small Android app (`io.github.sekerderya.manekimerge`) that opens the live game full screen in the phone's Chrome. It plays like the installed web app, keeps Chrome's saves, and takes game updates from the site, so a deploy needs no Play release.
  - `android/`: the Android project, generated by Bubblewrap 1.27 (target API 36, Play's requirement since 31 August 2026), with one change: the app asks Chrome for the camera cutout, so it shouldn't open with a black band at the top.
  - The **Android** workflow builds the Play bundle and an APK on changes to `android/` (or by hand), signs them with the upload key from the repository secrets and keeps them as the run's artifact. `npm run android:key` creates that key on the PC (outside the repository), stores it as the secrets and prints its fingerprint.
  - The site side of the Digital Asset Links: `https://sekerderya.github.io/.well-known/assetlinks.json`, from the new `sekerderya/sekerderya.github.io` repository. It gets the keys' fingerprints once they exist.
  - A **privacy policy** (`privacy.html`: the game collects nothing), linked from Settings beside the version, as Play requires.
  - Everything for Play Console: the answers for the app content forms, the store texts, six 1080×1920 screenshots (`docs/play-store/screenshots/`) and a prompt for the feature graphic (docs/ART_ASSETS.md §4.18).
- Deploy and E2E skip pushes that only touch `android/`.

## [0.42.15] - 2026-10-13

### Fixed

- **No black band at the top when the app opens** (the owner's report): on Android the installed app opened with a black band the camera cutout's height at the top, as if the status bar were showing, until the bars were swiped in and out once; with v0.42.14 the game then kept that shorter height. Chrome decides whether the app may use the cutout when the page tells it `viewport-fit=cover`, and ignores that while the app is still starting. Once the app is up and the band is there, the page now tells Chrome again (TECH_SPEC §7), so the game should fill the screen from the start. Only on Android in full screen, only while the band is there.

## [0.42.14] - 2026-10-13

### Fixed

- **The game stays full screen when the phone's bars are swiped in** (the owner's report): in the installed app on Android, showing the status or navigation bar shrank the whole game (the menu, the jar) and it grew back when they went. The app now keeps its full height while they show, and the bars just cover its edges for those few seconds; the overlays and the stage doors keep it too. A split screen still resizes the game, and a browser tab behaves as before.
- **"Updating…" no longer stays on the menu after the loading screen updated** (the owner's report): the loading screen switched to the new version before the PWA plugin was listening for the switch, so the app never reloaded into it and the badge stayed. The app now listens for the switch itself and reloads on the loading screen. The version that installs this fix still updates with the old code: if the badge shows once more, closing and opening the app finishes it.

## [0.42.13] - 2026-10-13

### Changed

- **Smaller DOM pictures, nothing on screen changed** (TECH_SPEC §14, the owner's go-ahead on the optimisation review). The pick cards' pictures, the icon kit's icons, the NEXT bubble, the pause button and the torii were written at the owner's drawing size, up to 8 times bigger than any screen shows them, and every launch decodes them all. `npm run art` now writes each at 3.5 device pixels per CSS pixel of the largest the game draws it (measured on phones and a big tablet): 1044 KB → 340 KB to download and cache, 50 MB → 5 MB decoded. Side-by-side screenshots match. Nine-slice pieces keep their size.

## [0.42.12] - 2026-10-13

### Changed

- **Lighter frames in play, nothing on screen changed** (TECH_SPEC §13, the owner's request for optimisations that lose nothing). A profile of play on an emulated slow phone found the aim guide at about a third of the frame's work. Its dots are now one cropped image of a column texture instead of an image each (33–53), its ghost and the magnet's selection ring are images of ring textures instead of Graphics circles that Phaser re-traced every frame, and the rim's 21 dashes are one image. Measured on production builds (CPU throttled 6×, Android emulation): frame work median 5.5 → 4.1 ms, 90th percentile 11.2 → 8.1 ms. Same-state snapshots differ only at the rings' and dashes' anti-aliased edges.
- **No multisampling with the raster art**: every edge the game draws is inside a padded texture, so 4× MSAA smoothed nothing (the cats, the jar and the paw match pixel for pixel without it). About 58 MB less GPU memory on a 390 × 844 screen at 2.5×. The vector and placeholder skins keep it.
- **Phaser's own sound manager is off**: it opened a second AudioContext at boot that ran silently from the first tap on; the game's audio engine plays every sound as before.
- The reduce-motion check keeps the phone's answer instead of asking the browser several times a frame.

## [0.42.11] - 2026-10-13

### Added

- **The owner's app icon** (`art-source/app-icon.jpg`, docs/ART_ASSETS.md §4.6): the golden lucky cat from the chest up, waving, on cream with a pink glow. `npm run icons` (now `tools/buildAppIcon.ts`, also part of `npm run art`) makes the 64/192/512, Apple 180 and maskable 512 icons and the favicon from it; the maskable one shrinks the picture to 86% and copies its edges outwards, so the raised paw stays inside Android's safe circle. The code-drawn `public/icon.svg`, `pwa-assets.config.ts` and the `@vite-pwa/assets-generator` dependency are gone.
- **The owner's loading bar** (`art-source/loading/bar.jpg`, `bar-full.jpg`, §4.17): the score card made long, with the paw on its left end; its well fills with gold from the paw to the right as the game loads, in place of the CSS bar. `tools/buildLoading.ts` cuts the empty bar and takes the gold from where the two pictures differ.

## [0.42.10] - 2026-10-13

### Added

- **A loading screen** (GAME_DESIGN §2.0, the owner's request): every launch opens on the menu's garden, the logo and the golden cat with a gold bar and "Loading…", drawn by `index.html` before any script arrives, and fades out over the menu once everything is in. Its bar is CSS until the owner's art comes (prompts in docs/ART_ASSETS.md §4.17).
- **Updates install on the loading screen** (TECH_SPEC §9): on a launch after the first visit the app asks for a new version beside the loading; one it finds installs ("Updating…") and the app restarts into it before the menu shows, so the player no longer waits for an update on the menu. Limits: 3 s for the check, 20 s for the install, 5 s for the restart; past them the menu applies the update as before.
- A new prompt for the app icon (docs/ART_ASSETS.md §4.6): the golden cat from the chest up, full bleed, with the phones' crop in mind.

### Fixed

- **The coins, the Upgrades screen and other art no longer pop in late**: the loading screen loads and decodes every image the game shows (all of `public/assets/` and the clips' posters) and keeps them, so they come from the browser's memory cache at once. Until now the coin, the score card, the NEXT bubble, the pause button and the jars' backgrounds weren't waited for, and the Upgrades screen's decoded pieces were dropped after boot.

## [0.42.9] - 2026-10-13

### Changed

- **The owner's new torii** (`art-source/menu/torii.jpg`, docs/ART_ASSETS.md §4.5): a chunky red gate drawn like the score card's paw replaces the icons sheet's thin one, on the BEST STAGE card (a little bigger, 66 mockup px, centred on the well's height) and on the shop's locked cards.

## [0.42.8] - 2026-10-13

### Changed

- **The menu's record numbers are centred between the icon and the well's right end** (the owner's call): BEST SCORE's between the paw and the well's end, BEST STAGE's between the torii and the well's end, so they look centred in what is left of the well. The titles stay centred on the cards.

### Added

- A prompt for a chunky torii for the BEST STAGE card (docs/ART_ASSETS.md §4.5, `art-source/menu/torii.png`); `npm run art` uses it instead of the icons sheet's torii once it exists (menu and the shop's locked cards).

## [0.42.7] - 2026-10-13

### Changed

- **The menu's record titles and numbers are centred on their cards** (the owner's call): "BEST SCORE:" and its number sat over the well, right of the paw, and BEST STAGE's number right of the torii. The titles are a little smaller (27 mockup px instead of 29) so "BEST SCORE:" clears the paw.

## [0.42.6] - 2026-10-13

### Changed

- **The menu's record cards are a little narrower** (284 mockup px instead of 310).
- **BEST STAGE has no paw again, but the torii** (the owner's call): its card's left side is the score card's round right end, mirrored, and the small red torii sits in the well's left end beside the number. BEST SCORE keeps the paw.

## [0.42.5] - 2026-10-13

### Changed

- **The menu's record cards are the in-game score card** (the owner's call): BEST SCORE and BEST STAGE both use the HUD's paw card, with "BEST SCORE:" / "BEST STAGE:" over the caramel well and the number in white with a brown edge, like the score in a run. The card is stretched a little so the longer title fits beside the paw; long numbers still shrink to fit. The paw badge and the torii no longer show on the menu (the torii stays on the shop's locked cards).

## [0.42.4] - 2026-10-13

### Changed

- **One coin everywhere** (the owner's call): every coin is now the HUD's gold coin: the menu's balance (it had a paw coin), the Upgrades screen's balance and prices, the Jackpot banner, the coins flying to the counter (they were the code-drawn mon coin) and Game Over, in every skin. The menu's paw coin sprite and the mon coin icon are removed.
- **The Upgrades screen's coins pill sits inside the header**, under the title and the close button, so it no longer covers the top of the first card (the header is 16 mockup px taller).
- **No "+N% score" pill under the combo** (the owner's call): the combo still adds its score bonus; only the Combo Charm's "+N% coins" shows under "Combo ×N".

## [0.42.3] - 2026-10-13

### Changed

- **No white flash over the screen** when a lightning ball strikes (the owner's call, to try): only the bolts, the flashes and rings on the struck cats, the crackles and the sparks remain. The Lightning clip is recorded again.

## [0.42.2] - 2026-10-13

### Changed

- **No more darkening during a lightning strike** (the owner's call): the screen stays as it is; the white flash, the bolts, the crackles and the sparks remain. The Lightning clip is recorded again without it.

## [0.42.1] - 2026-10-13

### Added

- **The Lightning blessing in the owner's art** (docs/ART_ASSETS.md §4.16): the lightning ball (a little storm with a yellow bolt) in the jar, the paw, NEXT, the pick card and the shop card; the strike's chain bolts, sky bolts, impact flash, shock ring, crackles over the struck cats, the waiting ball's arcs, and a burst of sparks where each struck cat pops.
- `tools/buildLightning.ts` (part of `npm run art`): turns the sheets of light on black into transparent sprites, splits them and measures each bolt's two ends, so a bolt stretches between any two cats.
- **The Lightning clip** on its shop and pick cards: the ball lands on a 3 and chains to the other two, and all three pop.

## [0.42.0] - 2026-10-13

### Added

- **Lightning, a new blessing** (GAME_DESIGN §15.15, the owner's idea). A lightning ball strikes the first cat it touches and, with it, every cat of that size in the jar; if it touches a boulder first, every boulder goes. Time stands still for 0.45 s while the lightning chains through them, then they all pop into coins at once (their value, no score, no combo; boulders pay nothing). Landing on nothing to strike, it waits: the first cat that touches it later sets it off. A sixth card in the blessing picks (+1.5% per level, up to 7.5%).
- **The strike's look:** the jar darkens to a stormy indigo, a bolt comes down from the sky onto the ball, and bolts chain from it to every struck cat, each to its nearest neighbour, flickering, with a flash, a ring and crackles where each lands; yellow sparks as they pop; a waiting ball gives off small arcs. Thunder (a zap, a crack and a rumble), a jolt and the strong haptic pattern. Lighter, with no flash and no flicker, with reduced motion.
- **The Lightning shop card** opens at stage 8, for 15K, 25K, 40K, 60K and 85K, so the early game plays exactly as before (the owner's call): until a profile buys a level, no run sees a lightning ball or its card.
- Art prompts for its look in docs/ART_ASSETS.md §4.16: the ball and four effect sheets on black (six chain bolts, three sky bolts, impact pieces, crackles). Until they come, the game draws stand-ins: a violet ball with a yellow bolt, code-drawn glowing bolts, a bolt glyph on the cards.
- Debug: "Lightning" puts a lightning ball in the paw; `state()` has the strike. The balance bot aims lightning balls (`npm run sim`).

### Decided for the owner (Batch 23, docs/plans/batch-23.md)

- Struck cats pop into their value like a hanabi's pops; time stands still during the strike (a hit-stop), so the bolts link still cats; it waits on the floor; no lightning ball in a stage's first 20 drops; size 2.
- +1.5% per level, rarer than Hanabi and Joker Cat (+2.25%): the bot measured a level of it as worth about a level of Hanabi (three stages, 30 seeds: Lightning 5 cleared 22 and lost 7, Hanabi 5 cleared 23 and lost 7, none cleared 5 and lost 25).
- The card adds 225K to the shop (~1.25M in all): about an hour more at the end of the 8-hour pacing model. The meta bot reaches stage 8 after a median 68 minutes.

## [0.41.1] - 2026-10-13

### Fixed

- **The shrine grows through its clouds again after a quit run.** Quitting a run from the pause menu left the growth clouds (and the wind's petals) paused, and the next run never resumed them: at its first growth (stage 5, 10, 15, …) the clouds stayed frozen below the screen, the background didn't change, the doors shut, and the new garden popped in only after the picks. A new run now starts with them running. An E2E test covers it.

## [0.41.0] - 2026-10-13

### Changed

- **Cats fall faster** (the owner's call: "a bit slow"): 1.35 times the gravity, so a drop reaches the empty floor in 0.88 s instead of 1.04 s. The wind is raised with it (135 per level instead of 100), so a falling cat drifts as far as before on the same slanted line. Heavy Drop keeps its fall times (0.24 s as a rule); its start speeds were re-solved. Its card reads 0.88 s → 0.24 s.

### Fixed

- **Smooth falls.** The balls are drawn between their last two physics steps instead of where the latest step left them. Physics runs 120 steps a second, and a screen frame saw 0, 1, 2 or 3 of them, so a falling cat moved unevenly and looked like a low frame rate, at 60, 90 and 120 Hz alike. Nothing changes in the simulation.

### Added

- `?gravity=<n>` scales the runs' gravity (0.5–2), to try other fall speeds on a phone: `?gravity=0.89` is about v0.40's 1.2×, `?gravity=1.11` 1.5×. `?interp=0` turns the smooth drawing off, to compare.

### Measured

- Fall times by gravity (size 1, dropper to empty floor): 1.0× 1.04 s, 1.2× 0.94 s, 1.35× 0.88 s, 1.5× 0.83 s, 1.75× 0.77 s; all land under the 2400 u/s speed limit.
- The replay prints of `legacy.test.ts` were re-recorded, and the sim test's seed moved from 12 to 16 (the faster falls play another run).

## [0.40.0] - 2026-10-13

### Changed

- **Heavy Drop is a rule** (the owner's call): it left the trials and is offered with Hubris, Echo, Copycat and Dice where the jar grows (five rules now, so rule picks run through stage 25). Taking it drops every ball at the old trial's last level for the rest of the run: shot out of the paw, a 0.24 s fall, the fireball and the knock. A hint names it as the next stage starts. A run saved with the trial comes back with the rule. Eight trials remain (six open at first).
- **More Magnets** opens from the start, its first level at 1,000 (stage 2 and 1,200).

## [0.39.1] - 2026-10-12

### Changed

- **Game Over** shows the score, the best score, the stage and the coins earned (the owner's call): the biggest cat made this run, with its "New" chip, and the "New in the shop" line are gone.

### Fixed

- **No magnets without More Magnets.** Every run had a 1% magnet chance, a fresh profile too; magnets now come only with their blessing, like hanabi and jokers (2.25% per level).

### Measured

- The meta bot (24 players) after the magnet change: a better-than-bot player clears stage 5 within 15 minutes in 1 of 24 profiles (6 in v0.39.0) and within 30 in 15 (16); the weak bot 1 and 3 (1 and 7). At 24 players the 15-minute figure is noisy, but the early game lost a little help.

## [0.39.0] - 2026-10-12 (Batch 22)

### Changed

- **A quicker early game** (the owner's call: runs stopped at stages 5–6, and even a maxed shop made the first stages slow). Every shop effect is 1.5 times as strong:
  - Lucky Paw +22.5% coins per level (+15%), Combo Charm +12% per combo step (+8%).
  - Big Catch 1.2 drop tilt levels per level (0.8): its top level makes 46% of the drops the biggest size (34%), and the tilt goes up to 13 with Big Drops (10).
  - A Lucky Save pops the 9 smallest cats (6).
  - Every blessing level counts 1.5 times as much: golden cats +6% (+4%), magnets, hanabi and jokers +2.25% (+1.5%), Big Drops +3 tilt levels (+2).
- **Cheaper first levels, lower gates:** Lucky Paw and Big Catch start at 150; Combo Charm and More Magnets open at stage 2, Hanabi at 3, Joker Cat at 5. **Second Chance** is open from the start and costs 1,000, then 15,000 (stage 5, 10K and 50K). The last levels cost more, so buying everything still takes about 8 hours (the pacing model: ~7.8 hours). Your levels and coins stay as they are.
- Shop and pick cards show Lucky Paw with one decimal (+22.5%) and the blessings' chances with up to two (3.25%).

### Added

- `npm run sim -- --aim smart`: a balance bot that plays more like a person (it thinks before each drop, aims where the ball will land, keeps the big cats on one side, aims into the wind and picks sensibly); a fresh profile's runs end at stage 2–3 with it. `--meta <minutes>` plays players from a fresh profile who buy the cheapest card after every run and reports when they first clear stage 5; `--extra-saves` stands in for a better player.

### Measured (the meta bot, 24 players, GAME_DESIGN §14)

- A better-than-bot player (one extra Lucky Save) clears stage 5 within 15 minutes in 6 of 24 profiles (v0.38: 2) and within 30 in 16 (8). A maxed profile clears 5 stages in 44 runs of 60 (29). The owner turned down a first-jar protection and an opening blessing pick, which would have gone further.

## [0.38.0] - 2026-10-12 (Batch 21)

### Added

- **How-it-works clips.** Cards whose effect is hard to picture have a small play button on their icon, in the shop and in the stage-clear picks: every special ball, the boulder trials, Wind, Heavy Drop, Porcelain, the Cursed Bell trials, every rule, Combo Charm and Second Chance (17 clips; Lucky Paw, Big Catch and Big Drops have none). It opens a popup with a short looping clip of the game doing it and one line of caption. The button wears the owner's play medallion and a red dot until its clip has been opened once; "How to play" brings the dots back. The back button closes the popup only, and a tap on the button never chooses a pick. With reduced motion the clip waits for a tap. The clips are cached for offline play (about 4 MB) and played from memory, so they work offline on iPhones too.
- `npm run clips` records the clips from the game itself (docs/plans/batch-21.md): scripted scenes on a fixed clock, so every frame is exactly four physics ticks as on a phone, with the owner's tap pointer showing taps and drags, encoded to MP4 in the browser (no ffmpeg; `mp4-muxer`, MIT, as a dev dependency).
- Debug hooks for the scenes: a cat of any size in the paw, a cat laid at a height, the balls with their positions, and world-to-screen points.

### Decided for the owner

- One clip per mechanic: the same clip opens from every card about it (the shop's and the pick's More Magnets, the three Cursed Bell trials). Porcelain, Combo Charm and Second Chance got clips too.
- The button is a play triangle in the icon kit's medallion (no "?": the kit allows no signs), and the pointer a hand (the dropper is already a paw).
- Wind has two clips, one per direction, so the clip blows the way the card says.
- Captions are live text under the clip, not in the video.
- The Iron Bands clip shows a boulder with one band: with two, the third merge's new cat grows away from the boulder, out of its reach.

## [0.37.0] - 2026-10-12

### Changed

- **Settings, Pause and Game Over** wear the game's art, after the owner's approved mockups (`art-source/ui/*-mockup.jpg`): the same layout as before, built from the Upgrades screen's and the menu's pieces. The panel is the Upgrades card, the titles and Game Over's score use the Upgrades title's cream lettering, Resume and Play Again are the menu's PLAY pill, the quiet buttons the cream UPGRADES pill. Settings shows its icons in gold-rimmed medallions, its switches turn gold when ON, and the version sits in the card's tan strip. Pause's Sound and Haptics are gold when on and cream with a crossed-out icon when off (Haptics now has its own crossed-out icon). Mint is gone from these panels. `?skin=vector` keeps the old cards.

## [0.36.0] - 2026-10-12 (Batch 20)

### Changed

- **Every profile starts over** (save version 7, the owner's call): only the settings stay (sound, haptics, reduce motion). Coins, upgrades, records, stats and the first-run hints go, and a run saved before this version is dropped.
- **Coins** pay by the merging cats' size, times the number of the jar the stage plays in: ×1 in stages 1–5, ×2 in 6–10, ×3 in 11–15, and so on (a stage pays ~530 coins before upgrades). "The shrine grows!" says the new multiplier ("Coins ×2"). Until now each stage paid ~118 times the coins of the one before, so one run past stage 2 bought the whole shop.
- **Score** pays 2^size, 1.225 times more each stage: about 5 million by the time stage 30 is cleared (it was 2^tier, about 10^81 there). Every combo step adds 10% to a merge's score for every player, up to ×1.5; the combo label shows it ("+30% score") with the Combo Charm coin bonus beside it.
- **Blessings are bought in the shop.** Under the upgrades, a Blessings section sells a card per blessing: its level is the highest level that blessing can reach in a run. A fresh profile has Golden Cats and Big Drops at 1; when no blessing is left under its card, the stage clears give only trials and the run ends on its own.
- **Stage gates:** Combo Charm and More Magnets open at stage 3, Second Chance and Hanabi at stage 5, Joker Cat at stage 8; until then the card says "Reach stage N". Game Over lists the cards a run opened.
- **Big Catch** has 10 levels, each 0.8 of the old step (34% biggest drops at the top, against 25% before), so a maxed profile clears early stages faster and Big Drops keeps room.
- Every price is new, from a pacing model: everything bought in about 8 hours of play, the first run paying for two or three cheap cards (GAME_DESIGN §10, §14).

### Added

- Debug panel: set the best stage, max the profile (every card, every gate), +50K coins, and the run's play time with the last stages' times.
- `npm run sim -- --upgrades max` (or `id=level,…`) plays with shop cards, and the simulator reports coins per run and the score, coins and play time at each stage clear.

## [0.35.3] - 2026-10-11

### Changed

- A cursed cat turns to stone under the owner's stone patterns, like a cracked cat's cracks: a few stone patches for the first half of its count (10 drops: 10 to 6), mostly stone for the rest (5 to 0), rolling with the cat. The number over it is gone (it stays without the art skin).

## [0.35.2] - 2026-10-11

### Fixed

- Porcelain: a broken cat's two pieces that stayed wedged together in a pile never merged (they only could once they had come apart, which 13–18% of breaks never did in bot play). Now they are ordinary cats 1 s after the break in any case, so pieces still touching then merge back into a whole cat. Porcelain clogs the jar less for it: the balance bot clears 8 of 30 stage-1 runs at level 2 and 12 at level 4 (before: 9 and 4; without Porcelain 11).

## [0.35.1] - 2026-10-11

### Fixed

- Copycat copied a merge into every cat after NEXT too, until the next merge, so the paw kept handing out one size (the owner found it far too easy). Now a merge changes only the cat waiting in NEXT; the cats after it roll as usual. With the fix it copies up to size 4 again, as planned: the balance bot clears 6 of 30 stage-1 runs with it (median 49 s), against 11 (67 s) without it and 45–51 s with Hubris or Echo; at size 3 it cleared 10 (63 s).

### Changed

- The cursed bell and its ring of flames are gone (the owner found the design poor). A cursed cat will turn to stone bit by bit under the owner's stone patterns, like a cracked cat's cracks (docs/ART_ASSETS.md §4.13, a new prompt); until they come, the drops left show as a number over the cat. The first-curse hint now says "Merge this cat before it turns to stone".
- The Copycat card has the owner's picture: the black cat and its grinning copy.

## [0.35.0] - 2026-10-11 (Batch 19)

### Added

- Follow-up trials: a pick can need another pick first. Quick Curse and More Curses are offered only once Cursed Bell is taken.
- Cursed Bell (trial): from a stage's 15th drop a cat is cursed now and then (every 30 drops). Its iron bell counts 10 drops; merge the cat in time, or at the drop after 0 it turns into a bare boulder of its size that one merge breaks. A merge that lifts the curse pays its coins twice; the magnet lifts it with no bonus. Quick Curse: 8, 7, 6 drops. More Curses: every 25, 20, 15 drops.
- Copycat (rule): the cat in NEXT, and every cat after it, takes the size of the stage's latest merge (up to size 3).
- Dice (rule): every merge rolls a die: 1 in 6 makes a cat one size bigger, 1 in 6 fizzles into one cat of the size that met. No roll for a joker's merge or the stage's last cat.
- With four rules, the clears that grow the jar offer rules up to stage 20.
- The owner's art for them: the cursed bell with the drops left on its tag, the ring of ghostly flames round the cursed cat, the lucky and unlucky dice, and the Cursed Bell, Quick Curse, More Curses and Dice cards. A cat turning to stone fades into its boulder in stone chips; NEXT's cat pops when Copycat changes it.
- New sounds: a dull iron bell as a curse begins, a low grind as a cat turns to stone, a clack for a fizzle; a lifted curse and a lucky die chime like a golden merge. Hints for the first curse and for Copycat.
- `npm run sim`: a headless balance bot that plays seeded runs per set of picks and prints a table (TECH_SPEC §11). Debug: curse the newest cat, set its bell, force the next die.

### Decisions taken for the owner (docs/plans/batch-19.md §3; tell me to change any)

- A petrified cat is a bare boulder of its own size, one merge to break, whatever Iron Bands and Big Boulders say.
- The countdown counts drops, not seconds; the cat turns to stone when the player drops while the bell already shows 0, so the drop that brings it to 0 can still make the merge.
- One cursed cat at a time; curses begin only right after a drop (so a lifted curse never brings a new one at once).
- Lifting a curse pays the merge's coins twice (coins only, not the score); a magnet lifts it with no bonus. Golden and cracked cats can be cursed.
- Copycat leaves magnets, boulders, hanabi and jokers alone, keeps a golden cat golden, and leaves a run's first two cats the smallest.
- Dice never rolls for a joker's merge or the merge that makes the stage's last cat; a lucky roll may make the last cat. A fizzle still counts as a merge (pay, combo, boulder hits, cracks, a lifted curse) but never echoes.
- The ring's flames came out upright, so the ring rocks gently instead of turning round.

### Balance (measured before shipping with `npm run sim`: 30 seeds of stage 1, 240 s at most)

The bot drops as fast as it can on the highest cat of its ball's size:

| Arm                                       | Cleared | Lost | Median run | Per run                                     |
| ----------------------------------------- | ------: | ---: | ---------: | ------------------------------------------- |
| no picks                                  |      11 |   19 |       67 s | –                                           |
| Hubris                                    |       3 |   27 |       51 s | 22.5 threes                                 |
| Echo                                      |      10 |   20 |       45 s | 7.2 echoes                                  |
| Cursed Bell                               |      10 |   20 |       70 s | 5.1 curses: 2.7 lifted, 2.2 turned to stone |
| Cursed Bell, Quick and More Curses at max |       7 |   23 |       78 s | 11.3 curses: 4.7 lifted, 6.1 stone          |
| Copycat (size 3)                          |      29 |    1 |       48 s | 11.4 NEXT copies                            |
| Dice                                      |      11 |   19 |       50 s | 15.3 lucky, 15.7 fizzles                    |

- Copycat was planned to copy up to size 4 (the biggest drop): the bot then cleared 29 of 30 runs with a median of 29 s, much sooner than Hubris or Echo, so it copies up to size 3 (48 s). Size 2 would give 23 clears and 88 s.
- A bot dropping at random spots loses almost every run (1 clear in 30, median 57 s), so its table mostly shows run lengths: Hubris 45 s, Echo 44 s, Cursed Bell 56 s (60 s at max), Copycat 47 s (24 clears), Dice 45 s.

### Known

- The Copycat card shows the size-2 cat until its picture is regenerated (the first one split the cat in two; docs/ART_ASSETS.md §4.13 has the corrected prompt).

## [0.34.0] - 2026-10-11 (Batch 18)

### Added

- Rules, a new kind of pick: at the stage clears where the jar grows (5, 10, 15, …) a rule takes the trial's place, with vermilion cards that read "New rule". A rule is on for the rest of the run; once both are taken those clears offer a trial again.
- Wind (trial): falling cats are blown sideways, harder each level (45 to 225 units on a full fall; the jar is 600 wide), one way for the whole run. Petals and wind lines drift across the top of the screen.
- Heavy Drop (trial): cats shoot out of the paw and fall faster (0.66 s down to 0.24 s) and hit harder, knocking the cat they land on aside even on a dead-centre hit; at the top level they come down like a fireball and land with sparks, a thud and a small shake.
- Porcelain (trial): a merge can crack the cats beside it (10% per level); a cracked cat that cracks again breaks into two cats of the size below, which merge with each other only once they have come apart. A cracked cat that merges makes a whole one, with a flash of gold.
- Hubris (rule): three small cats (sizes 1–5) that touch merge at once into a cat two sizes bigger (three with a golden cat), paying half as much again; two of them wait half a second before merging.
- Echo (rule): merges of sizes 5–7 leave a cat of their size beside the new cat, once per drop.
- The owner's art for them: Heavy Drop's small flame (levels 3–4) and fireball (level 5) trailing back along the falling cat's path, Porcelain's crack lines and gold kintsugi seams, and the five card pictures (the carp streamer turns with the wind).
- New sounds: thud, tink, shatter and a bell echo. Debug: set the new levels, a rule pick, flip the wind, a cracked cat, crack the newest cat.

### Decisions taken for the owner (docs/plans/batch-18.md §3; tell me to change any)

- The wind and heavy drops act on every ball that leaves the paw (also boulders, hanabi, jokers and a magnet's catch), only until it first touches a ball or the floor.
- Porcelain spares cats of the merging size, so it doesn't spoil the next merge of a chain.
- The joker stays the wild card under Hubris (it merges with one small cat); a golden cat among a Hubris three goes up three sizes; a joker's merge never echoes.
- Heavy Drop's numbers: half the base gravity more per level, and a start speed solved for each fall time (the approved option). A falling heavy ball is kept from sinking more than half a size-1 radius into anything by a sweep along its path (instead of a speed cap, which can't reach 0.4 s or 0.3 s, or substepping the whole world).
- Echo cats and broken pieces grow in from a quarter of their radius; six connected small cats make two threes in one step under Hubris.

### Changed after the owner's first play (measured with a test bot, docs/GAME_DESIGN.md §15.9, §15.11)

- Echo set off chains that won or lost a run within about 40 s: now only sizes 5–7 echo, and only once per drop.
- Hubris clogged the jar with small cats waiting for a third: now two of them merge after touching for half a second, and a third that comes in time still makes a three.
- Heavy Drop was 17% too slow and felt like a faster fall: it now shoots out of the paw (814 to 3825 u/s) and falls in 0.66 to 0.24 s; a straight hit from above now knocks the cat aside.

### Changed after the owner's second play (docs/GAME_DESIGN.md §15.8–§15.10)

- Porcelain was too hard: cracks come at 10% per level instead of 20% (a test bot lost 20 of 90 stage-1 runs at level 1 instead of 26; 13 without Porcelain), and a broken cat's two pieces, which never merged with each other, merge once they have come apart and meet again.
- The wind didn't show on a heavy drop (a level-5 one drifted 3 to 14 units): it now tilts the whole fall, so a heavy cat comes down the same slanted line as a plain one, only faster, shooting out of the paw at a slant.

### Fixed

- A heavy cat dropped against the wall the wind blows toward lost its Heavy Drop at once (the wall counted as its first contact) and fell up to 71% slower; a wall no longer ends a fall, and the wind no longer presses a cat into it.

## [0.33.5] - 2026-10-11

### Changed

- The stage's last cat no longer pops at once (the owner's call): it waits 1.5 s and shines, with a pulsing gold halo, slowly turning light rays and sparkles flying off it, then pops in a burst of sparks. The jar still grows 2 s after the last cat is made.
- The other cats of a stage clear pop quickly from the top of the jar down, 45 ms apart, instead of almost all at once.

## [0.33.4] - 2026-10-11

### Changed

- The growth clouds come and part 30% slower (the owner's call), and the new place shows on its own for 1.5 s more before the doors shut for the picks. "The shrine grows!" leaves as the clouds clear.

## [0.33.3] - 2026-10-11

### Changed

- The shrine grows through the clouds (the owner's choice and art): a wall of the owner's clouds wells up over the screen, the new place comes in behind them, and they part from the middle out while it settles from a little close. The jar stays still; it no longer shrinks and slides back up, and the old garden no longer shrinks away. With reduced motion the clouds only fade in and out.

## [0.33.2] - 2026-10-11

### Added

- The owner's last background: a wooden temple stage high on a mountainside, from stage 16. The mountain peak now comes from stage 21.

### Changed

- The shrine grows right after the stage clear, before the doors and the picks (the owner's call): "Stage clear!" slides away, "The shrine grows!" shows with the zoom and the new background, then the doors shut for the picks and open onto the new stage. The stage at the top changes as the jar finishes growing.

## [0.33.1] - 2026-10-11

### Added

- The owner's backgrounds for the grown jars: a grand temple courtyard from stage 6, a hilltop above a shrine town from stage 11, and a mountain peak above a sea of clouds from stage 16. A step between the hilltop and the peak will come before the peak (docs/ART_ASSETS.md §4.10).

## [0.33.0] - 2026-10-11

### Added

- Stages have no end (the owner's call): clearing stage 5 moves on to stage 6, and so on, and the stage at the top keeps counting. Tiers, score and coins keep growing with them.
- "The shrine grows!" shows as the jar grows, once the stage doors have opened.
- One background per jar: the old garden shrinks towards the jar's feet and fades out during the zoom, uncovering the next one. Until the owner's new backgrounds come, every jar keeps the shrine garden. The art plan has the prompts for four new ones (docs/ART_ASSETS.md §4.10), and `npm run art` takes `scene/background-2` to `-5`.
- Numbers past 10^18 show as Sx, Sp, Oc, No and Dc, then as "1.2e36".

### Changed

- The jar grows only every 5 stages (after stages 5, 10, 15, …). The other clears go on to the next stage in the same jar right after the picks, without the zoom.
- The debug panel's stage jump goes up to stage 21.

### Fixed

- A run saved in the middle of clearing stage 5 with an older version goes on to stage 6.

## [0.32.4] - 2026-10-10

### Changed

- Choosing a trial or blessing no longer dims the other cards (the owner's call). The ring round the chosen card is drawn behind it and only fades in, instead of a glow filter on the whole card.
- More Boulders' card shows a neat pyramid of three boulders, and Big Boulders' a big boulder with a small one and an arrow (the owner's pictures).

### Fixed

- Switching between cards could stutter: the jar behind the shut doors was still drawn every frame. The game loop now sleeps while the doors are shut (on a software-GPU stand-in: 30 → 60 fps, worst frame 233 → 33 ms).

## [0.32.3] - 2026-10-10

### Changed

- More Boulders' card shows a heap of boulders (the owner's art), so it no longer looks like Big Boulders'. A pick can now have a picture of its own (`art-source/picks/<id>`), shown in its card's medallion instead of the ball.

## [0.32.2] - 2026-10-10

### Changed

- A clearer pick (the owner's call): the chosen card pops forward with a little overshoot in a thick ring of light (blue for a trial, gold for a blessing), and the other cards dim.

## [0.32.1] - 2026-10-10

### Changed

- The trial and blessing cards show the game's own art as their icons (the owner's call): boulders for the boulder trials, the magnet, the hanabi and the joker for theirs, the size-4 cat for Big Drops and a glowing white cat for Golden Cats. Iron Bands shows the boulder as the pick will make it, with one band more than now.

## [0.32.0] - 2026-10-10

### Changed

- The trial and blessing picks in the owner's art (GAME_DESIGN §15.5), built from the Upgrades screen's pieces over the shut stage doors: the title on a cream pill, three cream cards with the stat in their tan strip, and Choose on the menu's coral PLAY pill (faded until a card is chosen). The chosen card lifts and glows, stone blue-grey for a trial, gold for a blessing.
- Until their icons come from the icon kit, the cards show the code-drawn icons in a cream medallion (stone-grey rim for trials, gold for blessings).
- The Upgrades screen and the picks share their art settings (`ui/uiArt.ts`).

## [0.31.0] - 2026-10-10

### Added

- The Upgrades screen in the owner's art (GAME_DESIGN §2.2, the approved mockup): the menu blurred behind, "Upgrades" on a cream pill, a round close button, the menu's coins pill, and cream cards with a tan stat strip and a gold Buy button ("Buy" over the coin and the price).
- Upgrade icons: Lucky Paw (a beckoning paw with a koban), Big Catch (a big lucky cat with a small one), Combo Charm (an omamori) and Second Chance (the cats' gold bell with a heart).
- The icon kit (docs/ART_ASSETS.md §5): one style and one prompt for every later icon, and a pipeline step that turns `art-source/icons/<id>` into the game's icon.

### Changed

- The level pips are gone; the level shows as a number ("2/10").
- Not enough coins: the Buy button fades to grey and says "Need N more" where "Buy" was.
- `?skin=vector` keeps the code-drawn shop.

## [0.30.0] - 2026-10-10

### Added

- The owner's art for the special balls (docs/ART_ASSETS.md phase 7, GAME_DESIGN §13.1): the magnet (a red horseshoe magnet on a gold-rimmed coin), the hanabi (a navy firework shell with a painted burst and a fuse), the joker cat (a rainbow-striped maneki-neko in a jester hat) and the boulder (a grey stone with 0 to 3 riveted iron bands). They show in the jar, in the paw and in NEXT, outlined like the cats.

### Changed

- The art pipeline fits every ball, cat or special, the same way (`tools/artBall.ts`); the cats' sprites come out unchanged.
- The code-drawn special balls stay for `?skin=vector`.

## [0.29.5] - 2026-10-10

### Removed

- The "New cats unlocked!" banner with the next goal at the start of a new stage (the owner's call). The new stage starts with just the bell chime, and NEXT shows its cats.

## [0.29.4] - 2026-10-10

### Changed

- Every stage clear says "Stage clear!" (the owner's call); "The shrine grows!" is gone. It shows for 1.5 s, then slides up off the screen in 0.5 s.
- The stage doors set off as the banner slides away. They come in from off the screen, so the banner is gone before they show, and there is no pause between the two.

## [0.29.3] - 2026-10-10

### Changed

- A slower stage transition (the owner's call, GAME_DESIGN §7.1): after the stage's last cat is made, "The shrine grows!" stays 2 s before the stage doors start to slide in, and they cover it as they shut. The doors now take 1.1 s to shut (0.7 s before) and 1.2 s to open (0.75 s).

## [0.29.2] - 2026-10-10

### Added

- Debug panel (`?debug=1`): a "Clear stage" button. It makes the stage's last cat from two size-8 cats at the dropper, so a whole stage clear plays at once: the pops, the stage doors, the picks and the zoom. Handy for trying the doors on a phone without playing a stage through.

## [0.29.1] - 2026-10-10

### Fixed

- The stage doors slide instead of swinging (the owner's call): each wing, a folding screen of two doors, slides in from the side and unfolds as it comes, then slides back out, folding up, before the zoom. Its outer edges stay on the screen's plane and the hinge between its doors comes forward, like a byobu pushed along the floor. In v0.29.0 each wing turned on the screen's edge like a door.
- The first frame of the doors no longer flashes a dark shape: they were measured while still hidden.

## [0.29.0] - 2026-10-10

### Added

- Stage doors (the owner's idea, GAME_DESIGN §7.1): after a stage clear, four tall shoji doors fold in from the sides like an accordion and shut over the screen. The trial and blessing are picked in front of them; then they fold open and the jar's zoom plays as before, from its first frame.
- The doors' art is the owner's (docs/ART_ASSETS.md phase 6): a shrine-garden picture that runs across the four doors, and one door frame laid over each, stretched to any screen height.
- With reduced motion the doors fade in and out instead of folding. A run saved while a pick waits comes back behind shut doors.

### Changed

- The blessing now applies as the doors finish opening (0.75 s after Choose), just before the zoom.

### Notes

- The picture is 768 px wide, a little soft on a 3× phone; an upscaled copy can replace it with `npm run art`.

## [0.28.0] - 2026-10-10

### Added

- Two new blessings (the owner's picks, GAME_DESIGN §15.6–§15.7). Each comes from the dropper like the magnet, with 1.5% per level (5 levels).
- **Hanabi**: a firework ball. It lights when it lands and goes off a second later. Every cat of size 1–4 within reach pops into its value, boulders break, another hanabi goes off too, and bigger cats and jokers get a gentle push away. None comes in a stage's first 20 drops, and a queued one becomes a small cat at a stage clear, like the magnet.
- **Joker Cat**: merges with the first cat it touches, whatever its size, and makes it one size bigger where it is (a golden cat two). A joker on a size 8 makes the stage's last cat and clears the stage. Its merge pays like the cat's own and counts for the combo; a joker that touches a boulder knocks a band off once.
- Code-drawn placeholder looks (a navy firework ball with a fuse, a white ball with a rainbow ring and a star), the NEXT icons and card icons, a boom sound, and debug buttons to put either in the paw.

### Changed

- The blessing pick now draws 3 of the 5 blessings, so it can differ from one clear to the next.

### Notes

- A run saved by v0.27 still loads: the new blessings start at level 0.
- The numbers are first values from the chat (reach 200, fuse 1 s, push 320 units/s, 1.5% per level); balance comes later.

## [0.27.0] - 2026-10-10

### Added

- Autosave (the owner's request, GAME_DESIGN §11): the run in progress is saved, so closing the app no longer ends it. The stage, every cat and boulder where it lies, the score, the run's coins, the dropper and NEXT, the trials and blessings, the Lucky Saves left, a waiting pick and a growing jar all come back.
- Opening the app again goes straight to the game screen, paused where the run stopped; Resume plays on. A stage clear's pick waits under the pause.
- The run is written with every wallet write (at most once a second while coins come in) and whenever the app goes to the background or closes, under its own key (`maneki-merge:run`).

### Changed

- Quit to Menu ends the run for good, as before; so does game over. The next launch then opens the menu.
- Debug "Reset save" also forgets the saved run.

### Known issues

- Cats that were still falling or rolling when the app closed go on a little differently than they would have (matter-js's contact cache isn't saved); a settled pile doesn't move.
- A saved run is dropped when a later version changes the snapshot format (`RUN_SAVE_VERSION`); the coins it earned stay in the wallet.

## [0.26.0] - 2026-10-10

### Removed

- XP and levels (the owner's call): merges give no XP, there is no level and no XP card.

### Changed

- Blessings come at stage clears again: every clear offers a trial, then a blessing, as before v0.25.
- The score card sits level with the coins card (their middles on one line), under the stage's line.

The rest of v0.25 stays: the stage in words at the top, the floating paw and no noren.

## [0.25.0] - 2026-10-09

### Added

- XP and levels (the owner's design, GAME_DESIGN §15.6). Every merge gives XP: the size of the cat it makes (two 3s make a 4: 4 XP), and a combo adds a quarter of that per step, up to double. Level 1 → 2 needs 100 XP, each later level 1.4 times more (140, 196, 274, …).
- Every level up offers a blessing at once: "Level up!", 1 of 3 cards, while time stands still; play goes on where it stopped. Several level ups at once offer one blessing each.
- The XP card under the score card: the owner's art, made as an edit of the score card (the same frame and paw around a thick well that fills with glossy gold), with "Lv N" in it. It bumps when XP comes in and flashes on a level up.
- The stage in words ("STAGE 2") at the top in the middle of the screen.
- Debug: "+25 XP" and "Level up" buttons, `addXp(n)`, and the level and XP in `window.__game.state()`.

### Changed

- A stage clear now offers only a trial; blessings come with levels. If the clear's last merge levelled up, its blessing follows the trial.
- The paw floats over the jar: its arm fades out a little above the wrist, so a tall phone never shows a long bare arm.
- The jar keeps its size: the new HUD pieces sit in space the HUD already took.

### Removed

- The noren curtain over the jar (the owner's call). Its art stays in `art-source/scene/`.

### Known issues

- The XP numbers are starting values. Two test bots (40 runs each) gained 2–4 levels in stage 1 and 1–2 in each later stage; the first level up came after about 12 s of a bot dropping every 0.45 s, about half a minute for a player. Only three blessings exist (15 levels in all), so a very long run can max them; the pick is then skipped.

## [0.24.0] - 2026-10-09

### Changed

- Stages no longer loop (the owner's call). The goal of a stage is its 9th cat, made from two 8s, instead of the 10th; a stage holds 9 cats (stage 1: tiers 1–9, stage 2: 10–18, … stage 5: 37–45), so it takes half the cats it used to.
- The last cat no longer becomes the next stage's first. It settles alone for half a second, then pops into its value like the others, and every stage starts with an empty jar. The jar still grows on screen as before (by 4.8), now empty; later a background per stage is meant to carry the feeling of growth. The last stage works the same way, without the growth: its last cat pops, the picks come, and play goes on in the empty jar.
- Every cat is 20% bigger (size 1: 41, size 9: 165, as big as the old size 10). Sizes 1–8 together cover as much of the jar as sizes 1–9 did, and a test bot that drops each cat on a matching one clears stage 1 about as often as before (13 runs in 48 against 11) in half the drops (median 138 against 275). With 23% or 26% the same bot cleared only 7 in 48, so 20% is where a stage stays about as hard as it was.
- The dropper hangs a little higher (band 0.44 of the jar width instead of 0.4), so the biggest drop, now bigger, still hangs clear of the jar's top rail.
- Magnets: half the chance (1% instead of 2%, More Magnets +1.5% instead of +3% per level, so 8.5% at its max), and none in a stage's first 20 drops: the first ball that can be a magnet is the one queued when the 20th drop leaves the paw. A magnet queued at a stage clear becomes a small cat, since the new jar is empty.
- Pick cards show chances with one decimal (2.5%).
- Save format v6: a best tier above 45 (the old stage 5 ended at 46) becomes 45.

### Known issues

- With bigger cats the jar fills faster, so a run lasts fewer drops (that bot's median run fell from 302 s to 166 s), while each stage needs half the drops. The owner's playtests decide whether the balance needs a change; the radius is one number (`SIZE_BASE_RADIUS`).
- A stage pays less: its last merge is two 8s instead of two 9s, and stage 5 ends at tier 45 instead of 46 (the last cat's pop pays a little back). The economy is still to be balanced.

## [0.23.8] - 2026-10-09

### Changed

- Smoother on old phones, with no change on phones that keep up (the owner's request). The game looks exactly the same on every phone that holds its frame rate; screenshots before and after match pixel for pixel within GPU noise.
  - The aim guide's dots, the jar's glass shine and its dashed danger line are pre-drawn images instead of shapes the engine re-traced every frame (about 5000 points a frame). On a CPU slowed six times as a stand-in for an old phone, drawing a frame took 2.5 ms instead of 4.6.
  - All the cats share one texture, so a phone draws the whole jar of cats in one go instead of one draw call per cat (9 draw calls a frame for the whole scene instead of 29 with 24 cats, and no longer more with more cats).
  - Adaptive resolution: if play stutters (under 45 fps and uneven) the game draws the canvas at fewer pixels, 2.5 → 2 → 1.5 per CSS pixel, and keeps a step only when it makes frames at least 10% shorter; otherwise it goes back to full sharpness for the rest of the session. A steady 30 fps (iPhone Low Power Mode, battery savers) is left alone. On a software renderer standing in for a weak GPU this took play from 28 fps to about 60.
- `?res=<n>` fixes the canvas resolution, to see on a phone what a slow one gets (e.g. `?res=1.5`). The debug panel shows the current resolution.

### Known issues

- A phone held back by its CPU (the physics of a full jar) gets nothing from fewer pixels, so it keeps the full resolution and can still slow down when the jar is very full.

## [0.23.7] - 2026-10-09

### Changed

- Cats roll over each other instead of sliding like on ice (the owner's report). Friction between cats now grows with how hard they press together, the way real friction does: a cat going over another's shoulder rolls 99% of the way (63–77% before), and in play the cats that slide past each other dropped from about a third of the contacts to under a tenth. An impact carries no friction, so a landing cat still shoves as hard as before.
- Cats turn like real discs (half the spin weight they had), so rolling costs them little of their push: a rolling cat moves a resting big one about twice as far, and a cat pushed along the floor rolls a little farther (about 155 units in a second instead of 120).
- The jar's walls and floor use the same friction: a pushed cat starts rolling within a tenth of a second, and resting cats stay still.

### Known issues

- A test bot that drops as fast as it can at random spots loses a little sooner (median 108 s against 122 s): cats that no longer slide meet fewer neighbours to merge with. The owner's playtests decide whether the balance needs a change.

## [0.23.6] - 2026-10-09

### Changed

- No more rug on the jar's floor (the owner's call): a cat alone on the floor rolls on, slowed only by the air, until a wall or another cat stops it. Before, the floor stopped it within half a second; now a pushed cat can glide about 250 units (four tenths of the jar) over several seconds, and a merged cat on the floor drifts a little.

## [0.23.5] - 2026-10-09

### Changed

- The owner's final square jar: the bamboo bottom is straight and level, joined to the posts with small elbow joints, and the frame is a little wider, so its opening matches the game's jar (1 : 1.51 against 1 : 1.45).
- `npm run art` measures the jar's opening from the bamboo's dark outline only, not from the thin line of the glass edge inside it.

## [0.23.4] - 2026-10-09

### Changed

- The jar's bottom corners are almost square: the owner's new bamboo jar bends into its bottom with tight elbows instead of the round U, and the physics jar has square corners.
- The corner physics is gone with the curves: no more rounded floor and no soft "first landing" on a curve. A cat dropped against a wall lands in the corner and stays there.
- The floor still slows a lone cat like a rug and keeps it rolling (without it, a pushed cat would glide for about 7 s).

### Known issues

- The art's inner bends are not perfectly square, so a small cat deep in a corner overlaps the bamboo's bend by a few pixels.

## [0.23.3] - 2026-10-09

### Changed

- Updates install themselves. When a new version is waiting and the menu has been up for a second (no shop or settings panel open), the app restarts into it on its own, with a brief "Updating…" badge; no more "Update ready — tap to restart". A version that arrives during a run still waits until the player is back on the menu.
- Faster deploys: the E2E suite moved to its own workflow that runs beside the deploy without blocking it, in four parallel jobs (iPhone and Pixel profiles, two shards each). A failure is reported, not gated. Pushes that only change docs, Markdown or art sources run neither workflow.

## [0.23.2] - 2026-10-09

### Changed

- The paw's arm reaches up behind the noren to about the score card's bottom, so it shows through the curtain's slits instead of empty gaps.
- "SCORE:" and "COINS:" are 17 px (14 and 13 before), like the owner's reference; "SCORE:" is centred on the card's body.
- The coins card is only as wide as its coins need (about 98 px on screen, 110 before), with the coin and the number centred.
- The coins card and the NEXT bubble sit a little lower (8 and 12 px), with 14 px between them (8 before). The HUD's height, and so the jar's place, is unchanged.

## [0.23.1] - 2026-10-09

### Fixed

- Replaced art now reaches installed apps. The service worker cached every image under `assets/` without a revision, as if its name held a content hash (only Vite's own output does), so an image replaced under the same name (v0.23's NEXT bubble, and earlier art updates) stayed old after an update. Each art file now has a revision; a unit test checks them all.

## [0.23.0] - 2026-10-09

The score card and the NEXT bubble, copied from the owner's references.

### Changed

- **Score card**: the owner's image instead of the CSS card: cream with a dark chocolate outline and a tan base, a white beckoning paw with pink pads sticking out of its left end, "SCORE:" over a caramel well with the score in it. Its plain middle stretches when a score needs more room. The paw badge is gone from the HUD (the menu's record cards keep it).
- **NEXT bubble**: the owner's new round glass bubble (a cream rim, mint fading to pink, white shines), with "NEXT" in dark brown with a cream edge on its top rim instead of a cream tag.
- `npm run art` measures the score card's well and its stretchable columns, and the bubble's top rim.

## [0.22.0] - 2026-10-09

A noren curtain over the jar: the paw reaches out from under it, so a tall phone's top is no longer a long bare arm.

### Added

- **Noren** (the owner's mockup, the owner's generated art): a cream curtain with a pink hem, a rose-brown rod and a gold paw coin across the top of the game screen. Its hem hangs a fixed height above the jar (300 world units over the rim); its plain fabric stretches up to the top of any screen, and on a short screen the rod and coin go off the top instead of squashing. The HUD floats over it. With `?skin=vector` the paw still hangs from the top of the screen.
- `npm run art` builds the noren: cuts the white, recolours the generated rod from tan to the mockup's rose brown, and measures the rows that may stretch.

### Changed

- The paw's arm ends just above the noren's hem (its texture is cropped there), so it never shows through the curtain's slits.

## [0.21.1] - 2026-10-09

The paw holds the cat higher, clear of the jar's top rail.

### Changed

- The dropper band above the rim is 0.4 of the jar's width (0.2 before), so even the biggest cat in the paw (size 4, or a magnet's catch) hangs just above the bamboo rail instead of in front of it. A unit test checks the gap against the rail measured from the jar art (`npm run art` now records the rail's top edge).
- Every drop starts 60 world units higher: a cat reaches the empty floor in 1.03–1.04 s instead of 1 s. Gravity is unchanged.
- The camera counts the taller band against the space above the dropper, so on a phone the jar stays where it was (on a 390 × 844 iPhone the rim is still at 304 px and the floor at 713 px).

### Planned

- A noren curtain across the top of the game screen, the paw reaching out from under it, so the arm no longer fills a tall phone's empty height. The owner picked it from a mockup (`art-source/scene/noren-mockup.webp`); its asset prompt is in docs/ART_ASSETS.md §4.3.

## [0.21.0] - 2026-10-08

Special balls, trials and blessings (GAME_DESIGN §15): later stages get harder and every run gets its own build.

### Added

- **Magnet**: a special ball from the dropper (2% of drops). Tap a landed cat or boulder to select it (a pulsing gold ring), then **Take**: it flies up into the paw and is dropped like any cat. The Take button ignores taps in its first 0.3 s. A ball bigger than the biggest drop is shown at size 4 in the paw and drops at its true size. First-run hint: "Tap a cat, then Take".
- **Boulder**: from stage 2 (3% of drops), a grey stone that never merges. A merge whose cat is within 15 world units of it knocks off an iron band; the bare stone breaks on the next one, paying nothing. Stage clears and Lucky Saves crumble boulders too.
- **Golden cats**: a golden cat merging with a cat of its tier makes a cat two tiers up (never past the stage's last cat). It glows gold, in the jar, in the paw and in NEXT.
- **Stage-clear picks**: after the last cat settles, a trial (More Boulders, Iron Bands, Big Boulders) and then a blessing (More Magnets, Big Drops, Golden Cats), 1 of 3 each, stacking by level for the run; no rarities, no reroll. At the last stage the picks come at once. A debug jump skips them.
- The NEXT bubble shows magnets and boulders; sounds for the magnet's catch, a band coming off and a boulder crumbling.
- Debug: give a magnet, boulder or golden cat, open the picks, set a pick level; hooks for e2e (`take`, `choose`, `ballPoint`, …).

### Removed

- **Golden Merge** (a merge's chance to pay ×3 coins). Save v5 gives back the coins spent on it.

### Notes

- The special balls are drawn in code and kept simple until the owner's art. With `?skin=placeholder` a boulder shows the merges it still needs as a number (it turns with the stone).
- All numbers are starting values; balance and the economy come later (the owner's call).

## [0.20.1] - 2026-10-08

The main menu's layout after the owner's first look on a phone.

### Changed

- The coins pill comes out of the screen's right edge, like the HUD's coins card.
- On taller screens the logo, the cat, the record cards, PLAY and UPGRADES move up together into the free height (a fifth of it; the logo three fifths), so the logo sits closer to the top bar.
- The cat, its glow and its sparkles are centred between the logo and the record cards.

## [0.20.0] - 2026-10-08

The main menu in the owner's art, laid out on the owner's mockup (M13, docs/ART_ASSETS.md phase 4).

### Added

- The main menu is the owner's mockup: the painted shrine garden, the "Maneki Merge" logo, the golden cat on its pink cushion with a warm glow and twinkling sparkles, two record cards (BEST SCORE with the paw badge, BEST STAGE with a torii), a glossy coral PLAY pill, a cream UPGRADES pill with an arrow and its red dot, the gear button and the coins pill. Every piece sits where it is in the mockup, on a stage scaled to the screen; taller screens show more sky and the logo moves up into it. Labels and numbers are live text; long numbers shrink to fit their wells and the coins pill grows.
- `tools/buildMenu.ts` (`npm run art`) cuts the menu pieces from the owner's images: three-slice strips for the pills and wells, a nine-slice record card, the cushion recoloured to the mockup's pink, the logo's rim lightened, drop shadows cleared.
- Boot preloads the menu art with the cat art, so the menu shows up whole.

### Changed

- The install hint and the update badge sit small in the top bar, between the gear and the coins.
- UPGRADES and the gear keep a 48 px touch target on every screen: on short screens their box is taller than the mockup's pill, which is drawn in its middle at the mockup's size.
- The code-drawn menu of v0.14 stays for `?skin=vector`.

## [0.19.5] - 2026-10-08

Cats roll on the jar's floor, from the owner's playtest of the soft landing.

### Changed

- A cat alone on the floor or a curve rolls like a ball instead of sliding: it turns as fast as it moves. A cat dropped by a wall now turns about once on its way down and across (it turned an eighth of that, sliding). A merged cat keeps its own spin.
- The floor's rug is a little stronger (800 u/s², was 600), so a rolling cat still stops where it did, about half a second after landing.
- The chaos test's Lucky Save run may last 300 s (its bot now clears stage 1 after the saves and the run ends at 196 s).

## [0.19.4] - 2026-10-08

A soft landing on the jar's curved corners, the owner's choice among measured options.

### Changed

- A dropped cat whose first touch is a curved corner lands softly: over half a second its speed fades, gently at first and at the end (never more than 3% of its fall in one step), down to about a quarter. v0.19.3 stopped it dead at the touch, which jolted. It then slides down and rolls on towards the middle, and never swings across the jar.
- The floor slows a cat rolling alone on it like a rug (600 u/s²): it stops within about half a second instead of rolling for 5–8 s. Cats in a pile push each other as before.
- The physics stress test drops 110 cats instead of 150: as much cat as 150 were before v0.19.3's bigger sizes. With 150 the pile stood nearly twice the jar's height and passed or failed by luck of the seed.

## [0.19.3] - 2026-10-08

Cat sizes evened out and the jar's corners fixed, from the owner's playtest.

### Changed

- Cat sizes: the smallest cat is as big as the second one was (radius 34) and the 9 keeps its size (137), with an even, smaller step between every two sizes (× 1.19 instead of × 1.22): 34, 40, 48, 57, 68, 81, 97, 115, 137 and 163 for the stage's last cat (168 before). The jar now grows by 163 / 34 ≈ 4.8 at each stage clear instead of 6.
- The dropper band above the rim is 0.2 of the jar's width (0.18), so the bigger size 4 still waits above the rim. Every dropped cat falls as far as before, so the 1 s drop is unchanged; on a 390 × 844 phone the jar sits 2–3 px lower.

### Fixed

- Cats no longer slip into the bamboo at the jar's bottom corners: the physics corners have the art's radius (168 instead of 112).
- Cats no longer slow down on the bottom corners. A dropped cat whose first touch is a curve lands dead there, as on the flat floor, and then slides down at its natural speed and rolls on (before, the curve braked it on every step, so it crept down for 1–3 s). Landing dead keeps a cat dropped by a wall from being swung across the jar and up the other wall.

## [0.19.2] - 2026-10-07

The HUD cards measured against the owner's reference image.

### Changed

- The score card is shorter (66 px) with a thinner outline and softer corners; "SCORE:" is centred, and the score's well is a rounded pill in the reference's warm tan.
- The coins card is a small card (no longer a long strip) coming out of the screen's right edge, rounded on the left only: "COINS:" centred and bigger, and under it a small coin with the number, evenly spaced. It is CSS now; the tool cuts the coin out of the generated card.
- The pause button's outline is the reference's rose brown instead of dark brown.

## [0.19.1] - 2026-10-07

The HUD closer to the owner's reference image.

### Changed

- The score card is a soft square in the coins card's colours with the paw badge over its top-left corner, a bigger "SCORE:" and the score in a sunken tan well (it was a long thin pill like the coins card).
- The coins card runs off the screen's right edge, is thicker, and shows its number bigger.
- Both numbers are white with a thin brown edge.

## [0.19.0] - 2026-10-07

The owner's HUD art (M13, phase 3 of docs/ART_ASSETS.md).

### Added

- The score and coins cards, the next-cat bubble and the pause button are the owner's images, with the labels and numbers as live text on them: "SCORE:" and the score after a pink paw badge, "COINS:" and the run's coins after a gold coin, "NEXT" on the bubble's tag. Flying coins land on the card's coin.
- `npm run art` also builds the HUD (`tools/buildHud.ts`). The score card is the coins card with the paw badge pasted over its coin, since the generator kept drawing the score panel in another style.

### Fixed

- The art pause button is 48 px, the touch-target minimum (it was 46).

## [0.18.0] - 2026-10-07

Clearer cats and a smaller HUD, from the owner's comparison with the reference image.

### Added

- A thick dark outline round every cat (5% of its radius, at least 4.5 world units), drawn by the game so all nine looks and all sizes get the same line; the body shrinks by as much, so touching cats still touch. The HUD's cat icons get a 1 px outline.

### Removed

- The stage card (stage label, progress bar and goal cat) under the score card, until the owner has art for it. The banners still announce stage clears and the next goal.

## [0.17.0] - 2026-10-07

The owner's scene art (M13, phase 2 of docs/ART_ASSETS.md).

### Added

- The bamboo jar, the calico paw and the painted shrine-garden background from the owner's images. The jar's glass rim and top rail are drawn behind the cats, its bamboo in front; the paw's arm stretches up to the top of the screen; the background follows the jar so its feet stand on the painted rug, fades into the sky at the top and always spans the screen.
- `npm run art` also builds the scene (`tools/buildScene.ts`): it cuts the white, measures the jar's opening and splits the jar into its two layers.

### Changed

- The camera shows 0.19 of the jar's width beside each wall instead of 0.15, so the thicker bamboo and its rail fit on screen: the jar is 283 px wide on a 390 px phone instead of 300.
- `?skin=vector` (and the fallback when the art can't load) also brings back the vector jar, paw and garden.

### Decisions (where the request was open)

- The physics corners stay at radius 112: the art's corners are rounder (168), and matching them changed the physics tests' settled piles. A cat deep in a corner tucks a few pixels behind the bamboo, which is drawn in front of it.
- The background's own rug is used; the separate rug image is kept in `art-source/` but unused.
- The jar's caps don't flash red in danger with the art (the dashed rim line still does).

## [0.16.0] - 2026-10-07

The owner's cat art (M13, phase 1 of docs/ART_ASSETS.md).

### Added

- Nine new lucky cats, raster art the owner generated with an AI image tool: round maneki-neko balls, each one body colour with a lighter belly, one raised paw and a collar with a gold bell (Shiro, Kuro, Mikan, Sora, Sakura, Matcha, Fuji, Aka, Kin). They are the default skin (`ArtSkin`), in the jar, the dropper, the HUD, the banners and Game Over.
- `npm run art` (`tools/build-art.ts`, sharp): cuts the images' white background, fits each body circle so touching cats touch on screen, and writes `public/assets/cats/*.webp` and `src/config/catSpriteData.ts`.
- docs/ART_ASSETS.md: the asset plan, the prompts and the checklist for the owner's art phases.
- `?skin=vector` shows the code-drawn cats of v0.11–v0.15.

### Changed

- The cats show no numbers (the owner's call): a cat's look tells its size. The vector and placeholder skins still show them.
- The menu's hero is the golden Kin (the calico with `?skin=vector`).
- The service worker also precaches `.webp` files.
- Audio unlocks only when the sound setting is switched on (or on a tap), not when boot or a profile change re-applies it while the browser still counts a recent gesture.

## [0.15.0] - 2026-10-07

Shorter stages: the stage loop runs on 10 cats.

### Changed

- Every stage holds 10 cats instead of 11. Merging two 9s makes the stage's 10th cat, which clears the stage; the jar grows and that cat becomes the new stage's 1st cat, as before. Stage 1 holds tiers 1–10, stage 2 10–19, stage 3 19–28, stage 4 28–37 and stage 5 37–46.
- The jar grows (and the camera zooms out) by 168 / 28 = 6 per stage instead of 7.32.
- The HUD goal, the "New cats unlocked!" banner, the debug spawn list and the Jackpot (5 × C(10) = 595 coins at stage 1) follow the new last cat.
- The camera shake starts at merges into size 9, so the two biggest merges still shake.
- Save format v4: a record tier above 46 (the old stage 5 went up to 51) is capped at 46.

### Removed

- Size 11 (radius 205), and with it the tenth cat look (Kuro, the black cat) and the tenth placeholder colour (white): the stage's last cat wears look 1, because it becomes the next stage's first cat. Kuro is in the git history.

### Decisions (where the request was open)

- Sizes 1–10 kept their radius (the v0.12 precedent), so the last cat is smaller than before (0.28 of the jar's width instead of 0.34) and a stage needs less room to clear. The Suika-like jar coverage was tuned with size 11; the owner's playtests decide whether the radii need a new tune.
- The look that left is the last one (Kuro), as Kimono did in v0.12.

## [0.14.1] - 2026-10-07

HUD layout from the owner's marked-up screenshot.

### Changed

- The score card lost its paw-print badge and is narrower (116 px instead of 166 px); "SCORE:" and the score are centred.
- The stage card is as narrow as the score card and as tall: "STAGE N" centred on top, a thin progress bar, and "STAGE N+1 =" with the cat that opens it (the stage's last cat). At the last stage it reads "GOAL =".
- The next cat moved under the coins card, on the right, in a round glass bubble without the speech-bubble tail, with a small "NEXT" tag on its rim.

### Decisions (where the request was open)

- The progress bar stays, thin, between the two rows of the stage card, so the player still sees how close the next stage is.
- On short screens (375 × 667) the bubble reaches the dropper's height, so the paw passes under it when aimed at the far right.

## [0.14.0] - 2026-10-07

The game screen from the owner's second design canvas: the "Sakura garden" design (M12).

### Changed

- The whole screen is the scene now, and the HUD floats over its top. On the left a cream score card with a paw-print badge and the score in a sunken well, with a stage card under it; on the right the next cat in a glass speech bubble, a glossy pink pause button and a coins card that runs off the right edge. Touches over the cards still aim; only the pause button is a button.
- The dropper is a calico cat's paw hanging from the top of the screen. It holds the next cat by the head, follows the aim, lifts a little when it lets go, and hides while the jar grows. The aim guide is dotted.
- The jar is a bamboo frame with a curved bottom and a glass back, standing on two bamboo feet on a mint rug, with a far rail tied to the posts and cut bamboo caps. The caps and the dashed rim line flash red in danger.
- The physics jar has the same curved bottom: its floor's corners are quarter circles of radius 112 (0.19 of the jar's width). A cat landing alone on a curve slides gently into place instead of being launched across the jar.
- The background is the sakura shrine garden: clouds, sakura branches and trees, a torii and a shrine seen through the glass, stone lanterns either side, a wooden floor. It is drawn around the jar and lines up with it on every screen size, also while the jar grows.
- The jar is 300 px wide on a 390 px phone (the design's proportions; it was about 350 px), and it sits between the HUD and the bottom edge.

### Decisions (where the request was open)

- "Move the box a little higher": the jar sits midway between the HUD and the bottom edge, which on a 390 × 844 iPhone puts its rim at 287 px (the design had 327 px) with the same width.
- The dropper stays where it was in physics (just above the rim), so a drop still takes exactly 1 s; the paw's arm reaches up to the top of the screen from there.
- The cats are still v0.11's lucky cats: new maneki-neko cat sets are on the design canvas for the owner to choose from.
- The 150-cat stress test now averages speeds over 0.1 s: the curved jar's taller pile shows more single-step velocity jitter, but its cats move no more than on the flat floor (TECH_SPEC §5).

### Known issues

- A narrower jar means smaller cats on screen (about 15% smaller than in v0.13). Say if the jar should be wider again: it is one number (`CAMERA_SIDE_MARGIN_RATIO`).

## [0.13.0] - 2026-10-06

Physics feel: the owner's fourth feedback batch (M12).

### Changed

- Merging: the new cat is born at rest exactly between the two cats that met. Until now it kept their average velocity (up to 400 u/s), so a cat landing on another drifted down towards the lower one while it grew.
- A merged cat starts to turn gently, as if another cat had clipped it: the way its parents slid past each other (a cat landing on the right shoulder of another turns clockwise), its rim moving at 80 u/s, so small cats turn faster than big ones. On the floor it rolls a short way.
- Drops are faster: a dropped cat reaches the empty floor in 1 s (1.6 s before). Gravity 900 → 2150 u/s², the speed limit 1500 → 2400 u/s. Everything else falls faster too.
- The floor never bounces: a landing cat stops dead. Cats still bounce a little off each other and off the walls (restitution 0.25).
- Cats shove each other harder: friction 0.1 / 0.3 → 0.05 / 0.2, and the floor and walls now use the same values (they had matter-js's 0.1 / 0.5, which gripped harder than the cats' own values); inertia × 3 → × 2, so pushed cats roll aside; mass ∝ r^1.4 → r, so big cats are lighter next to small ones. Measured headless against v0.12: a small cat rolling into a big one moves it 47 units instead of 21, a cat dropped into a narrow gap pushes its neighbours 397 units apart instead of 109, a cat landing on a bigger one's shoulder shoves it 170 units instead of 47.

### Decisions (where the request was open)

- "Reach the floor in exactly 1 second": measured from the dropper to the empty floor. The dropped sizes differ in radius, so size 1 takes 1.00 s and size 4 0.99 s.
- Faster drops come from stronger gravity rather than a downward throw: the cat still starts from rest and speeds up, and merged or rolling cats fall as quickly as dropped ones.
- "No bounce on the floor" covers the floor only. A cat landing on a cat that rests on the floor hardly bounces either (the floor absorbs the push); cats meeting in the air or on a pile still bounce a little. Say if they should land dead everywhere.
- The direction of the turn follows the parents' motion instead of a random pick, so it looks like the hit that started it. Cats that meet head-on keep the way they were turning; cats that weren't turning take a side from their ids.

### Known issues

- The 150-cat stress pile (cats overfilling the jar all at once) settles more slowly than before (under 75 u/s after 7–9.5 s instead of 3–4.5 s) and its deepest overlap grew from 4–5% to 8–13% of a radius. Normal play isn't affected in the headless bot runs: resting cats are as still as before.
- A physics step with 150 cats takes 0.93 ms instead of 0.78 ms on the dev machine (budget 2 ms).

## [0.12.0] - 2026-10-06

Physics and balance: the owner's third feedback batch (M12).

### Changed

- Physics: the cats are lighter, a bit more elastic and push each other more easily. Friction 0.2 / 0.5 → 0.1 / 0.3, restitution 0.1 → 0.25 (a dropped cat bounces about its own radius instead of a few units), gravity 1000 → 900 u/s², mass ∝ r^1.5 → r^1.4 (big cats are lighter next to small ones), inertia × 4 → × 3. Measured headless: a small cat rolling into a big one moves it 45% further, a cat dropped into a narrow gap pushes its neighbours 20% further apart; piles still settle in about 4 s.
- A stage is cleared by merging two 10s: every stage holds 11 cats now (size 12 is gone), so stage 1 has tiers 1–11, stage 2 11–21, … stage 5 41–51. The 11 is the stage's last cat: it wears the first cat's look, the other cats pop into their value, and the jar grows by r(11) / r(1) = 205 / 28 ≈ 7.32 into the next stage.
- Every stage is open: no locks, no "Expansion locked" toast, no lock on the HUD. A clear at stage 5 says "Stage clear!" and play goes on.
- Big Catch: each level moves 3 points of the drop chances from the smallest cat to the biggest (and 1 point from size 2 to size 3), so the biggest drop goes 10% → 13% → 16% → 19% → 22% → 25% (it was 10% → 12% … 18%; the old formula gave less and less per level).
- Golden Touch is now **Golden Merge**: +3% per level (3% at level 1, 15% at 5) that a merge pays ×3 coins, Jackpots included. A golden merge shows a bigger "+coins", bursts gold sparks, rings a bell and sends three coins to the counter. Dropped cats are never golden any more. Same prices; the level carries over.
- The HUD shows one next cat.

### Removed

- Shrine Expansion and Fortune Teller. The save format is now version 3: a version-2 save gets back every coin spent on them (1500 + 10000 + 60000 and 400), its Golden Touch level becomes Golden Merge, and a record tier above 51 is capped at 51.
- The menu's "Unlock Stage N" goal card, golden cats (gold ring, sparkles, glint, HUD shimmer) and the toast.
- The eleventh cat look (Kimono): with 11 sizes the last one wears look 1, so ten looks are used. It is in the git history.

### Decisions (where the request was open)

- "Lighter": a uniform change of density does nothing in matter-js (gravity accelerates every mass alike), so lighter means a little less gravity, big cats lighter relative to small ones, and less grip.
- Big Catch's old formula could not give 1.5–2× more per level (its last levels add about 1 point however high the factor), so it became a straight 3-points-per-level tilt.
- Golden merges roll on their own seeded generator, once per merge at every level, so a seed drops the same cats whatever the Golden Merge level.
- The chaos test now allows the one-step poke into a wall that matter-js makes about once in 300 000 ticks (a light cat squeezed by a newly merged neighbour, back inside on the next step). It happened with the old physics too.

### Known issues

- Jackpots need two last cats in the jar at once, but a clear pops the older one, so in play they practically never happen (as before).
- Balance is still untested on phones: coins after stage 2 grow very fast, and every stage is now reachable from the first run.

## [0.11.0] - 2026-10-06

The new look: the owner's second feedback batch (M12), built from the design canvas the owner approved and the mobile game UX research.

### Added

- Lucky cats instead of numbered circles: eleven looks drawn in code from vector shapes (`src/config/catArt.ts`), one per size, from a plain pink mochi to a kimono cat with both paws raised. Size 12 wears size 1's look, so the stage loop still swaps them seamlessly. The outer edge of each outline is the physics radius, so touching cats touch on screen.
- Each cat's number sits on its plate (belly, tag, plate or koban) and stays upright as the cat rolls. Golden cats get a gold ring, a warm tint and sparkles.
- Settings panel, opened from the gear on the menu: Sound effects, Haptics (only where the phone can vibrate), Reduce motion, How to play (the first-run hints come back) and the version. Each switch is a full-width row that says ON or OFF in words.
- Reduce motion setting: no camera shake, fewer particles, one flying coin, no decorative animations; banners fade instead of popping. The phone's own reduced-motion setting still does the same. Saved in the settings (no migration: older saves get it off).
- Next goal card on the menu: "Unlock Stage N" with a bar towards the next Shrine Expansion price and "N to go"; tapping it opens the shop.
- Shop cards say "Need N more" under a price you can't afford yet.

### Changed

- A cream shrine-garden theme with ink outlines: buttons stand on a solid ink edge and sink into it when tapped; coral only for the one primary button of a screen, gold for coins and progress, red for danger and badges, mint for secondary buttons.
- Main menu: settings on the left, coins on the right, the title, the calico lucky cat swaying on its cushion among floating coins in front of sakura trees, a shrine and a torii, the records, the goal card, a big round PLAY and UPGRADES. The sound toggle moved into Settings, and so did the version.
- The jar is glass in a bamboo frame on a wooden floor; gold knobs and a dashed line mark the rim and flash red in danger. Sakura branches, a torii and a shrine sit behind the glass.
- HUD: a "Score" label, the next cat in a bubble with a "Next" tag, and cat icons drawn from the same art. Pause, Game Over, banners, toasts, the combo label and the rotate screen use the new style.
- New icon set (mon coins with a square hole, gear, paw).
- Theme colour cream (`#fcefdf`); the iOS home-screen app uses the default status bar so its text stays readable on the light theme.

### Fixed

- With the phone's reduced motion on, banners and toasts vanished at once (every animation was cut to 0 ms); now they fade.

### Decisions (where the request was open)

- Cats keep rolling like Suika fruit; only their numbers stay upright.
- `?skin=placeholder` still shows the flat circles, in the game and in the DOM icons.
- The Haptics row hides on iPhones, which have no vibration for web apps.
- No music row until the game has music.

## [0.10.0] - 2026-10-06

The stage loop: the owner's first feedback batch (M12). M10 (balance simulator) is set aside.

### Changed

- Every stage has 12 cats. The only way to the next stage is to make the stage's last cat, the 12th, from two 11s (stage 1: two 11s → a 12). Score thresholds are gone; the score only counts for records.
- Stage clear: the moment the last cat is made, every other cat in the jar pops into its value, half of what merging two of them pays (merging two 4s pays C(4) = 5, so each pays 2.5 → 3). Lucky Save pops pay the same value now.
- The loop: the jar then grows by r(12) / r(1) ≈ 8.93 and the camera zooms out by as much, so the 12 ends up exactly as big as a 1 was and takes its place as the new stage's smallest cat (same size and colour, its own number). Stage 2 holds tiers 12–23, stage 3 23–34, stage 4 34–45, stage 5 45–56. Every stage plays the same (same jar, sizes, drops and goal); score S(t) = 2^t and coins C(t) = round(1.7^(t−1)) keep growing with the numbers.
- Cat sizes follow Suika Game: r(size) = round(28 × 1.22^(size−1)), so cats 11, 9, 8, 7, 6 and 5 cover 55% of the jar and pile up to 88% of its height, like the same six fruits in Suika's box (about 55% and 86%).
- The jar sits higher on tall screens: 45% of the spare height now goes below the floor (on a 435 × 967 phone the rim moved from 378 to 289 px and the floor from 963 to 875 px, where the owner's sketch put 277 and 884).
- Expansion sequence (2.1 s): the clear (0.5 s, the other cats pop and the 12 settles), the zoom (1.2 s, time stop, an even zoom even across ninefold), the reveal (0.4 s). The physics world is rescaled at the reveal instead of growing, so the jar, gravity and speed limits are the same at every stage.
- Queued cats keep their size across an expansion (a queued 3 becomes a 14), with no new rolls.
- HUD: the bar shows the biggest cat in the jar against the stage's last cat, and that cat sits after the bar as a small goal icon. Banners: "The shrine grows!" at a clear that grows the jar, "Stage clear!" at one that can't, "New cats unlocked!" with the next goal at the reveal.
- Locked or last stage: the clear still pops and pays, the last cat stays and play goes on; a locked clear shows the "Expansion locked" toast every time. Two last cats make a Jackpot.
- Placeholder colours repeat every 11 tiers (size 12 = size 1's colour), so every stage looks the same. Body textures are shared by all stages; only the numbers are drawn per stage.
- Merge pitch, particles and camera shake follow the cat's size, not its tier, so every stage sounds and feels the same. A stage clear plays the Jackpot fanfare.
- Numbers from 10^15 show as Qa and from 10^18 as Qi.
- The invisible part of the walls is 4 jar heights tall.
- Debug: the spawn list counts sizes 1–12 of the current stage; `setStage(n)` clears stage after stage; `state()` adds the stage's first and last tier and the bar's progress.

### Removed

- Quick Growth (−6% expansion thresholds): there are no thresholds any more. The save format is now version 2: a version-1 save gets every coin spent on Quick Growth back (150 + 300 + 600 + 1200 + 2400 for all 5 levels).

### Decisions (where the request was open)

- The pop value is half of the base C(t), with multipliers, golden ×3 and the 1-coin minimum, rounded once when paid.
- Shrine Expansion still opens stages 3, 4 and 5. A clear at a locked stage pays but keeps the jar; the last cat stays in it.
- The 12 finishes growing and settles alone for 0.5 s before the zoom (physics runs, input waits), so it never pokes through a wall; time stops for the zoom and the reveal.
- 5 stages, as before (tiers up to 56). Stage-5 scores pass 2^53; the save accepts them.
- The jar keeps its 600 × 870 shape (the sketch kept it); only the cat sizes follow Suika.

### Known issues

- Making the 12th cat means having two 11s in the jar at once, about as hard as two watermelons in Suika Game. Clearing stage 1 may be rare; the owner's playtest decides.
- After stage 2 the coins grow very fast (C(23) = 117,456 per merge), so every upgrade becomes cheap. Balance was not tuned (M10 skipped).
- During the ninefold zoom the old stage's textures are shrunk a lot for about a second (no mipmaps in WebGL1); at the reveal everything is sharp again.

## [0.9.0] - 2026-10-06

### Added

- M9: audio, haptics and juice.
- Procedural Web Audio sound effects, no files (GAME_DESIGN §12): drop plop, merge pop (lower for bigger cats), coin ching, rising combo notes, Jackpot fanfare, expansion whoosh and chime, danger tick (rising 3, 2, 1), game over, UI click and purchase.
- Mixer: per-sound gains, a master gain and a limiter; per-sound throttling (minimum interval, voice count) and a global voice cap, so 10+ simultaneous merges never clip.
- iOS audio unlock: the AudioContext is created inside the first tap and resumed on later taps until it runs; it is suspended in the background and when sound is off.
- Haptics on Android (`navigator.vibrate`): a light tick per merge (rate-limited), stronger patterns for Jackpots, expansions and Lucky Saves; the Pause toggle is respected. Nothing on iOS.
- Juice: particles in the new cat's colour on every merge, a scale bump on the merged cat, camera shake for tier 10+ merges, Jackpots and long combos, a "Combo ×N" label that heats up at ×4 and ×7, a pulsing danger countdown, and gold sparks along the grown rim at an expansion's reveal.
- Menu micro-animations: a floating title, a ripple ring on PLAY, a nudging UPGRADES dot and a deeper button press.
- `prefers-reduced-motion`: no shake, about a third of the particles, no menu idle animations.
- Run event `dangerTick { secondsLeft }`; `merged` now carries the new cat's `id`.
- Debug: `mergeBurst(pairs, tier)` (and a "Merge ×10" button), `audio()` (context state and output peak), `renderPeak(merges)` (offline render through the real mixer).
- Tests: pitches, voice throttle, haptics, shake, feedback wiring, the danger ticks and the merged id (unit/headless), and `juice.spec.ts` (audio unlock and toggle, 12 simultaneous merges peaking below 1).

### Decisions (where the docs were open)

- "Shake for combo escalation": a light shake from ×5 that grows with the combo (capped), plus the heating label and rising notes.
- "Expansion polish": a second spark sweep along the new rim at the reveal, a whoosh at the start and a chime at the reveal, and a haptic pattern.
- The clipping acceptance is checked by rendering the sounds offline (OfflineAudioContext) through the real mixer, because a live meter in headless browsers depends on the machine's audio device and load.
- Audio E2E runs in Chromium only: Playwright's WebKit build has no reliable Web Audio (none on Windows). Real iPhones are checked by the owner.

### Known issues

- iOS plays no sound with the silent switch on (a web audio limit). iOS has no vibration API for the web.

## [0.8.0] - 2026-10-06

### Added

- M8: the meta loop. Play, earn coins, buy permanent upgrades in the shop, play stronger.
- Shop panel (GAME_DESIGN §2.2): a sheet that slides up over the menu with the balance and a close button, and one card per upgrade: an icon, the name, the effect, the "current → next" value (e.g. "Coins +45% → +60%"), level pips with "3/10", and a price button that is affordable, disabled when coins are short, or MAX. Buying pulses the card and counts the balance down. The list scrolls; the back button, the close button or a tap above the sheet closes it.
- `Profile.buy(id)`: spends wallet coins on the next level and writes the save at once.
- `core/shop.ts`: what each card shows (price state and the value of every upgrade at every level).
- Menu: the UPGRADES dot shows when any upgrade is affordable; best score and best stage are two labelled chips under the title.
- Debug: the upgrade level field follows the chosen upgrade's max level.
- Tests: purchases in the profile (written at once, refused when maxed or too expensive, retried after a refused write), the shop cards, every upgrade bought through the profile changing the next run (headless), and E2E for buying with debug coins and reloading, the back button, Fortune Teller's 2 previews, Shrine Expansion Lv 1 opening stage 3, and the menu and shop fitting 375×667, 390×844 and 430×932.

### Changed

- UPGRADES is no longer "Soon".
- GAME_DESIGN §2.1 and §2.2 and TECH_SPEC §3, §7, §8 and §11 describe the shop, the card values and the purchase write.

### Decisions (where the docs were open)

- Each card's value is one number that the upgrade changes: for Big Catch it is the share of stage 1's largest drop tier (10% → 18% over 5 levels), for Quick Growth the thresholds as a percentage of normal (100% → 70%). The table is in GAME_DESIGN §2.2.
- The upgrade effects were already wired into runs in M3–M7; M8 adds a test per upgrade that buys it and compares a run with level 0.
- Upgrades bought apply from the next run (the shop only opens from the menu, so there is never a run in progress).
- The purchase sound arrives with the rest of the audio in M9.

### Known issues

- No purchase sound yet (M9).
- The title is still text until the final art (M13).

## [0.7.0] - 2026-10-06

### Added

- M7: coins and records now work end to end and survive restarts.
- `core/profile.ts`: the save in play. Wallet, upgrades, records, stats, settings and first-run hint flags, written to `localStorage` with a throttle (the first change after a quiet second at once, then at most once per second) and flushed on backgrounding, page hide, game over and leaving a run. A refused write is retried.
- `run/profileRun.ts`: every run starts with the saved upgrades and banks each payout into the wallet before its event fires; best score, best stage, highest tier, merges, Jackpots, coins earned and runs played update while the run plays.
- Boot loads the save (repairing or backing up a damaged one) and asks the browser to keep storage persistent. The menu shows the saved coins and best score/stage; sound and haptics settings persist; the first-run hints only show until they have been seen once.
- Payout feedback: a gold "+coins" for every merge, Jackpot and popping cat, and a coin that flies from there to the HUD counter, which bumps as it lands (a shower of 8 for a Jackpot).
- "Combo ×N" from the second merge in a row, with the Combo Charm bonus as a chip ("+16%"); it pops at each step and fades when the combo window passes.
- Jackpot celebration: a gold "Jackpot!" banner with the payout, a bigger "+coins" and a spark burst. Golden merges burst gold sparks.
- Golden cats twinkle with an upright star glint (also in the dropper); golden icons in the HUD preview shimmer.
- Lucky Save: a "Lucky Save!" banner ("1 left" while saves remain); its pops pay out and fly coins like cash-out pops.
- Game Over: coins earned this run, the biggest cat made, and a badge for each record broken (best score, best stage, biggest cat ever).
- Debug: spawn golden cats, "Danger timeout" (`forceDangerTimeout`: a Lucky Save if one is left, else game over), "Reset save"; `state()` shows the combo and Lucky Saves left; debug coins and upgrade levels go into the save.
- Tests: the profile and its write throttle (unit), the payout pipeline from physics merges to storage with Lucky Paw, combo, golden, Jackpot, cash-out and Lucky Save (headless), and E2E for coins surviving a reload in the middle of a run, saving on backgrounding, persisted settings/records/stats/hints, Game Over badges, Lucky Save, combo and Jackpot banners.

### Changed

- Merges show the coins they pay instead of their score (GAME_DESIGN §12); the score is in the HUD.
- GAME_DESIGN §2.3 and §12 and TECH_SPEC §3, §7, §8 and §11 describe the payout feedback, the profile and the new hooks.

### Decisions (where the docs were open)

- Records update during the run, not only at its end, so a crash or a closed app keeps a new best score; the Game Over badges compare against the records from the run's start.
- "Runs played" counts when a run starts, because a run closed with the app never reaches an end.
- Debug coins go into the wallet but don't count as coins earned.
- The HUD coin counter shows the true run total at once; the flying coins are decoration and are skipped when 24 are already in the air.
- "Combo ×N" sits 30% of the jar's height below the rim, text only, so it doesn't hide the pile or collide with the expansion banners.
- The Game Over overlay gained a "Biggest cat" row so the highest-tier record has something to point at.

### Known issues

- Two windows of the app open at the same time each keep their own copy of the save; the last one to write wins. Rare for a home-screen app; to be looked at in M11.
- A hard kill without a page-hide event can lose at most the last second of changes (the write throttle from TECH_SPEC §8).
- UPGRADES is still "Soon": the shop and the affordability dot arrive in M8. No sound or haptics yet (M9).

## [0.6.0] - 2026-10-05

### Added

- M6: the expansion, the game's signature moment. Passing a threshold stops time, the camera pulls back, the walls slide out and the rim rises, the smallest cats pop into coins, and play resumes at the new stage with bigger cats unlocked. Works through every stage up to 5.
- `game/expansionView.ts`: camera, walls and rim come from the run's tick timeline plus the fraction of a tick the frame is into (`RunController.renderAlpha`), so the zoom stays smooth at 60/90/120 Hz and never drifts from the physics. The camera leads and the walls trail it (`EXPANSION_WALL_LAG`), so the jar visibly widens into the new frame; the floor stays still on screen.
- One cat texture set per stage, drawn at that stage's zoom during the expansion and switched in at the reveal: stage 5 stays as sharp as stage 1. Only stage 1, the previous and the current sets are kept.
- Cash-out pops: each popped cat grows and fades in place, one after another, with a gold "+coins" (`PopFx`).
- Gold sparks along the rim when the shrine grows (`SparkFx`).
- Banners: "The shrine grows!" and "New cats unlocked!" with the new tiers' icons, placed in the empty top of the grown jar; they pause with the run. A locked stage shows "Expansion locked — upgrade the Shrine in the shop" once per run, and the HUD lock pulses.
- HUD: the stage label glows at each new stage, the bar resets without sliding back, and stays full and gold at stage 5.
- Run events: `expansionRevealed { stage, newTiers }` when the zoom ends; `catPopped` carries the cat's id.
- Debug: "Jump to stage" (`setStage`) now plays every expansion in turn and opens locked stages for that run (`RunController.jumpToStage`); "Set score" keeps the locks. `state()` shows the running expansion and the lock.
- Tests: a pile carried through every expansion to stage 5 (nothing escapes, launches or moves during the time stop), cash-out amounts and event order, the time stop freezing cooldown and combo, Quick Growth thresholds, Shrine locks, caps, Jackpots and drop pools at every stage, a replay through four expansions; unit tests for the expansion frames and texture sets; E2E for the first expansion, the locked toast, a resize and a pause mid-expansion, and the debug jump.

### Changed

- The pop ring texture is 512 px, and up to 48 merge effects play at once (a cash-out can pop dozens of cats).
- TECH_SPEC §4, §6, §7 and §11 describe the final expansion visuals, textures per stage, banners and hooks.

### Decisions (where the docs were open)

- No Phaser camera effects or tweens for the expansion: they run on the wall clock and would drift from the tick timeline and ignore pauses.
- The walls trail the camera by a quarter of the zoom, so the widening is visible; `EXPANSION_WALL_LAG = 0` would lock the jar to the frame. To be judged on the phones.
- Cash-out pops go off 30 ms apart, at most 240 ms in all, so they end within the reveal.
- Banners centre 15% of the jar's height below the rim; on tall phones a fixed position covered the dropper. The locked toast sits at the top of the play area, under the HUD lock it explains.
- "New cats unlocked!" stays 2 s, a little into play, because the reveal (0.4 s) is too short to read it.

### Measured

- Four expansions in a row (stage 1 → 5) in Chromium on the GPU at 390×844, DPR 3: median frame 16.7 ms, 99th percentile 16.8 ms; one 33 ms frame in the first of three runs, none in the others.

### Known issues

- The expansion has no sound or haptics yet (M9).
- Cats over the danger line when an expansion starts are usually below the new, higher rim afterwards, so an expansion can rescue a full jar. That follows GAME_DESIGN §7.1; M10 looks at the balance.

## [0.5.0] - 2026-10-05

### Added

- M5: the first playable version. PLAY starts a run with placeholder cats; the Phaser canvas renders it and forwards input.
- `game/GameScene.ts`: renders the run each frame and sends `drop(x)`. The dropper follows the finger or mouse, a release or tap drops, releases during the cooldown are ignored, and the next cat pops in.
- Aim guide: a dashed line down to where the cat first touches something, with a faint ghost circle there (`game/aim.ts`, tested against the real physics).
- `game/cameraFit.ts`: fits the jar, the dropper band and the margins into the play band, letterboxed with the floor at the bottom; re-fits on resize and rotation.
- `game/skins/`: the `BallSkin` interface and `PlaceholderSkin`: a colour per tier, darker outline, highlight arc that shows rolling, gold ring and sparkles for golden cats, and upright tier numbers in Fredoka as separate sprites. Textures are sized so they are never upscaled.
- `game/BallRenderer.ts`, `game/JarView.ts`, `game/fx/MergeFx.ts`: pooled cat sprites, the wooden jar with its rim, the danger flash and countdown, and merge pops with a floating "+score".
- High-DPI canvas: rendered at devicePixelRatio (capped at 2.5) and shown at CSS size. The game loop sleeps on the menu.
- DOM HUD: pause, score, run coins, next-cat preview, stage label and progress bar with a lock icon.
- Pause overlay (Resume, Sound, Haptics, Quit to Menu) and Game Over overlay (score, best, stage, coins, "New best!", Play Again, Menu).
- Back button: game → pause → menu. Backgrounding the app or turning a phone sideways pauses the run.
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats".
- `?debug=1` panel (FPS, body count, spawn tier, set score, jump to stage, set upgrade, add coins, game over) and the `window.__game` hooks from TECH_SPEC §11.
- `session.ts`: the composition root that starts runs and wires their events to the HUD, overlays and hints.
- Tests: camera fit for every stage and several viewports, aim landing, colour helpers and the placeholder palette; E2E for a whole run (10 drops, pause/resume, game over, play again, menu), tap-to-drop, backgrounding and the first expansion.

### Changed

- The temporary Back button on the game screen is replaced by the pause button; the E2E tests follow the new flow.
- The ESLint layer test gets a longer timeout (its first lint is slow while the suite runs in parallel).

### Decisions (where the docs were open)

- Until the save system (M7), the wallet, best score, settings, upgrade levels and seen hints live in memory for the session.
- The expansion past 500 points already works in a simple form: the camera and the drawn jar blend to the new stage during the zoom. M6 adds the full sequence.
- The danger countdown shows whole seconds (3, 2, 1) above the middle of the jar.
- The merge hint appears 0.6 s after the first drop and stays until the first merge.
- `?seed=` gives every run of the session the same seed, so Play Again replays the same drops.

### Known issues

- A random bot at 375×667 survived more than 5 minutes without a game over, and another reached stage 2 with 6,840 points: the game may be easy. M10 tunes the balance.
- Headless test browsers render in software at a few frames per second, and Chromium's SwiftShader drops parts of some sprites. Real GPUs are fine (checked on an NVIDIA GPU).

## [0.4.0] - 2026-10-05

### Added

- M4: a deterministic, headless Suika physics core and the whole run, running in Node.
- `physics/circleCollision.ts`: exact circle contacts for matter-js (cat–cat and cat–wall), about 2.3× faster than polygon SAT and with true rolling. matter-js is pinned to 0.20.0 because the module follows its internal collision record contract.
- `physics/geometry.ts`: jar geometry per stage (rim, dropper band, drop height) and drop clamping, shared with the future game scene.
- `physics/PhysicsWorld.ts`: the matter-js world with tall jar walls per stage, gravity and speed limits scaled by stage, pause, one fixed step at a time (`FixedStepper`: at most 5 per frame), first-contact tracking, growth of merged cats and speed caps.
- `physics/balls.ts`: cats with their own ids, tier, golden flag, growth and landing time; `BallView` for rendering.
- `physics/merges.ts`: merge resolution after each step (oldest first, one merge per cat per step), Jackpots at the cap tier, midpoint spawn with the average velocity, growth from the old size.
- `physics/danger.ts`: the over-the-line timer with landing grace, and Lucky Save victim selection.
- `run/RunController.ts`: drops with cooldown and queue, payouts banked before their events, combo timer, expansion timeline (time stop, cash-out at the end of the zoom, chained one stage at a time, instant mode for tests and the simulator), locked-stage notice, Lucky Save, game over, pause, debug hooks (`spawnBall`, `setScore`, `forceGameOver`) and `stateHash()`.
- `core/hash.ts` (FNV-1a over exact float bits), `RunEconomy.comboAt()` and `setScore()`, the `dropReady` event, `stepsFor()`.
- About 100 new tests: circle contacts, world, merges, growth without launches, danger, RunController, determinism (a run recorded at random frame lengths replays tick by tick with matching hashes), the TECH_SPEC §5 stability stress test, chaos runs played by a bot, and a performance test.
- `npm run test:perf`: the 150-cat step benchmark alone, without coverage (0.79 ms per step on the dev machine; budget 2 ms).

### Changed

- Coverage gates now cover `src/physics` and `src/run` too (90% lines).
- TECH_SPEC §4–§5 and §11 record the geometry, the final physics constants with their reasons, the measurements, the merge order, the anti-launch approach, the expansion timeline and the determinism strategy.

### Decisions (where the docs were open)

- When pairs compete for a cat, the oldest cats merge first.
- A merged cat inherits the earlier landing time of its parents, so a pile over the line keeps counting.
- A Lucky Save pops landed cats only; a cat still falling from the dropper is left alone. Ties among the smallest cats go to the older cat.
- The expansion time stop also freezes the drop cooldown and the combo window. The cash-out happens when the zoom ends, and the walls, gravity and drop pool switch at that moment.
- "New cats unlocked!" lists the tiers the new cap allows (8 and 9 at stage 2).
- When a merge reaches the next threshold on the same step the danger timer would run out, the expansion wins.
- Timers count whole fixed steps, so 2.5 s is exactly 300 steps.

### Known issues

- Tall piles creep slowly: with 150 cats at stage 5, a slip of up to 0.4 of a radius can still happen after 10 s (matter-js's soft stacking). To be checked on the phones in M5.
- A random bot with Quick Growth 5 and Shrine Expansion 3 survived 4 minutes and reached stage 4 without needing a Lucky Save: a hint for the M10 balance pass.

## [0.3.0] - 2026-10-05

### Added

- M3: every game rule from GAME_DESIGN as pure, headless TypeScript.
- `src/config/`: tiers (radius, score and coin formulas), stages (jar sizes, tier caps, drop pools, thresholds), upgrades (names, prices, per-level effects), economy, timings and physics tunables.
- `core/rng.ts`: seeded sfc32 generator with serializable state.
- `core/dropQueue.ts`: per-stage drop pools, base weights, Big Catch, the two smallest opening drops, golden rolls and one or two previews.
- `core/economy.ts`: score, coin payout (multiplier, combo, golden, minimum 1), Jackpot, cash-out and Lucky Save pops, combo counter, per-run bookkeeping.
- `core/upgrades.ts`: derived stats, prices, `canBuy`, `buy`, and the "anything affordable" check for the menu dot.
- `core/progression.ts`: thresholds × Quick Growth, stage locks, next expansion (one stage at a time) and HUD progress.
- `core/save.ts`: save schema v1, defaults, migration framework, field-level repair, corrupt-save backups, `SaveStore` over a `StorageAdapter` (localStorage + memory); `platform/storage.ts` opens localStorage safely.
- `core/events.ts`: typed event bus and the game's event catalogue.
- `core/format.ts`: number formatting (1,684 · 12.5K · 3.2M); the menu uses it.
- About 280 unit tests, including every table in GAME_DESIGN (§4, §7, the §8 example, §10) and lint tests that prove the layer import rules.

### Changed

- ESLint now enforces the full layer order (config → core → physics → run), keeps matter-js inside `physics`, and blocks more browser globals (`fetch`, `location`, `indexedDB`, …) in the headless layers.
- `npm run check` and CI run the unit tests with coverage and fail below 90% line coverage on `src/core`.

### Decisions (where GAME_DESIGN was open)

- Jackpots count as merges for the combo; cash-out and Lucky Save pops don't touch the combo, but a golden cat that pops still pays ×3.
- Coin payouts and thresholds round halves up and ignore floating-point noise (50 × 1.15 = 57.5 → 58).
- After an expansion, queued cats outside the new drop pool are rolled again and keep their golden flag.
- The short number format truncates instead of rounding, so a balance never looks bigger than it is.
- Every queued cat always rolls both tier and golden, so a seed gives the same tiers at any Golden Touch level.
- A save from a newer app version is backed up and loaded with the fields this version knows. Only the newest 3 save backups are kept.

## [0.2.0] - 2026-10-05

### Added

- M2: installable, offline PWA shell (vite-plugin-pwa, generateSW precache, prompt-style updates).
- Web app manifest (fullscreen, portrait), placeholder lucky-cat icon set generated from one SVG (`npm run icons`), apple-touch-icon and iOS home-screen meta tags.
- Main menu skeleton: title, records, coin balance, PLAY, UPGRADES (disabled until the shop), sound toggle, version.
- Game screen skeleton with an empty play area and a temporary Back control.
- Mobile foundation: safe areas, dynamic viewport height, no zoom/selection/callout/rubber-band, 48 px touch targets, bundled Fredoka font, red/gold theme tokens.
- Rotate-device overlay for phones in landscape.
- Install hints: iOS "Share → Add to Home Screen", Android "Install app" button.
- "Update ready — tap to restart" badge, shown on the menu only; updates never reload during a run.
- Android back button (game → menu), lifecycle hooks for pause/save, URL flags `debug`, `seed`, `skin`.
- Unit tests for URL flags, back stack, update policy and install detection; E2E tests for screens, layout at three phone sizes, rotate overlay, update badge and offline reload.

## [0.1.0] - 2026-10-05

### Added

- M1: project scaffold (Vite, TypeScript strict, Phaser 4, matter-js), folder structure for all layers.
- ESLint with headless-layer import rules, Prettier, Vitest, Playwright (iPhone/WebKit and Pixel/Chromium).
- Minimal boot screen with title and version label.
- GitHub Actions CI and GitHub Pages deployment.
- Project plan: `CLAUDE.md`, game design, tech spec, roadmap and prompts.
