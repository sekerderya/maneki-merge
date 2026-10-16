# Maneki Merge: Game Design

> "Maneki Merge" is a working title. Player-facing text says "cats"; code says `Ball` with a `tier`.
> Every number here is a starting value; the owner's playtests (M12) tune them (M10's balance simulator was set aside in v0.10). Keep this file in sync with `src/config/`.

## 1. Pitch

Drop lucky cats into a shrine jar. Two identical cats merge into a bigger cat and pay out coins. Every stage has 10 cats; merge two 9s into the 10th and every other cat pays out its value, then the jar grows: the camera zooms out until the 10th cat is as small as the first one was, and it becomes the first of a new stage of 10 bigger-numbered cats. Every stage is open from the start. Coins carry over between runs and buy permanent upgrades, and how far each blessing can go in a run (§10).

- Mobile, portrait, one-handed, offline. A mouse works too, for testing on desktop.
- A run lasts 3–20 minutes.
- Pillars: satisfying merges, the "the world just got bigger" moment, and steady permanent progress.

## 2. Screens

There are exactly two screens. Everything else is a panel or overlay on top of them.

### 2.0 Loading screen (v0.42.10)

Every launch opens on a loading screen, drawn before any script arrives: the menu's garden (the first jar's, in the day, since v0.51), the logo and the golden lucky cat (bobbing gently), with the loading bar near the bottom and "Loading…" under it: the in-game score card made long (the paw on its left end), whose caramel well fills with gold from the paw to the right as the game loads (v0.42.11, the owner's art). Behind it the game loads and decodes every image it will ever show (the menu, the coins, the Upgrades screen, the cats, the jars' backgrounds at the clock's time of day (§7.3; the other times' load when they are picked), the doors, the cards, the clips' posters), so nothing pops in later. On a launch after the first visit it also asks for a new version: if there is one, it reads "Updating…", installs it and restarts the app into it before the menu shows, so the player no longer waits for an update on the menu. Then it fades out over the menu (or over a saved run, paused). Until v0.42.11 the bar was drawn in CSS (docs/ART_ASSETS.md §4.17).

### 2.1 Main menu

The owner's mockup (v0.20, `art-source/menu/mockup.jpg`, §13.1), top to bottom:

- Top bar: the **settings** button (a round cream button with a brown gear) on the left opens the settings panel (§2.4); the coin balance on the right, in a cream pill with the gold coin (the HUD's, like every coin in the game since v0.42.4; a paw coin until then) that comes out of the screen's right edge like the HUD's coins card (v0.20.1; it grows to the left for long numbers).
- The logo "Maneki Merge": chunky coral letters on a cream rim, a gold bell on the "M" of "Merge", a few sakura petals.
- The hero: the golden lucky cat (raised paw with pink pads, red collar, gold bell) on a pink cushion with gold tassels, with a warm glow behind it and gold sparkles twinkling around it, in front of the painted shrine garden: since v0.51 the first jar's (sakura branches, a torii, a shrine, stone lanterns, a wooden deck and the jar's rug; the owner's call, so the menu and the game show the same place), at the time of day (§7.3). Until v0.51 the menu had a garden of its own with a stone path.
- Two record cards, "BEST SCORE:" and "BEST STAGE:", both the in-game score card (§2.3, v0.42.5, the owner's call), a little wider than the HUD's: the title on top, centred on the card's body (v0.42.7), the number in the caramel well in white with a brown edge (long numbers shrink to fit), centred between the card's icon and the well's right end (v0.42.8). BEST SCORE has the card's paw; BEST STAGE has no paw (v0.42.6: the card's round right end, mirrored, closes its left side) and a small red torii in the well's left end.
- **PLAY**: a big glossy coral pill, the only coral thing on the screen.
- **UPGRADES**: a cream pill with an up arrow, below PLAY. Shows a red dot when any upgrade is affordable and opens the shop panel.
- Install hint, shown only when the game runs in a browser tab. On iOS: "Tap Share, then Add to Home Screen". On Android Chrome: an "Install" button. It and the update badge sit small in the top bar, between the gear and the coins.
- **Scenes** (v0.44, §2.6): hidden from players; on a device that turned it on, a small cream pill under the gear opens the scenes for the owner's clips.
- An "Updating…" badge while a new version installs. Most updates now install on the loading screen (§2.0); one found later installs itself and restarts the app after a second on the menu with no panel open; one that arrives during a run waits for the menu. Tapping the badge retries a stalled update.
- The version and build hash live in the settings panel.
- **Ads** (v0.53, TECH_SPEC §16): only the Google Play app has them, rewarded ads from Google AdMob that the player chooses to watch, and only while the phone is online: offline no ad option shows at all, not even greyed out. The web app has none. Where they show and what they give (v0.54): a bonus ball once per stage, one more Lucky Save once per run, the run's coins doubled at Game Over (§2.7). In the EEA, the UK and Switzerland the app first asks for consent with Google's form, before the menu.

Layout: everything sits where it is in the mockup, on a stage of the mockup's size (768 × 1376) scaled to fit the screen and standing on its bottom edge, lifted clear of the home indicator. The garden spans the screen's width and stands on its bottom edge. A taller screen has free height above the stage: the stage moves up by a fifth of it and the logo by three fifths in all, and the cat (with its glow and sparkles) stays centred between the logo and the record cards (v0.20.1, the owner's call; v0.20.0 kept the stage on the bottom edge and moved only the logo). The top bar stays at the top of the screen, below the safe area. Every word and number is live text (Fredoka). With `?skin=vector` the menu is the code-drawn garden of v0.14: a round coral PLAY, the calico cat (look 6) on its cushion with floating coins, taking whatever height is left.

### 2.2 Shop panel (over the main menu)

- Slides up over the menu, which shows through blurred and a little darker. At the top, "Upgrades" on a cream pill, a round close button on the right, and the coin balance in the menu's coins pill under them (v0.31, the owner's approved mockup, §13.1), inside the header so it never covers the first card (v0.42.4; it hung over the list before).
- One card per upgrade (§10) showing its icon, the name with the level (e.g. 3/10), a one-line effect, the current → next value in the card's tan strip, and a gold Buy button with the price, standing on the strip's right end. The level pips are gone (v0.31, the owner's call); the level is the number.
- Under the four upgrades, the **Blessings** heading ("How far each blessing can go in a run", dark brown words with a cream edge) and the six blessing cards (v0.36, §10; Lightning since v0.42). A blessing card's icon is the blessing's own ball in a cream medallion with a gold rim, as on its pick card (§15.5); its effect line starts with "Blessing:".
- The last blessing card is the **Katana's** (v0.55, §10, §15.16), with its ball (the red katana ball) in the gold-rimmed medallion like the others; its levels open the Katana's picks, so its value is "Opens". (v0.55.0–v0.55.2 put it under a separate Weapons heading with the icon kit's katana; the owner's call in v0.55.3: among the blessings, with its ball.)
- The value each card shows (derived from §10; at MAX only the current value; a blessing card shows the blessing at the level a run can reach, without Big Catch):

  | Card          | Value                                                          | First level  | At max      |
  | ------------- | -------------------------------------------------------------- | ------------ | ----------- |
  | Lucky Paw     | Coins                                                          | +0% → +22.5% | +225%       |
  | Big Catch     | Biggest drop: the share of a stage's largest drop (size 4, §8) | 10% → 14%    | 46%         |
  | Combo Charm   | Per combo step                                                 | +0% → +12%   | +60%        |
  | Second Chance | Lucky Saves                                                    | 0 → 1        | 2           |
  | Golden Cats   | Up to (golden cats)                                            | 6% → 12%     | 30%         |
  | Big Drops     | Up to (biggest drop)                                           | 19% → 28%    | 37%         |
  | More Magnets  | Up to (magnets)                                                | 0% → 2.25%   | 11.25%      |
  | Hanabi        | Up to (hanabi)                                                 | 0% → 2.25%   | 11.25%      |
  | Joker Cat     | Up to (jokers)                                                 | 0% → 2.25%   | 11.25%      |
  | Lightning     | Up to (lightning balls)                                        | 0% → 1.5%    | 7.5%        |
  | Katana        | Opens: the pick its last level opened                          | – → Katana   | More Blades |

  Lucky Paw shows one decimal, the blessings' chances up to two (v0.39).

- The price button has four states: affordable (gold, "Buy" over the coin and the price), not enough coins (faded grey and disabled, "Need N more" in red where "Buy" was), MAX (faded, a check and "MAX"), and **locked** (v0.36: faded and disabled, "Reach" over a small torii and "Stage N", the stage that opens the card; the card's icon and value are faded too). With `?skin=vector` the shop keeps the code-drawn sheet of v0.14 (no pips either).
- Buying gives feedback: a sound (from M9), a card pulse, and the balance counting down. The purchase is saved at once. The panel scrolls vertically if needed.
- The UPGRADES dot on the menu shows only for a card that is open and affordable.
- Combo Charm, Second Chance and the Golden Cats, More Magnets, Hanabi and Joker Cat cards have a clip button on their icon that shows what they do (§2.5, v0.38).
- Closing: the close button, a tap on the dimmed menu above the panel, or the back button.

### 2.4 Settings panel (over the main menu)

- A card over the dimmed menu with a close button. Every switch is a whole row (icon, label, one line of help, and an ON/OFF switch that says its state in words too):
  - **Sound effects**: all sounds on or off.
  - **Haptics**: vibration; the row only shows where the browser can vibrate (Android).
  - **Reduce motion**: no camera shake, about a third of the particles, one flying coin per payout, and no decorative animations; banners fade instead of popping. The phone's own reduced-motion setting does the same whatever this switch says.
  - **Day and night** (v0.51, a crescent moon, "The garden follows your clock", on by default): the gardens follow the phone's clock (§7.3); off, they stay in the day.
- **How to play**: the first-run hints show again in the next run, so do the cards that bring a hazard or a rule in (§15.5, v0.50), and every clip button gets its new dot back (§2.5).
- The version and build hash, small, at the bottom, and beside them a **Privacy policy** link (v0.43: Google Play wants the policy reachable in the app) that opens `privacy.html` in a new tab, so the menu stays as it is. Seven quick taps on the version are the **tester reset** (v0.45, the owner's request): the save starts over at once (records, upgrades, stats, settings, hints and the saved run), with 1,000,000 coins in the wallet and the best stage at 20 (v0.45.1: past every upgrade's gate, so every card is open), the menu's Scenes button turns on (§2.6) and the app reloads. No confirmation. (In v0.44 the taps only turned the Scenes button on or off.) Exactly five quick taps and a pause (1.5 s) are the **account reset** (v0.50.1, the owner's request): the save starts over as a new player's (no coins, best stage 1, every card and hint unseen) and the app reloads; the Scenes button stays as the device has it. No confirmation. Tapping on to seven still makes the tester reset.
- **Privacy options** (v0.53, a shield, "Your choices for the ads"): only in the Google Play app, and only while AdMob says the player must be able to change their ad consent (the EEA, the UK, Switzerland); it opens Google's privacy options form. In the app the Privacy policy link opens the live policy in the phone's browser.
- Closing: the close button, a tap on the dimmed menu, or the back button. There is no music yet, so there is no music switch.
- Look (v0.37, the owner's approved mockup `art-source/ui/settings-mockup.jpg`): the same layout, in the Upgrades screen's pieces: the Upgrades card as the panel (the version in its tan strip), the title in the Upgrades title's cream lettering, the Upgrades close button, each icon in a gold-rimmed cream medallion, a switch gold like the Buy button when ON and a sunken tan track when OFF. With `?skin=vector` it keeps the code-drawn card of v0.14.

### 2.5 How-it-works clips (v0.38)

> The owner's request (2026-10-12), docs/plans/batch-21.md.

A card whose effect can't be guessed from its line has a small round **clip button** on the lower right of its icon, in the shop (§2.2) and in the stage-clear picks (§15.5): the icon kit's play medallion (docs/ART_ASSETS.md §4.15), 34 px. Tapping it opens a popup over the shop or the picks (under the pause) with the card's name in the title lettering, a short clip of the game showing the effect, looping without sound, and one line of caption under it, built like the Settings panel. Closing: the close button, a tap outside the card, or the back button (which closes the popup only: the shop stays open, a run doesn't pause). In the picks time is stopped anyway, and a tap on the button never selects the card.

- **New dot:** the button shows the menu's red dot until its clip has been opened once (saved, §11). "How to play" brings the dots back (§2.4).
- **Reduced motion:** the clip waits on its first frame with a play button.
- **One clip per mechanic**, recorded from the game itself by `npm run clips` (TECH_SPEC §11); every clip is cached for offline play with the rest of the app.

| Clip                        | Cards                                 | Shows                                                                    |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Magnet                      | More Magnets (shop, blessing)         | a tap on a cat, Take, and the cat dropped again onto its pair            |
| Boulder                     | More Boulders, Big Boulders           | a merge beside a bare boulder breaks it                                  |
| Boulders' card (v0.49)      | none: the card at stage 2 (§15.5)     | a boulder dropped from the paw, then a merge beside it breaking it       |
| Iron Bands                  | Iron Bands                            | a merge knocks the band off, the next breaks the boulder                 |
| Golden cat                  | Golden Cats (shop, blessing)          | a golden 3 and a 3 make a 5                                              |
| Hanabi                      | Hanabi (shop, blessing)               | the burst popping small cats into coins and pushing a 6                  |
| Joker                       | Joker Cat (shop, blessing)            | the joker making a 4 into a 5                                            |
| Lightning                   | Lightning (shop, blessing; v0.42.1)   | the ball landing on a 3 and chaining to the other two, all three popping |
| Wind (two clips)            | Wind                                  | falling cats drifting the run's way (the clip blows like the card says)  |
| Heavy Drop                  | Heavy Drop                            | the fireball knocking a cat aside                                        |
| Porcelain                   | Porcelain                             | a crack, then a break into two smaller cats                              |
| Cursed Bell                 | Cursed Bell, Quick Curse, More Curses | a cursed cat turning to stone, then one merged in time                   |
| Hubris, Echo, Copycat, Dice | the rule                              | the rule at work                                                         |
| Combo                       | Combo Charm                           | quick merges building Combo ×2, ×3                                       |
| Lucky Save                  | Second Chance                         | a full jar's countdown ending in a Lucky Save                            |

Lucky Paw, Big Catch and Big Drops have no clip. The cards that bring a hazard or a rule in (§15.5, v0.50) play the same clips: the boulders' own, Cursed Bell's, the Wind's (blowing the run's way), Porcelain's and each rule's.

### 2.6 Scenes (v0.44)

> The owner's request (2026-10-14): a clip of the game's most fun moments, to send to publishers. The scenes set each moment up; the owner plays it.

A hidden part of the main menu for making clips: runs set up for one big moment each. Nothing plays by itself: the jar is set up and settled, the right ball waits in the paw, and the player drops one or two balls to set the moment off.

- **Turning it on:** the menu's **Scenes** button (a small cream pill under the gear) shows only on a device that turned it on: `?scenes=1` in the address (`?scenes=0` turns it off), or the tester reset in Settings (seven quick taps on the version, §2.4). The device remembers it under its own key, outside the save (`maneki-merge:scenes`). Players never see it.
- **The panel:** the Settings card titled "Scenes", one row per scene: the group's ball in a medallion (Lucky Save: Second Chance's icon), the group, the scene's name, what to do, and its stage; the list scrolls. A tap plays the scene; the close button, a tap outside and the back button close the panel.
- **A scene's run:** it starts at the scene's stage (its garden and its cats), with every shop card at its top level (two Lucky Saves, the top coin bonus, every blessing open for the picks), the scene's rule on, the HUD's score and coins as if a run had come this far, and the jar's cats and balls already settled (2.5 s of play under the plain rules, run at once before it shows). From there it is an ordinary run: merges, stage clears with the shrine growing, picks, Lucky Saves, game over. The Dice scenes script their dice: the rolls the moment needs, then the dice roll again.
- **A sandbox:** nothing a scene earns reaches the wallet, the records or the stats; it is never saved (closing the app ends it), shows no first-run hints, and its Game Over shows no new-record badge. Game Over's Play Again and the pause's **Restart scene** (only in a scene) set the same scene up again for another take; Quit to Menu leaves it.
- The jars were tuned headless; a test plays each scene's moment from several drop points and checks that its jar holds still until the first drop (`tests/physics/scenarios.test.ts`).

| Group      | Scene             | Stage | What to do                                               | What happens                                                                        |
| ---------- | ----------------- | ----: | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Lightning  | Boulder storm     |     5 | the lightning on any boulder of a jar full of them       | every boulder breaks, the top 8 falls on the other: the last cat, the shrine grows  |
| Lightning  | Full house        |     8 | the lightning on the 3 at the top right of a full jar    | six 3s pop and the jar caves in: six merges in a row, up to an 8                    |
| Hanabi     | Firework shelf    |    10 | the hanabi into the gap on the right                     | the blast clears the shelf under the top 8: it falls on the other, the shrine grows |
| Hanabi     | Crowd pleaser     |     3 | the hanabi into a jar crowded with small cats            | six to nine small cats pop into coins                                               |
| Joker Cat  | Wild finish       |    15 | the joker on the 8                                       | the last cat, the shrine grows                                                      |
| Joker Cat  | Joker chain       |    12 | the joker on the 4 at the top of a staircase             | 5, 6, 7 and 8 in a chain; the boulder beside it breaks                              |
| Golden Cat | Golden staircase  |    20 | the golden 3 on the 3                                    | it skips to a 5 and the chain runs to the last cat; the shrine grows                |
| Golden Cat | Double gold       |     6 | the golden 4 on the 4, then the golden 3 on the 3        | a 6, 7 and 8 in a chain, then a 5                                                   |
| Magnet     | Magnet match      |     4 | take the 8 on the right and drop it on the other 8       | the last cat                                                                        |
| Magnet     | Magnet chain      |     7 | take the 4 on the right and drop it on the staircase's 4 | 5, 6, 7 and 8 in a chain                                                            |
| Lucky Save | Brim full         |     9 | a 4 anywhere on the brim-full jar                        | the countdown, then a Lucky Save                                                    |
| Lucky Save | Saved and cleared |    13 | a 4 anywhere                                             | a Lucky Save, then 7, 8 and the last cat                                            |
| Hubris     | Three and three   |    11 | the 3 into the gap between two 3s                        | three 3s make a 5, three 5s a 7, then the 8 and the last cat                        |
| Hubris     | Hubris cascade    |    14 | the 2 between the two 2s on the right                    | three 2s make a 4, three 4s a 6, then 7 and 8                                       |
| Heavy Drop | Fireball chain    |    17 | the fireball 4 on the staircase's 4                      | the chain runs to the last cat                                                      |
| Heavy Drop | Knockout          |    16 | the fireball on an 8's outer edge, by the wall           | it knocks that 8 into the other: the last cat                                       |
| Dice       | Lucky roll        |    18 | the 4 on the 4                                           | a lucky roll skips the 5 and the chain runs to the last cat                         |
| Dice       | Fizzle, then luck |    19 | the 4 on the 4, twice                                    | a fizzle, then a lucky roll and a chain up to an 8                                  |

The narrowest targets: Three and three wants the 3 right in the gap (its aim ghost between the two 3s), Knockout the outer edge of an 8, by the wall. The others work from most drops over their target.

### 2.7 Rewarded ads (v0.54, the Google Play app)

> The owner's choices (2026-10-15): a bonus ball once per stage, straight into the paw; one more Lucky Save once per run; the run's coins doubled at Game Over.

Only in the Google Play app (TECH_SPEC §16), and only while an ad is ready: online, with consent, an ad loaded. Otherwise none of this shows at all, not even greyed out. Never in a scene (§2.6). Every ad is the player's choice: nothing plays without a tap on **Watch ad**, on a card that says what the ad gives. With `?ads=fake` the web build shows them too, with a test ad (TECH_SPEC §16).

- **The bonus ball** (placement `specialBall`). From the stage's 8th drop (`AD_BALL_AFTER_DROPS`), once per stage, NEXT's bubble shows mirrored on the left under the score card, tagged "Bonus", with a helpful special ball in it and the play medallion on its lower right. The ball is a hanabi, a joker cat, a lightning ball or a magnet, rolled per stage from the run's seed on a generator of its own, so it never moves the run's other rolls. A tap holds time and asks: "A free Joker cat!" with the ball, "Watch a short ad and it goes straight into your paw.", **Watch ad** and **Not now**. After the ad's reward the ball goes straight into the paw, not into NEXT (the owner's call): the cat that was in the paw waits and comes back after it, and NEXT stays as it was. Not now, the ad closed early or an ad that fails give nothing, and the bubble stays for the rest of the stage. Once taken, the next one comes in the next stage. A bonus ball still in the paw when the stage clears isn't lost: the jar is empty, so the waiting cat goes first and the ball comes after the new stage's first drop.
- **One more Lucky Save** (`luckySave`). When the danger timer runs out with no Lucky Save left, once per run, time stops and the card asks: "Out of room!", "Watch a short ad for one more Lucky Save.", **Watch ad** and **No thanks**. After the ad's reward it is a Lucky Save like the upgrade's (§6: the cats over the line and the 9 smallest pop into coins, a 2 s grace); otherwise (No thanks, the ad closed early or failing, the back button) the run ends. When no ad is ready at that moment, or the run already took it, the run ends as before. The app closed on the card comes back paused with the jar as it was, and asks again.
- **Double coins** (`doubleCoins`). Game Over (§2.3) shows a gold **Double coins** pill with the play medallion under its stats when the run earned coins: after the ad's reward the run's coins are paid once more (into the wallet, counted as earned), the Game Over's number doubles with a pop and the pill goes. Once per Game Over; closing the ad early leaves the pill.

The numbers (the drop it shows from, which balls) are in `config/ads.ts`; the owner tunes them by playing (no simulator arms). The cards and the pill are built from the existing pieces (the pause overlay's card, the PLAY and Buy pills, NEXT's bubble, the icon kit's play medallion).

### 2.3 Game

- The screen the owner chose in v0.14 (the "Sakura garden" design): the whole screen is the scene, and the HUD floats over its top.
- The jar (§6, §13.1), with the danger line on its rim.
- The dropper: a calico cat's paw floats over the jar (v0.25, with the raster art: its arm fades out a little above the wrist; from v0.22 to v0.24 it reached out from under a noren curtain; with `?skin=vector` it reaches down from the top of the screen) and holds the current cat by the head, just above the jar's top rail (v0.21.1; until then the cat hung in front of the rail). It follows the aim, stays where it is while the next cat comes, lifts a little when it lets go, and is hidden while the jar grows. A dotted aim guide shows where the cat will fall, with a faint ghost of the cat where it lands.
- HUD over the top of the scene. Along the top, left of the pause button and centred on it, the **goal strip** (v0.48, the owner's mockup `art-source/ui/goal-strip-mockup.webp`, after a playtest where the goal, the cats' order and the progress couldn't be seen): the coins card's cream card; on its left the menu's red torii with the stage number between its posts (dark brown with a cream edge, like "NEXT"); then the stage's cats 1 to 8 in order, small; on its right the stage's last cat, the goal, a little bigger in a round cream slot with a flat gold ring over the card's end. Every cat is always in full colour (the owner turned down tan silhouettes): the cats the stage hasn't had in its jar yet are pale (45% opacity), and the cats up to the biggest it has had, dropped or merged, are bright. The biggest size never goes down within a stage, even when that cat pops, and starts over at the next stage (`run.stageBestSize`, saved with the run). A size reached for the first time lights up with a small pop (every size it skipped pops too); the goal's ring stays still (the owner's call, v0.50.3: v0.48–v0.50.1 made it breathe from the stage's first size-8 cat to its clear, and phones stuttered for that whole second half of the stage, TECH_SPEC §13; v0.50.2 breathed it three times). With reduced motion the pop stays still too. No progress bar (the owner's call). Until v0.47 the stage was words at the top in the middle ("STAGE 2", v0.25–v0.47), and the stage card of v0.14–v0.17 had a progress bar and the stage's last cat. On the left, a narrow cream score card with "SCORE:" and the score in a sunken well, level with the coins card (their middles on one line, v0.26; until v0.24 it sat at the top, level with the pause button). On the right, a pink pause button, a "COINS:" card with the coins earned this run, which runs off the right edge, and under it the next cat in a round glass bubble with a small "NEXT" tag on its rim (v0.14.1). Only the pause button takes touches; everywhere else a touch aims.
- Overlays:
  - **Pause**: Resume, Sound, Haptics, Quit to Menu; in a scene (§2.6) also Restart scene. Sound and Haptics are gold when on, cream with a crossed-out icon when off.
  - **Game Over**: score, best score, stage reached, coins earned this run, new-record badges (best score, best stage), Play Again, Menu. v0.39.1 (the owner's call) took out the biggest cat made this run (with its "New" chip for the biggest cat ever) and the shop cards the run opened ("New in the shop: …", v0.36).
  - Look (v0.37, the owner's approved mockups `art-source/ui/pause-mockup.jpg`, `gameover-mockup.jpg`): the v0.14 layout in the Upgrades screen's and the menu's pieces: the Upgrades card as the panel, the title (and Game Over's score) in the Upgrades title's cream lettering with a dark-brown edge, Resume and Play Again as the menu's coral PLAY pill, the quiet buttons as the cream UPGRADES pill, the HUD's coin (the menu's paw coin until v0.42.4). With `?skin=vector` the code-drawn cards of v0.14.
- Short banners: Combo, Jackpot, Stage clear! (every stage clear), The shrine grows! (as the jar grows, every 5 stages, v0.33; with the new jar's coin multiplier under it, "Coins ×2", since v0.36; from v0.29.4 to v0.32 no banner, and until v0.29.4 it replaced "Stage clear!" at a clear that grew the jar), Lucky Save!. (Until v0.29.5 the reveal of a new stage showed "New cats unlocked!" with the next goal; the owner removed it.)
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats". The cards that bring a hazard or a rule in as a stage opens (§15.5; the boulders' card since v0.49, the others since v0.50) are too.

## 3. Controls

- Touch and drag anywhere in the play area. The dropper follows the finger horizontally, clamped so the cat stays inside the jar. Release to drop.
- A tap without dragging drops the cat at the tapped x.
- A dropped cat falls from the dropper to the empty jar floor in 0.88 seconds (0.875–0.883 s; v0.41, the owner's call: "a bit slow", 1.35 times the gravity; 1.03–1.04 s from v0.21.1, which raised the dropper; 1 s before), and lands without bouncing off the floor (cats still bounce a little off each other and the walls).
- Cats roll over each other like balls instead of sliding like on ice (v0.23.7, the owner's report): a cat that lands on another's shoulder rolls down it, turning as it goes, and still shoves it aside as before.
- After a drop, the next cat appears after a 0.45 s cooldown. Releases during the cooldown are ignored.
- Mouse: move to aim, click to drop.
- Android back button: game → pause, pause → menu, menu → system default.
- Leaving the app (backgrounding) pauses the run automatically.

## 4. Cats: sizes and tiers

Every stage holds the same 9 **sizes** of cat. A cat's **tier** is its number (the cat art doesn't show it, §13.1): it only ever goes up, from 1 at stage 1 and without end (until v0.33 a run ended at stage 5, tier 45), and it sets the score and coins. A cat's size is its place in the current stage: `size = tier − firstTier(stage) + 1`, 1–9. Each stage starts right after the previous one's last tier, so stage 1 holds tiers 1–9, stage 2 tiers 10–18, stage 3 19–27, stage 4 28–36, stage 5 37–45, and so on: stage n holds tiers 9n − 8 to 9n (§7). (Until v0.12 a stage held 12 sizes, until v0.15 11 and until v0.24 10, and its last cat was the next stage's first; sizes 12 (radius 250), 11 (205) and 10 (163) are gone.)

The radius depends on the size only: `r(s) = round(41 × 1.19^(s−1))` in world units; the jar is 600 × 870 at every stage. v0.24 (owner): every cat is 20% bigger, because a stage now ends at size 9 and needs half the cats (§7). With the same step, sizes 1–8 together cover as much of the jar as sizes 1–9 did, and size 9 (165, 0.28 of the jar's width) is as big as the old size 10. A test bot that drops each cat on a matching one clears stage 1 about as often as before (13 runs in 48 against 11), in half the drops (median 138 against 275); with 23% or 26% it cleared only 7. From v0.19.3 to v0.23 it was `round(34 × 1.19^(s−1))` (34 to 163: size 1 grew to what size 2 was and size 9 kept its radius). Before that it was `round(28 × 1.22^(s−1))` (28 to 168), chosen, when a stage still held 11 sizes, so that sizes 11, 9, 8, 7, 6 and 5 covered about as much of the jar as the same six fruits do in Suika Game's box (55% of its area).

| Size | Radius | Radius / jar width | v0.19.3–v0.23 |
| ---: | -----: | -----------------: | ------------: |
|    1 |     41 |              0.068 |            34 |
|    2 |     49 |              0.082 |            40 |
|    3 |     58 |              0.097 |            48 |
|    4 |     69 |              0.115 |            57 |
|    5 |     82 |              0.137 |            68 |
|    6 |     98 |              0.163 |            81 |
|    7 |    116 |              0.193 |            97 |
|    8 |    139 |              0.232 |           115 |
|    9 |    165 |              0.275 |           137 |

When two cats of tier `t` merge, they pay by their **size** `s` and their **stage** `n` (v0.36, the owner's call; the tier tells both, §7):

- score `S(t) = 2^s × 1.225^(n−1)` (before the combo, §5): exponential, but slowly, about 5 million in all by the time stage 30 is cleared (the owner's target);
- base coins `C(t) = round(1.7^(s−1)) × jar(n)`, where `jar(n)` is the number of the jar the stage plays in (§7): ×1 in stages 1–5, ×2 in 6–10, ×3 in 11–15, and so on. "The shrine grows!" says the new multiplier.

A single cat's **value** is half of what its pair's merge pays: `C(t) / 2`. That is what it pays when it pops (§5).

| Size merged | Score at stage 1 | Coins in jar 1 | Value |
| ----------: | ---------------: | -------------: | ----: |
|           1 |                2 |              1 |   0.5 |
|           2 |                4 |              2 |     1 |
|           3 |                8 |              3 |   1.5 |
|           4 |               16 |              5 |   2.5 |
|           5 |               32 |              8 |     4 |
|           6 |               64 |             14 |     7 |
|           7 |              128 |             24 |    12 |
|           8 |              256 |             41 |  20.5 |
|           9 |              512 |             70 |    35 |

| Stage | Score × | Coins × |
| ----: | ------: | ------: |
|     1 |       1 |       1 |
|     2 |   1.225 |       1 |
|     5 |    2.25 |       1 |
|     6 |    2.76 |       2 |
|    10 |    6.21 |       2 |
|    11 |    7.61 |       3 |
|    20 |    47.3 |       4 |
|    30 |     360 |       6 |

Measured with the balance bot (TECH_SPEC §11): a stage pays ~530 coins before upgrades (a run that ends in stage 3 makes ~1.2K, in stage 10 ~7.5K, in stage 20 ~25K, in stage 30 ~52K; Lucky Paw 10 made it 2.5 times as much, 3.25 times since v0.39), and a maxed profile scores ~2,500 by its first clear, ~4.9 million over 30 stages.

Until v0.36 both went by the tier: `S(t) = 2^t` and `C(t) = round(1.7^(t−1))`, so every stage paid 512 times the score and ~118 times the coins of the one before (the bot had ~530 coins at its first clear, ~60K at its second, ~7M at its third), and one run past stage 2 could buy the whole shop.

Values are rounded only when paid (§5). Implement the formulas. Unit tests assert these tables.

## 5. Merging

- Two touching cats of the same tier merge into one cat of the next tier, with a pop. (With the Hubris rule, two cats of sizes 1–5 wait half a second, and three merge at once and skip a size, §15.11.) The new cat is born at rest exactly at their midpoint and grows from the old size to its new size over about 120 ms, so neighbours get pushed but never launched.
- The new cat starts to turn gently, as if another cat had clipped it: the way its parents slid past each other (when a cat lands on the right shoulder of another, the new cat turns clockwise), small cats faster than big ones. On the floor it rolls a short way.
- A cat takes part in at most one merge per physics step. Merges are queued during collision handling and resolved after the step. When pairs compete for a cat, the oldest cats merge first.
- **The last cat.** Two size-8 cats merge into the stage's last cat (size 9). That clears the stage (§7): every other cat in the jar pops into its value, the last cat pops too once it has settled, and the run moves on, with an empty jar, to the next stage (every 5 stages the jar grows on the way, §7).
- **Jackpot.** Two of a stage's last cat don't merge upward: both vanish with a big celebration, paying score `2 × S(last)` and coins `5 × C(last)` before multipliers. In play this needs two last cats in the jar at once, which a clear prevents (the last cat pops), so in practice only the debug tools make one.
- **Combo.** A merge within 1.0 s of the previous merge raises the combo counter; otherwise the counter resets to 1. "Combo ×N" shows from N = 2. Every combo step adds 10% to a merge's score, for every player, up to 5 steps (×1.5; v0.36): `round(S × (1 + 0.1 × min(N − 1, 5)))`. Combos pay extra coins only with the Combo Charm upgrade. Jackpots count as merges for the combo; pops (stage clears, Lucky Save) neither raise it nor get a combo bonus.
- **Golden cats** (§15.4) skip a tier when they merge. Until v0.21 the Golden Merge upgrade gave every merge a chance to pay ×3 coins; it is gone (§10).
- **Coin payout** for any merge, Jackpot or pop: `round(base × coinMultiplier × (1 + comboBonus))`, minimum 1. The base is C(t) for a merge, 5 × C(last) for a Jackpot and the cat's value C(t)/2 for a pop. Halves round up (57.5 → 58), ignoring floating-point noise. So two popping 4s pay what merging them would (C(5) = 8 → 4 + 4); an odd C(t) can pay one coin more.
- Coins go into the persistent wallet immediately. Quitting or a crash never loses earned coins.

## 6. Jar, danger line, game over

- The jar is open at the top: straight walls, a flat floor and square bottom corners (v0.23.4, the owner's call, with the square bamboo frame). From v0.14 to v0.23.3 its bottom corners were quarter circles (radius 112, then 168 from v0.19.3), with a soft landing on the curves (v0.19.4); both are gone. Its rim is the danger line.
- A cat alone on the floor rolls on, slowed only by the air, until a wall or another cat stops it (v0.23.6, the owner's call). From v0.19.4 to v0.23.5 the floor slowed a lone cat like a rug and stopped it within half a second.
- A cat is _over the line_ when its top edge is above the rim. A cat is ignored until 0.5 s after it lands (first contact).
- If at least one cat is over the line continuously for 2.5 s, the game is over. While that timer runs, the rim flashes red and a short countdown shows.
- **Lucky Save** (from the Second Chance upgrade) replaces the game over: every cat over the line plus the 9 smallest other cats (smaller tier first, then older first; 6 until v0.39) pop into their value, the timer resets, and a 2 s grace period follows. Only landed cats count, so a cat still falling from the dropper is left alone. You get one save per run per upgrade level.
- At game over, physics stops and the Game Over overlay appears. Play Again starts a new run immediately.

## 7. Stages (signature mechanic)

Every stage plays the same way: the same 600 × 870 jar (aspect 1 : 1.45), the same 9 sizes, the same drop pool of sizes 1–4 (§8) and the same goal, **making the stage's last cat** (size 9, from two size-8 cats). Every stage starts with an empty jar: the last cat isn't carried over (until v0.24 a stage's last cat, size 10, became the next stage's first; the owner ended that loop). Only the cats' tiers, and so the score and coins, keep growing. Every stage is open from the start: there are no stage locks (Shrine Expansion was removed in v0.12). **Stages have no end** (v0.33, the owner's call): every clear moves the run on to the next stage, and the goal strip's stage number keeps counting (until v0.33 the run stayed at stage 5, §7.2).

| Stage | Tiers     | Drops (sizes 1–4) | Last cat (the goal) |
| ----: | --------- | ----------------- | ------------------: |
|     1 | 1–9       | 1–4               |                   9 |
|     2 | 10–18     | 10–13             |                  18 |
|     3 | 19–27     | 19–22             |                  27 |
|     4 | 28–36     | 28–31             |                  36 |
|     5 | 37–45     | 37–40             |                  45 |
|     6 | 46–54     | 46–49             |                  54 |
|     n | 9n−8 … 9n | 9n−8 … 9n−5       |                  9n |

**The jar grows every 5 stages** (v0.33, the owner's call; until then at every clear). Stages 1–5 play in the first jar, 6–10 in the second, 11–15 in the third, and so on: clearing stage 5, 10, 15, … grows the jar into the next one, and the other clears move on to the next stage in the same jar, right after the picks (no zoom). When the jar grows, "The shrine grows!" shows and the shrine rises through the clouds into a bigger place (§7.1). It is a look only: the grown jar is the same jar in world units, so every stage plays the same, and the jar looks the same on screen at every stage. It stays still on screen since v0.33.3 (the owner's call): until then the empty jar grew on screen by 4.8 in every direction while the camera zoomed out by as much, so it shrank and slid back up.

**A background per jar** carries the feeling of growth: each grown jar stands in a bigger place. Jar 1 (stages 1–5) stands in the sakura shrine garden; jar 2 (6–10) towers over a grand temple courtyard; jar 3 (11–15) stands on a hilltop terrace above a whole shrine town; jar 4 (16–20) on a wooden temple stage high on a mountainside; jar 5 (21 on) on a mountain peak above a sea of clouds (docs/ART_ASSETS.md phase 9). All five are the owner's (v0.33.1–v0.33.2). A jar after the last painted background keeps it. The growth clouds bring it in (§7.1); v0.33.0–v0.33.2 shrank the old garden towards the jar's feet and faded it out instead, which the owner found amateurish. Until v0.24 the zoom was `r(10) / r(1)`, so the last cat shrank on screen to exactly the first cat's size and became the next stage's size 1.

**The time of day** (v0.51, the owner's idea, like Pokémon GO's map): see §7.3.

### 7.1 Stage clear and expansion (about 5.6 s when the jar grows, plus the stage doors and the picks)

Every clear runs steps 1 and 2, then the picks. A clear that doesn't grow the jar then moves on to the next stage at once: the jar is empty, the dropper's cats move to the new stage's pool (each keeps its size), and play resumes as the doors open. Every 5th clear runs steps 3–5 **before** the picks (v0.33.2, the owner's call; v0.33.0–v0.33.1 grew the jar after them, when the doors opened): the reward follows the last cat at once, and the doors then open onto the new jar, like after every other clear.

1. **Stage clear.** The moment the last cat is made (its merge pays as usual), every other cat in the jar pops into its value (§4, §5) with a "+coins" each and a fanfare: not all at once, but quickly from the top of the jar down, 45 ms apart and within 0.9 s in all (v0.33.5, the owner's call; until then oldest first within a quarter of a second). The coins count at once. "Stage clear!" shows for 1.5 s, then slides up off the screen (0.5 s) as the stage doors set off (v0.29.4, the owner's call; until then a clear that grew the jar said "The shrine grows!").
2. Input is disabled and the dropper hides. **The last cat shines** for 1.5 s (v0.33.5, the owner's call, so it is clear what happened; 0.5 s until then) while it finishes growing and settles alone in the jar: a gold halo twice its radius grows in and pulses behind it, a sunburst of fourteen light rays turns slowly behind the halo, and sparkles fly off its edge (fewer with reduced motion, and the rays hold still); the danger timer is reset. Then it pops into its value too (§5) in a big burst of sparks, and the jar is empty. When the jar grows, time then stops and the empty jar holds still for 0.5 s, until "Stage clear!" has slid away (2 s after the last cat).
3. **The shrine grows** (2.05 s, the timeline's `zoom` phase): "The shrine grows!" shows, with the new jar's coin multiplier under it ("Coins ×2", §4), holds while the clouds come and part, and then slides up off the screen. Time stops (physics, the drop cooldown and the combo window freeze), with a whoosh and gold sparks along the rim. The jar stays still. **The growth clouds** (v0.33.3, the owner's art, docs/ART_ASSETS.md phase 10): a wall of about forty of the owner's nine clouds, in three layers (the back ones smaller), wells up from below the screen as one (0.715 s, each cloud up to 0.11 s late, slowing as it arrives) and covers the play area under the HUD and the banners. When every cloud is up, the next jar's background (§7) comes in behind them, starting 1.15 times bigger around the jar's feet. After a 0.12 s hold they part to the left and right, the middle first (0.975 s, the clouds at the sides up to 0.13 s later), speeding up, rising a little and growing as if passing the camera, and fade out on their way; the new place settles to its size as they go, as if the camera pulled back. The whole transition lasts this step (v0.33.4, the owner's call: rising and parting 30% slower than v0.33.3's 0.55 s and 0.75 s). With reduced motion the clouds only fade in and out where they stand, and the background doesn't move. A pause freezes them.
4. **Reveal** (1.5 s): the clouds are gone and the new place shows on its own before the doors come (v0.33.4, the owner's call; 0 s in v0.33.3). The world is now the next stage's, with an empty jar, and the goal strip moves on: the new stage's number, and every cat pale again. The dropper's cats move to the new stage's pool (§8), with a bell chime; no banner (v0.29.5, the owner's call; until then "New cats unlocked!" showed the new goal, the new stage's last cat).
5. The picks come (below). Then physics resumes, the dropper returns, and input is enabled again.

The trial and blessing picks (§15.5) come after step 2 (after step 4 when the jar grows), behind the **stage doors** (v0.29, the owner's idea): as "Stage clear!" (step 1) slides away, 1.5 s after the last cat is made (when the jar grows: as "The shrine grows!" slides away, after the reveal), two folding screens of two tall shoji doors each slide in from the screen's sides, unfolding as they come (1.1 s), and shut over the whole screen, the HUD too. They come from off the screen, slowly at first, so the banner is gone before they show (v0.29.4; v0.29.3 kept the banner 2 s and shut the doors over it; until then the doors came at once and took 0.7 s). Like a byobu pushed along the floor, a wing's outer edges stay on the screen's plane while the hinge between its doors comes forward (v0.29.1, the owner's call; v0.29.0 swung each wing on the screen's edge like a door). The owner's picture, a shrine garden with a gold sun split between the two middle doors, runs across them (§13.1). The pick cards show in front of the shut doors. After the blessing the wings slide back out, folding up (1.2 s; 0.75 s until v0.29.3), onto the next stage's empty jar, and play resumes once they are open. With reduced motion they fade in and out (0.25 s) instead of folding. A run saved while a pick waits comes back behind shut doors.

### 7.2 No last stage

Since v0.33 there is none. From v0.24 to v0.32 stage 5 was the last: its clear happened the same way, but the jar didn't grow and the run stayed at stage 5, where the next 45 cleared it again. A run saved in the middle of such a clear goes on to stage 6.

### 7.3 Time of day (v0.51)

The gardens follow the phone's clock, like Pokémon GO's map (the owner's idea). Every background is painted three times (docs/ART_ASSETS.md phase 19): the **day** (the pictures as they always were; they already read as a soft morning, so there is no separate morning), the **sunset** (a dusty-rose to golden-orange sky, warm light from the low sun, the lanterns just lit) and the **night** (a deep indigo sky, a full moon and a few stars, every lantern glowing; jar 5's sun becomes the moon). The sunset and the night are the owner's edits of the day picture, so everything stands where it stood and the jar keeps its feet on the rug.

- **When.** The sunset shows from an hour before the sun sets to half an hour after it; then night until sunrise; the day the rest of the time. No location is asked for: the sun's times come from the date at 41° N with the sun highest at 13:00 (the owner's Turkey, where the clock is UTC+3 all year: about 5:30–20:40 in June, 8:25–17:40 in December), so 19:00 is night in winter and day in summer. Elsewhere in the mid-north it is close; far east or west of a time zone's middle it is off by up to an hour or so, and south of the equator the seasons are the wrong way round. Numbers in `src/config/timeOfDay.ts`.
- **Never in the middle of a jar.** The time is picked as a run starts (or a saved run comes back) and each time the jar grows (behind the growth clouds, §7.1); the rest of the jar keeps it, however long it takes. The menu picks it each time it shows, and when the app comes back to it.
- **The setting** Day and night (§2.4) keeps the day when it is off. `?time=day|sunset|night` pins a time on any device, whatever the clock and the setting say (the clip recorder pins the day).
- The loading screen always shows the day garden; it fades into the menu's.

## 8. Drop pool

- Every stage drops its sizes 1–4 (stage 1: tiers 1–4; stage 2: 10–13; …), with base weights `[40, 30, 20, 10]` (smallest first).
- The **tilt** L moves the chances towards the bigger cats: each tilt level moves 3 points from the smallest to the biggest and 1 point from size 2 to size 3, so `share_i = base_i + L × (2i − 3)` % (i = 0 for the smallest). L = 1.2 × Big Catch + 3 × Big Drops (§15.5), at most 13, where the smallest drop is almost gone. Each Big Catch level is 1.2 tilt levels (v0.39, every shop effect 1.5 times as strong, the owner's call; 0.8 with a cap of 10 from v0.36, when it got 10 levels; until then 5 levels of 1), so Big Catch 10 leaves room for one Big Drops level:

  | Big Catch |   L |     1 |     2 |     3 |     4 |
  | --------: | --: | ----: | ----: | ----: | ----: |
  |         0 |   0 |   40% |   30% |   20% |   10% |
  |         1 | 1.2 | 36.4% | 28.8% | 21.2% | 13.6% |
  |         5 |   6 |   22% |   24% |   26% |   28% |
  |        10 |  12 |    4% |   18% |   32% |   46% |

  The shop card rounds the biggest drop's share (10, 14, 17, 21, 24, 28, 32, 35, 39, 42, 46%). Measured (bot, stage 1): the tilt of the old Big Catch 5 (L = 5) needs 97 drops to clear against 141 without it, L = 9 83, so a maxed profile clears a stage in about 40% fewer drops. The smart bot (v0.39) clears stage 1 in 122 s with no Big Catch, 71 s at L = 8 (v0.36's top) and 60 s at L = 12.
  Until v0.12 it was `base_i × (1 + 0.12 × L × i)`, normalized (10% → 17.5% at L = 5).

- The first two drops of a run are always the pool's smallest tier.
- **The first stage's help** (v0.52, the owner's idea, to make stage 1 a little quicker without it showing): each cat queued during stage 1 (the one that shows in NEXT as a cat drops) comes more often in a size that will be waiting for a partner on top of the jar when it comes. Waiting on top are the landed cats of sizes 1–4 that a cat of their own size, dropped straight above them, would land on: no other ball in the way, a bigger neighbour's shoulder included. The cats still to come before it count first, in order (the falling ones, the one just dropped, the one in the paw): each takes such a partner of its size, leaving a cat of the next size there, or, finding none, waits for a partner itself. Each wanted size's weight is multiplied by 3 (`MATCH_HELP_FACTOR`; `MATCH_HELP_LAST_STAGE` = 1, both in `src/config/stages.ts`). It is still one roll, so the rolls after it stay the seed's, and the run's two opening cats stay the smallest. From stage 2 on the queue rolls as before.

  Two or three of the four sizes are usually wanted, so the drops only shift from 40/30/20/10% to about 33/32/23/12% (less than one Big Catch level moves them), while the cat in NEXT is one the jar waits for 69% of the time, where the plain weights would give 49% in the same jars. Measured with the smart bot from a fresh profile (200 seeds, `npm run sim -- base --aim smart --stages 1 --cap 900 --seeds 200`):

  | Wanted size × | Stage 1 cleared | Time to clear | Drops | Drops 1/2/3/4 |
  | ------------: | --------------: | ------------: | ----: | ------------- |
  |   1 (no help) |             69% |         117 s |   145 | 40/29/20/10%  |
  |             2 |             75% |         107 s |   136 | 36/31/22/11%  |
  | **3 (v0.52)** |             82% |         102 s |   127 | 33/32/23/12%  |
  |             5 |             80% |          93 s |   119 | 29/31/25/15%  |

  Without counting the cats still to come, ×3 changed nothing measurable (67% and 110 s): most of what the jar waits for is already on its way.

- The queue comes from the seeded RNG. The next cat is visible. Every queued cat rolls its tier (the roll happens even for the two fixed opening drops). Magnets, boulders and golden cats roll on a second generator seeded from the same seed (§15.1), so a seed gives the same drops at every pick level (in stage 1 the cats also follow the jar, above).
- After an expansion, queued cats keep their size: each takes the tier at the same place in the new pool (a queued 3 becomes a 12), so the preview the player saw still holds. No new rolls. A queued magnet becomes a cat (§15.1).

## 9. Score, coins, records

- Score: `S(t)` per merge and `2 × S(last)` per Jackpot (§4), both times the combo's score multiplier (§5), rounded. Score only drives best-score records (the stage clears, not the score, grow the jar).
- Coins: merges, Jackpots, stage-clear pops and Lucky Save pops all pay out by the rule in §5.
- Number formatting: thousands separators below 10,000, short format from 10,000 (12.5K, 125K, 3.2M, then B, T, Qa for 10^15, Qi for 10^18, Sx, Sp, Oc, No and Dc for 10^33): one decimal below 100 units, none from 100. From 10^36 a mantissa and an exponent, truncated the same way ("1.2e36"; v0.33, stages have no end). The short format truncates instead of rounding, so a balance never looks bigger than it is (59,960 shows 59.9K, not 60K).

## 10. Upgrades (permanent, bought in the shop)

The shop sells four permanent upgrades, since v0.36 (the owner's call) a card for each blessing (§15.5), and since v0.55 a card for each weapon (§15.16): **a blessing card's level is the highest level its blessing can reach in a run; each level of a weapon card opens one more of the weapon's picks for every run.** With Golden Cats at 2, a run's blessing picks can take Golden Cats twice at most; at 0 it is never offered. When no blessing is under its card's level, a stage clear's blessing pick pays a **Lucky gift** of coins instead (§15.5, v0.50; until then it was skipped) and the run only gathers trials, so the cards set how far a run can go. A fresh profile has Golden Cats and Big Drops at 1, so its first run takes a blessing at stages 1 and 2 and Lucky gifts from stage 3. With every card at its max the budget is what it was before v0.36 (5 + 3 + 5 + 5 + 5 levels), and Lightning's 5 (v0.42).

A card can be bought once the profile's **best stage** reaches its **gate** (the stage in the table; 1: from the start); until then it says "Reach stage N" (§2.2). The best stage only goes up, so a gate stays open.

| ID             | Name          | Effect per level                                 | Start | Max | Gate | Price for each next level                       |
| -------------- | ------------- | ------------------------------------------------ | ----: | --: | ---: | ----------------------------------------------- |
| `luckyPaw`     | Lucky Paw     | +22.5% coins from everything                     |     0 |  10 |    1 | 150, 400, 800, 1.5K, 3K, 7K, 12K, 22K, 36K, 60K |
| `bigCatch`     | Big Catch     | Bigger cats come more often: +1.2 drop tilt (§8) |     0 |  10 |    1 | 150, 400, 900, 2K, 4K, 10K, 17K, 30K, 50K, 80K  |
| `comboCharm`   | Combo Charm   | +12% coins per combo step (up to 5 steps)        |     0 |   5 |    2 | 1K, 3K, 10K, 22K, 40K                           |
| `secondChance` | Second Chance | +1 Lucky Save per run                            |     0 |   2 |    1 | 1K, 15K                                         |
| `goldenCats`   | Golden Cats   | Golden Cats can go one level higher in a run     |     1 |   5 |    1 | 400, 2K, 10K, 24K                               |
| `bigDrops`     | Big Drops     | Big Drops can go one level higher in a run       |     1 |   3 |    1 | 2K, 14K                                         |
| `moreMagnets`  | More Magnets  | More Magnets can go one level higher in a run    |     0 |   5 |    1 | 1K, 3.5K, 14K, 30K, 55K                         |
| `hanabi`       | Hanabi        | Hanabi can go one level higher in a run          |     0 |   5 |    3 | 3K, 8K, 22K, 42K, 70K                           |
| `joker`        | Joker Cat     | Joker Cat can go one level higher in a run       |     0 |   5 |    5 | 10K, 18K, 48K, 85K, 130K                        |
| `lightning`    | Lightning     | Lightning can go one level higher in a run       |     0 |   5 |    8 | 15K, 25K, 40K, 60K, 85K                         |
| `katana`       | Katana        | Opens the next of the Katana's picks             |     0 |   4 |   10 | 20K, 32K, 50K, 75K                              |

**v0.39 (the owner's call):** the early game was too slow, runs stopped at stages 5–6 and even a maxed shop made the first stages dull, so every shop effect became 1.5 times as strong (Lucky Paw +15% → +22.5%, Big Catch 0.8 → 1.2 tilt levels, Combo Charm +8% → +12%, a Lucky Save pops 9 small cats instead of 6, and each blessing level 1.5 times as much, §15.5), the first levels got cheaper, the gates lower (Combo Charm and More Magnets stage 3 → 2, Hanabi 5 → 3, Joker Cat 8 → 5), and Second Chance, the strongest help for getting past the first jar, opened from the start at 1K and 15K (stage 5, 10K and 50K before). The last levels got dearer so that everything still takes about 8 hours.

v0.40 (the owner's call): More Magnets opens from the start, its first level at 1K (stage 2 and 1.2K in v0.39), since magnets now come only with their blessing (§15.1).

v0.42 (Batch 23, the owner's call): the Lightning card (§15.15) opens later than the other blessings, at stage 8, so the early game stays as it is: the meta bot's better players first clear stage 8 after about an hour (median 68 minutes), and until a profile buys a level its chance is 0 and no blessing pick offers it, so every earlier run plays exactly as before. Its first level is dearer than the Joker Cat's.

v0.55 (the owner's call, docs/plans/weapons-and-passives.md §3.1.1): the **Katana's card** opens at stage 10, after the second jar. Its levels open the Katana's picks one by one, each up to its own top level: 1 the Katana (20K), 2 Quick Katana (32K), 3 Wide Blade (50K), 4 More Blades (75K), 177K in all. Until a profile buys its first level no run offers any of them, so every earlier run plays as before.

Every card but Lightning and the Katana costs ~1.02M coins in all (~610K in v0.36–v0.38); Lightning adds 225K (~1.25M in all), bought at the end of the pacing model's timeline, where runs pay most: about an hour more to buy everything. Big Drops has 3 levels: its tilt adds to Big Catch's up to 13 (§8), and one level (3) on top of Big Catch 10 (12) already reaches it. The prices come from a pacing model (docs/plans/batch-20.md §7): a player who keeps playing and buys whatever is affordable has bought everything in about 8 hours. Rerun with v0.39's effects (power 1.5 times as strong, so runs go further and pay more), the model buys everything in ~7.8 hours (12 runs; 8.9 hours and 23 runs with v0.36's numbers), with runs reaching stage ~14 after an hour and ~17 after two. In v0.36–v0.38 the first run (about 5 minutes) paid for two or three cheap cards, and runs reached stage ~7 after an hour, ~10 after two and ~16 after four. Until v0.36 the four upgrades cost 21,455 in all (Lucky Paw 50 to 3200, Big Catch 100 to 3500 for 5 levels of 3 points, Combo Charm 80 to 1280, Second Chance 500 and 4000), and the blessings were all open from the first run.

Derived values, where each name means that card's current level:

- `coinMultiplier = 1 + 0.225 × luckyPaw`
- `comboBonus = 0.12 × comboCharm × min(combo − 1, 5)`
- `luckySaves = secondChance`
- the drop tilt from Big Catch: `1.2 × bigCatch` (§8)
- each blessing's highest level in a run: its card's level
- each weapon pick's highest level in a run: 0 until a level of its weapon's card opens it, then its own top level

Upgrade definitions are data in `src/config/upgrades.ts`: id, name, description, max level, prices and effect.

Removed upgrades give back every coin spent on them when an older save loads (§11):

- Quick Growth (−6% expansion thresholds), in v0.10, when stage clears replaced the score thresholds.
- Shrine Expansion (unlocked stages 3, 4 and 5) and Fortune Teller (showed the next 2 cats), in v0.12: every stage is open, and the HUD shows one next cat.

- Golden Merge (+3% per level that a merge pays ×3 coins; 120, 240, 480, 960 and 1900), in v0.21: golden cats skip a tier instead (§15.4).

Golden Touch (golden dropped cats) became Golden Merge in v0.12; its level carried over.

## 11. Saved data

Everything is stored locally, with a version number:

- wallet coins and the shop cards' levels (upgrades and blessing cards)
- records: best score, best stage, highest tier ever made
- stats: runs played, total merges, total coins earned, jackpots
- settings: sound, haptics, reduce motion, day and night (v0.51, added without a version step: a save without it has it on)
- flags: which first-run hints have been seen (with the cards of §15.5: the boulders' since v0.49, Cursed Bell's, the Wind's, Porcelain's and one per rule since v0.50, each added without a version step: a save without one hasn't seen it), and which how-it-works clips have been opened (§2.5; v0.38, added without a version step: a save without it has seen none)

The run in progress is saved too (v0.27, the owner's call; until then closing the app ended it): the stage, every cat and boulder in the jar where it lies, the score and the run's coins, the dropper and NEXT, the trials, rules and blessings, the wind's direction, which cats are cracked (Porcelain), the cursed cat and its bell (§15.12) the Lucky Saves left, a stage clear's waiting pick or a growing jar. It is written whenever the wallet is (at most once a second while coins come in) and when the app goes to the background or closes. The next launch opens the game screen straight away, paused where the run stopped, with Resume (a waiting pick shows under the pause). Quit to Menu and game over end the run, and the next launch opens the menu. Cats that were still falling or rolling go on a little differently than they would have; a settled pile doesn't move. A saved run that a new version can't read is dropped (the profile is never lost).

The save format is at version 7:

- v1 → v2 (v0.10) removed Quick Growth and returns the coins spent on its levels to the wallet (150, 300, 600, 1200 and 2400 for levels 1–5).
- v2 → v3 (v0.12) removed Shrine Expansion (1500, 10000 and 60000 back) and Fortune Teller (400 back), moves the Golden Touch level to Golden Merge, and caps a record tier above 51 (stages had 12 cats, up to tier 56) at 51.
- v3 → v4 (v0.15) caps a record tier above 46 (stages had 11 cats, up to tier 51) at 46.
- v4 → v5 (v0.21) removed Golden Merge and returns the coins spent on its levels.
- v5 → v6 (v0.24) caps a record tier above 45 (stages had 10 cats, up to tier 46) at 45.
- v6 → v7 (v0.36, the new economy) starts every profile over, the owner's call: only the settings (sound, haptics, reduce motion) stay; coins, upgrades, records, stats and the first-run hints go. A run saved before it is dropped. (So older saves pass the earlier steps and start over too.)

If a save can't be read, or some of its fields are invalid, a copy is kept (TECH_SPEC §8) and the game continues with the valid fields and defaults for the rest.

## 12. Feedback and juice

- Merge: a pop scale, a particle burst in the cat's colour, a floating "+coins", and a coin icon that flies to the HUD counter. A golden cat's merge (§15.4) shows a bigger "+coins", bursts gold sparks, rings a bell and sends three coins; a Jackpot shows an even bigger "+coins", a gold spark burst and a shower of coins.
- Merges also bump the new cat (a short scale pop on top of its growth) and burst particles in its colour, more for bigger cats.
- Combo: "Combo ×N" over the jar and, with Combo Charm, its coin bonus under it on a gold pill ("+48% coins"). The score bonus is not shown (v0.42.4, the owner's call; v0.36 showed it on a cream pill, "+30% score"). The label heats up (bigger, brighter) at ×4 and ×7.
- Danger: the countdown number pulses on each new second, with a tick that rises in pitch (3, 2, 1).
- Stage clear: every other cat pops in turn with its "+coins", and the Jackpot fanfare plays.
- Stage clear: the pops ripple down the jar, the last cat shines (halo, turning rays, sparkles) and pops in a burst (§7.1). Expansion: gold sparks along the rim as the shrine grows and again at the reveal; the growth clouds (§7.1).
- Batch 18 (§15.8–§15.11): the wind's petals and streaks drift across the top of the screen; a heavy drop trails speed lines and embers, and its fireball lands in fire sparks with a thud and a small shake; a crack throws white chips with a tink, a break pops the cat with a shatter, and a cracked cat's merge flashes gold on the new cat; an echo cat fades in with ripple rings and a soft bell echo; a Hubris three bursts bigger and rings a bell.
- Batch 23 (§15.15): in a lightning strike a bolt comes down from the sky onto the lightning ball and bolts chain from it to every struck ball, flickering, with a flash, a ring and crackles where each lands; the struck balls pop at once in yellow sparks, with a zap, a crack and rolling thunder, a jolt and the strong haptic pattern.
- Batch 19 (§15.12–§15.14): a cursed cat is covered in stone patches, more of them in the second half of its count; it turns to stone with a fade into its boulder, stone chips and a grind; a lifted curse sparkles and chimes like a golden merge; NEXT's cat pops when Copycat changes it; a lucky die chimes and a fizzle clacks.
- Sound effects are procedural Web Audio, no files:
  - drop plop; merge pop (lower pitch for bigger sizes, the same at every stage); coin ching
  - rising combo notes; Jackpot and stage-clear fanfare; expansion whoosh + chime
  - danger tick; game over; UI click; purchase
  - Heavy Drop's thud; Porcelain's tink and shatter; Echo's bell echo (§15.9–§15.11)
  - Cursed Bell's dull iron bell as a curse begins and the low grind of a cat turning to stone; Dice's clack for a fizzle (a lucky roll chimes like a golden merge) (§15.12, §15.14)
  - Lightning's thunder: an electric zap, a sharp stuttering crack and a low rumble (§15.15)
- Haptics (Android only, toggled in Pause and in Settings): a light tick per merge (at most one every 70 ms) and a stronger pattern for Jackpots, stage clears, expansions and Lucky Saves.
- A small camera shake for merges into size 9 and above (stronger for bigger cats), for Jackpots, and a light one that grows with the combo from ×5. Reduce motion (the setting or `prefers-reduced-motion`): no shake and about a third of the particles.
- Menu: the title floats, the lucky cat sways on its cushion, the coins bob, PLAY sends out a soft ring every few seconds, the UPGRADES dot nudges, and buttons sink into their ink edge when tapped.
- Every button clicks; a purchase plays its own sound. Sound off (Settings or Pause) silences everything.

## 13. Art

### 13.1 The lucky cats (the cat art, the default since v0.16)

The owner chose the scene in a design canvas (v0.14): a cream shrine garden, ink outlines, soft pastels. Since v0.16 the cats, and since v0.17 the jar, the paw and the background, are raster art the owner generated with an AI image tool from a reference image (docs/ART_ASSETS.md); so are the HUD's pieces since v0.19 and the main menu since v0.20. The shop, settings and overlays are still drawn in code until their art arrives. With `?skin=vector` (or if the art can't load) the game uses the code-drawn art of v0.11–v0.15.

- **Cats** (`public/assets/cats/`, `src/config/catSprites.ts`): round maneki-neko balls in the reference image's style, one look per size. Every cat is a perfect circle with only its ears above it, raises one paw (on the viewer's right, palm and pink pads forward) and wears a collar with a gold bell. Each look is one solid body colour with a lighter belly, so the nine look clearly different at a glance (the owner rejected multi-colour coats as hard to tell apart).

  | Size | Look   | Body colour | What else makes it different                    |
  | ---: | ------ | ----------- | ----------------------------------------------- |
  |    1 | Shiro  | white       | Closed happy eyes, red collar                   |
  |    2 | Kuro   | charcoal    | Grey belly, big golden eyes, red collar         |
  |    3 | Mikan  | orange      | Tabby stripes, sky-blue collar                  |
  |    4 | Sora   | sky blue    | Winking, dark stripes, red collar               |
  |    5 | Sakura | pink        | Tongue out, mint collar                         |
  |    6 | Matcha | green       | Forehead stripes, red collar                    |
  |    7 | Fuji   | purple      | Gold collar, sakura flower on one ear           |
  |    8 | Aka    | red         | Tabby stripes, gold collar and a gold coin      |
  |    9 | Kin    | gold        | Red bib with gold trim, sakura flower on an ear |

  The game draws a thick dark outline (#3b2620) round every cat (v0.18, like the owner's reference image), so neighbouring cats never blend into each other: 5% of the cat's radius, at least 4.5 world units, and the body is drawn that much smaller so the outline's outer edge is the physics radius. DOM icons get a 1 px outline.

  The tool (`npm run art`, TECH_SPEC §14) removes the images' white background and fits each body circle, and the game scales that circle onto the physics radius, so touching cats touch on screen.

- **Numbers**: the cat art shows no numbers (v0.16, the owner's call): a cat's look tells its size. The tier still sets the score and coins (§4). The vector looks (`?skin=vector`) and the placeholders still show their number, upright on the cat's plate.
- **Vector cats** (`?skin=vector`, `src/config/catArt.ts`): the code-drawn looks of v0.11–v0.15 (Sakura, Mint, Tangerine, Lavender, Sky, Calico, Matcha, Daruma, Indigo), kept as a fallback.
- **Jar** (v0.17 art, square since v0.23.4–5; v0.14 layout): a bamboo frame on two angled bamboo feet: two posts joined to a straight, level bottom with small bamboo elbow joints (the round U of v0.17–v0.23.3, the owner's call), a rail across the top tied to the posts with twine, cut caps on the posts, and the glass's pale edge framing the opening. The art's opening is stretched onto the physics jar (its inner edge, the glass's pale rim, lies inside the opening, behind the cats); the bamboo is drawn in front of the cats, except its short inner bends, which lie inside the square physics corners and are drawn behind them: a small cat deep in a corner overlaps the bend by a few pixels. A dashed line across the opening marks the rim (the danger line) and flashes red in danger (the vector jar's caps flash too). The glass is a pale wash, so the garden shows through it. The bamboo is thicker than the vector frame's, so the camera shows 0.19 of the jar's width beside each wall (0.15 before v0.17): a 283 px jar on a 390 px phone.
- **Dropper** (v0.17 art): a calico paw (white with orange and dark spots, pink pads). Since v0.25 it floats (the owner's call): the image shows 160 world units above the paw's bottom (the paw itself is about 102), and the top 55 of that fade out, so a tall phone never shows a long bare arm. Until v0.21 a plain row of its arm was stretched up to the screen's top (still so with `?skin=vector`); from v0.22 to v0.24 the arm went behind the noren.
- **Noren** (v0.22–v0.24): a shop curtain across the top of the screen, hiding the paw's long arm. Removed in v0.25 (the owner's call); the paw floats instead. Its art stays in `art-source/scene/`.
- **Background** (v0.17 art): a painted sakura shrine garden: sakura branches and clouds on a cream sky, a torii and a shrine seen through the glass, stone lanterns either side, and a rug on the wooden floor where the jar stands. It moves and scales with the jar so the feet stay on the rug; it always spans the screen's width, its top fades into the sky colour, and the floor colour fills the screen below it. The separate rug image is unused: the background has its own. Since v0.51 every jar's background also comes at sunset and at night (§7.3), each placed by its measured fit onto the day picture, so its rug lies under the jar's feet.
- **HUD** (v0.19 art, v0.19.2 cards after the owner's reference image, v0.22 score card and bubble copied from the owner's references `art-source/hud/ref-score.png` and `ref-next.png`): the score card is the owner's image (66 px tall, 141 px wide, wider for a long score): cream with a dark chocolate outline, a white highlight inside its top edge and a tan base, a white beckoning paw with pink pads sticking out of its left end, "SCORE:" (#7F3D2A, 17 px, centred on the card's body, v0.23.2) over a caramel well with the score in it. The coins card is CSS in the reference's style: cream with a thin dark outline, rounded corners and a tan bottom edge. The coins card comes out of the screen's right edge (rounded on the left only), only as wide as its coins need (about 98 px on screen, v0.23.2), with "COINS:" (17 px) over the art's small gold coin and the run's coins, centred. The NEXT bubble hangs 14 px under it (v0.23.2). Both numbers are white with a thin brown edge. The stage is plain words at the top in the middle (22 px, dark brown #813c2d with a cream edge, like "NEXT"). The next cat sits in a round glass bubble (v0.22: a dark outline, a cream rim, mint fading to pink, white shines), with "NEXT" in dark brown with a cream edge on its top rim; the pause button is the art's glossy pink square, its outline recoloured to the reference's rose brown. Flying coins land on the coin. The vector HUD of v0.14 stays for `?skin=vector`.
- **One coin** (v0.42.4, the owner's call): every coin in the game is the HUD's gold coin (`assets/hud/coin.webp`, `ui/coinIcon.ts`): the HUD, the menu, the Upgrades screen and its prices, the Jackpot banner, the coins flying to the counter and Game Over, in every skin. The menu's paw coin and the code-drawn mon coin are gone.
- **Main menu** (v0.20 art, §2.1): the owner first generated a whole-screen mockup, then every piece as an edit of it, so they keep its look: the garden without the interface (it added a stone path, kept by the owner's call; since v0.51 the menu shows the first jar's garden instead, and this one is unused), the logo, the cat on its cushion (its cushion turned from the generated peach back to the mockup's pink by the tool), the buttons and a record card, and the small icons (torii, coin, arrow, sparkles). PLAY, UPGRADES and the coins pill stretch as three-slice strips, so they take any width. Since v0.42.5 the record cards are the HUD's score card instead of the generated card, its well and the paw badge on it (the files stay; the shop and the game use some of them); BEST STAGE keeps the torii. The glow and the twinkling sparkles are drawn in code.
- **Upgrades screen** (v0.31 art, §2.2): built from the owner's approved mockup (`art-source/ui/upgrades-mockup.jpg`): an empty card (a nine-slice: its tan stat strip keeps its height), the gold Buy button and the title's cream pill (three-slice strips), the round close button, and the four icons: Lucky Paw (a beckoning paw with a koban) and Combo Charm (an omamori) from the mockup, Big Catch (a big lucky cat with a small one and a gold up arrow) and Second Chance (the cats' gold bell with a heart) made with the icon kit. Every icon is a round cream medallion with a gold rim (docs/ART_ASSETS.md §5).
- **Special balls** (v0.30 art, §15): the owner's magnet (a red horseshoe magnet on a cream coin with a gold rim), hanabi (a navy firework shell), joker cat (a rainbow-striped maneki-neko in a jester hat, winking) and boulder (a grey stone with 0–3 iron bands). They are scaled and outlined like the cats, their body circle on the physics radius (the hanabi's fuse and the joker's ears and hat stick out above it), and NEXT shows them too. The lightning ball (v0.42.1, docs/ART_ASSETS.md §4.16) is the owner's little storm: indigo and violet clouds rolled into a ball with a bold yellow bolt across it; with `?skin=vector` a code-drawn violet ball with a yellow bolt (v0.42.0 showed it, and a bolt glyph on its cards, until the art came). The code-drawn looks of v0.21–v0.29 stay for `?skin=vector`; `?skin=placeholder` still shows a boulder's merges left as a number.
- **Stage doors** (v0.29 art, §7.1): two images the owner generated: a 9:16 picture (a sakura shrine garden with a torii, a shrine, a big gold sun in the middle and gold coins hanging from the top) and one empty door frame (glossy rose-brown wood, gold corner caps, two rows of cream lattice windows at the top and at the bottom). The game cuts the picture into four strips and lays the frame over each; the frame's sides stretch to the screen's height and its lattice stays whole. The picture covers the screen (its sides are cropped on a narrow phone). Each wing folds in perspective, the inner doors darker as they turn from the light.
- **Palette**: cream ground, paper plates, ink outlines and text, cocoa for labels; coral only for the primary button of a screen (PLAY, Resume, Play Again), gold for coins, rewards and progress, red for danger and badges, mint for secondary buttons and "on". One font: Fredoka (700 for titles, numbers and buttons; 500–600 for labels).

### 13.2 Placeholder (`?skin=placeholder`)

- Each size is a flat circle in its own colour with a darker outline, and the tier number in bold Fredoka, centered. The number stays upright while the circle rotates.
- There are 9 colours, one per size, repeating every 9 tiers.

### 13.3 Owner art (M13)

The owner generates the art phase by phase with the prompts in docs/ART_ASSETS.md and drops the files into `art-source/`: the cats are in (v0.16); the scene, the HUD kit, the menu art and the app icon follow. Images come on a plain white background; the tool cuts it out.

- Cats roll like Suika fruit (v0.11).
- Optional later: a music loop (OGG/MP3, licensed for use, with a music switch in Settings). v0.47.0–v0.47.2 had one (a koto loop with Music switches in Settings and Pause); the owner removed it in v0.47.3, even turned down 17.5 dB.

## 14. Balance targets (v0.36 and v0.39, the owner's)

- **Most players clear stage 5 within their first 15 minutes** (v0.39), two or three runs. The shop got stronger and its first levels cheaper for it (§10). The owner turned down two further helps: a first-jar protection (the Lucky Saves refilled at every clear of stages 1–5), which met the 15 minutes in the bot's play, and an opening blessing pick at the start of every run.
- A **new player's** first run ends at stage 2–3, rarely 4 (the owner, a practised player, goes further on a fresh profile).
- The first run pays for a few cheap levels (150–400 coins each since v0.39).
- Every card is bought in about **8 hours** of continuous play, buying as soon as something is affordable.
- A maxed profile clears **30 stages in about 50 minutes** on average, the early stages faster than before v0.36 (Big Catch 10, §8), and scores about **5 million** by then (§4).
- Progress comes often: unlocks by stage gates and the shop only, no player levels or XP.

The owner's playtests on a fresh profile check them; the debug panel shows each stage's play time (TECH_SPEC §11). The Lightning blessing (v0.42, §15.15) opens at stage 8, about an hour in, and changes nothing before a profile buys it.

Measured for v0.39 with the meta bot (`npm run sim -- --meta 30 --seeds 24`, TECH_SPEC §11): 24 players start from a fresh profile, play with the smart bot and buy the cheapest card after every run. Bots aren't people, so the numbers compare versions rather than predict play:

| Player                                                                                            | Stage 5 within 15 min | Within 30 min | First run reaches |
| ------------------------------------------------------------------------------------------------- | --------------------: | ------------: | ----------------: |
| Smart bot with one extra Lucky Save (a better player; v0.38 stalls at stages 5–6, like the owner) |    6 of 24 (v0.38: 2) | 16 (v0.38: 8) |           stage 4 |
| The smart bot alone (a weak new player)                                                           |    1 of 24 (v0.38: 2) |  7 (v0.38: 5) |           stage 2 |

**v0.50 (the teaching order and the Lucky gift, §15.5)**, measured before and after with the same bots: stage 5 within 15 / 30 minutes 1 / 9 of 24 → 2 / 8 (the smart bot alone) and 9 / 17 → 6 / 16 (with one extra Lucky Save); a maxed profile's runs (`npm run sim -- base --aim smart --upgrades max --stages 40 --cap 3600 --seeds 60`) reach stage 8 → 7 (median); every card bought (`--meta 720`, the smart bot alone) after 575 → 576 minutes (the bot plays slower than the pacing model's 8 hours, §10), its runs reaching stage 10.5 → 12.5 after 8 hours. At 24 players the 15-minute figures are noise; nothing was retuned.

**v0.52 (the first stage's help, §8)**, measured before and after with the same bots (`--meta 30 --seeds 24`): stage 5 within 15 / 30 minutes 2 / 8 of 24 → 3 / 10 (the smart bot alone, its first run reaching stage 2 → 2.5, median) and 6 / 16 → 9 / 17 (with one extra Lucky Save, the median player there after 23.4 → 18.2 minutes). Nothing else was retuned; from stage 2 on runs play as before.

A maxed profile's smart bot clears 5 stages in 44 runs of 60 and reaches stage ~6 (median); v0.38's cleared 5 in 29. After v0.39.1 took the magnets out of runs without More Magnets (§15.1), the better player clears stage 5 within 15 minutes in 1 of 24 profiles and within 30 in 15, the weak bot in 1 and 3: at 24 players the 15-minute figure is noisy, but the early game lost a little help. (M10's targets, written for score thresholds, were set aside in v0.10.)

## 15. Special balls, trials and blessings

> The owner's design (2026-10-08), built in v0.21. Its numbers are starting values: balance and the economy come later.

Later stages get harder and every run gets its own build. Every stage clear asks the player to pick a **trial**, which makes the coming stages harder, and then a **blessing**, which helps (the first ten clears follow a teaching order, v0.50, §15.5); every 5 stages, where the jar grows, a **rule**, which changes how the game works, takes the trial's place (v0.34, the owner's call). Picks stack by level for the rest of the run, like Vampire Survivors' level-ups: the same pick again raises its level; a rule has one level, on or off. Trials work through **boulders** (more, bigger, harder to break), the **wind**, **porcelain** cats (v0.34: trials that make the game harder in different ways, which don't build on each other) and the **Cursed Bell** with its two follow-ups (Batch 19). Rules: **Hubris** and **Echo** (v0.34), **Copycat** and **Dice** (Batch 19), and **Heavy Drop** (a trial from v0.34, a rule since v0.40). Blessings work through **magnets**, bigger drops, **golden cats**, **hanabi**, **joker cats** (since v0.28) and **lightning balls** (v0.42). Since v0.55 the blessings also hold the first **weapon**, the **Katana** (§15.16; the weapons-and-passives direction, docs/plans/weapons-and-passives.md): taking it once opens it, and its upgrades are blessing picks of their own.

### 15.1 The queue

The dropper hands out six kinds of ball, cats, magnets, boulders, hanabi, joker cats and lightning balls, and the katana (v0.55), which never goes into the jar as a ball. Every item rolls its kind when it is queued, with one roll checked in this order:

| Kind      | Chance per queued item                                                      |
| --------- | --------------------------------------------------------------------------- |
| Magnet    | 2.25% per More Magnets level (0% without); none in a stage's first 20 drops |
| Boulder   | 0% at stage 1; from stage 2, 3% + 3% per More Boulders level                |
| Hanabi    | 2.25% per Hanabi level (0% without); none in a stage's first 20 drops       |
| Joker     | 2.25% per Joker Cat level (0% without)                                      |
| Lightning | 1.5% per Lightning level (0% without); none in a stage's first 20 drops     |
| Katana    | 2.25% once taken, +2.25% per Quick Katana level; none in the first 20 drops |
| Cat       | the rest; a cat is golden with 6% per Golden Cats level (0% without)        |

- The first two drops of a run are always cats of the pool's smallest tier (§8).
- The wind (§15.8) and Heavy Drop (§15.9) act on every ball that leaves the paw, whatever its kind (a cat, a golden cat, a boulder, a hanabi, a joker, a lightning ball, a ball the magnet took and drops again), from the drop until it first touches a ball or the floor (a wall doesn't end a fall, §15.8).
- **No magnet early in a stage** (v0.24, owner): only items queued after the player has dropped 20 balls in the stage can be magnets, so the first that can be one is the 22nd ball (NEXT after the 20th drop). Every stage starts with an empty jar, where a magnet would have nothing to take. The count starts again at every stage clear, the last stage's too. While magnets are held back the boulder chance stays the same. The same holds for hanabi (v0.28): an empty jar has nothing for one to pop.
- **At a stage clear** a queued magnet, hanabi, lightning ball or katana (in the paw or in NEXT) becomes a cat of the pool's smallest tier; other queued items stay as they are. Like magnets and hanabi, no lightning ball comes in a stage's first 20 drops (v0.42): an empty jar has nothing to strike.
- v0.24 (owner): the magnet chance was halved, 2% → 1% and +3% → +1.5% per More Magnets level. v0.39 (owner): every blessing level counts 1.5 times as much, so +2.25% (golden cats 4% → 6%, hanabi and jokers 1.5% → 2.25%). v0.39.1 (owner): no magnets without the More Magnets blessing, like hanabi and jokers; until then every run had 1%, a fresh profile too.
- Magnets, boulders, hanabi, jokers, lightning balls and katanas are never golden. The katana is rolled last (after the lightning ball), so a seed's other kinds stay where they were.
- Debug jumps (`?debug=1`, "Jump to stage") skip the stage-clear picks.
- The NEXT bubble shows the item as it is: a cat (golden ones with their glow), the magnet, the boulder at its size with its bands, the hanabi, the joker, the lightning ball or the katana's ball.
- A level picked at a stage clear applies to items queued after the pick. The two items already queued (in the paw and in NEXT) stay as they are. At an expansion, queued cats change tier as in §8, and queued boulders keep their size and bands.
- Determinism: kind and golden roll on their own generator, seeded from the run's seed. Every queued item rolls its kind, its golden and its tier every time, whatever the chances, so a seed gives the same tiers at any level (in stage 1 the tiers also follow the jar, §8).

### 15.2 Magnet

The magnet takes one ball out of the jar and puts it in the paw, to be dropped again.

- When the magnet reaches the paw, the paw holds the magnet instead of a cat and the aim guide hides. A touch on the jar now selects a ball instead of aiming.
- **Select:** tap a ball. Any ball in the jar that has landed (§6) can be selected, cat, boulder, hanabi, joker or a waiting lightning ball; a ball still falling from the dropper can't. A taken hanabi's fuse goes out; it lights again when the dropped hanabi lands. The selected ball gets a pulsing gold ring that follows it, and a **Take** button appears just above it (kept on screen).
- Tap another ball to move the selection; tap anywhere else to clear it. The selection also clears if the selected ball merges, breaks or pops, or a stage clear starts.
- **Confirm:** Take. The button ignores taps in its first 0.3 s, so a quick double tap can't take a ball by mistake.
- The taken ball leaves the jar and flies up into the paw (0.25 s, input ignored). It keeps its tier and golden glow, or, for a boulder, its size and the hits it still needs. The player aims and drops it like any cat (§3); the usual cooldown follows, then the next item.
- The magnet is used up. Taking doesn't move the queue: the taken ball replaces the magnet and NEXT stays.
- There's no skip: the magnet stays in the paw until it takes a ball. Physics, the danger timer and the combo window keep running while the player chooses, as while aiming a cat. Pause works as usual.
- **Big balls in the paw:** the band above the rim holds a size-4 cat, the biggest drop. A held ball bigger than size 4 is drawn in the paw at size 4's radius. When released, it takes its true radius with its bottom edge where a size-4 cat's bottom edge would be, and falls. The aim ghost shows its true size, and the aim clamp uses its true radius.
- The first magnet of a profile shows a first-run hint: "Tap a cat, then Take".

### 15.3 Boulder

A boulder is a stone ball that only takes up room.

- It never merges, with cats or with other boulders.
- It uses the same physics as a cat of its size, and counts for the danger line and game over like a cat (§6).
- **Size:** size 2 (radius 49), one size bigger per Big Boulders level. The size is fixed when the boulder is queued.
- **Hits:** a boulder takes a hit from every merge in which at least one of the two merging cats is within 15 world units of it, edge to edge, when the merge resolves: touching, or so close the gap doesn't show (v0.21: cats resting side by side on the floor often leave a gap of a few units). A Jackpot counts as a merge. One merge hits each boulder it reaches once.
- **Breaking:** a boulder needs 1 hit, plus 1 per Iron Bands level at the time it was queued. The last hit breaks it.
- **Look:** grey stone with an ink outline like the cats. Every extra hit it needs is one iron band (a metal plate) round it. Since v0.30 it is the owner's art (§13.1): the same stone with 0, 1, 2 or 3 riveted steel bands.
  - Each hit knocks one band off, with a clang and a few sparks.
  - The bare stone breaks on the next hit, with a crunch and stone chips.
  - So the bands show at a glance how many merges are left.
  - With `?skin=placeholder`, a boulder is a grey circle showing the hits left as a number.
- Breaking pays no score or coins for now and doesn't count for the combo.
- **Stage clear:** every boulder in the jar crumbles along with the pops (§7.1), paying nothing.
- **The boulders' card** (v0.49, the owner's request): boulders come from stage 2, so as stage 2 opens after stage 1's blessing, a card shows over the empty jar, once per profile: the first of the teaching order's cards (§15.5), with its own clip (a boulder dropped from the paw lands beside a 2, then a 2 dropped onto that 2 merges right beside it and breaks it) and the line "Now and then the paw drops a boulder. It never merges: merge two cats right beside it to break it." (v0.49 held the blessing back under it; since v0.50 the blessing applies as the doors open and the card holds time instead.)
- **Lucky Save:** boulders over the line crumble; boulders don't count among the 9 smallest cats.
- The magnet can take a boulder (§15.2).

### 15.4 Golden cats

- A golden cat is a normal cat of its tier with a gold glow and sparkles. It must stay easy to tell apart from Kin (size 9), whose body is gold.
- Golden cats only come from the dropper, so they are always sizes 1–4. A merge never makes a golden cat.
- **Merging:** it merges with a cat of its tier, golden or not. When at least one of the two is golden, the new cat is **two tiers** higher instead of one: two 3s make a 5. The new cat is never above the stage's last cat. Drops can't reach that cap, but the debug tools can.
- The new cat isn't golden. It is born and grows as in §5 (over about 120 ms from the old size to its new one), so it pushes its neighbours harder but never launches them.
- The merge pays score and coins like a normal merge of the two cats' tier, and counts once for the combo (economy later). A golden cat that pops (stage clear, Lucky Save) pays its plain value.
- Feedback: the bell and gold sparks of a golden merge, and a bigger pop.
- Golden cats replaced the Golden Merge upgrade (a merge's chance to pay ×3 coins), removed in v0.21.

### 15.5 Stage-clear picks

At every stage clear the picks come after the last cat settles alone and pops (§7.1 step 2), or, every 5 stages, after the jar has grown (§7.1 step 4). From stage 11's clear on there are two: a trial, then a blessing; at the clears that grow the jar (stages 15, 20, …) the first pick is a rule instead of a trial (v0.34, the owner's call); once every rule is taken (five since v0.40), those clears offer a trial as usual.

**The teaching order** (v0.50, the owner's schedule; v0.49 began it with stage 1's blessing and the boulders' card). The first ten clears bring the hazards in one at a time: each is shown on a card as a stage opens, and becomes a trial only at that stage's clear, so a player is never asked to pick a trial about something they haven't been shown. The schedule is data (`TEACHING_CLEARS` in `src/config/picks.ts`, by stage, and `LATE_CLEARS_FROM` = 11, from which the picks above take over):

| Clear | Picks                                                                           | Card as the next stage opens    |
| ----: | ------------------------------------------------------------------------------- | ------------------------------- |
|     1 | blessing                                                                        | Boulders                        |
|     2 | trial (boulder trials only: More Boulders, Iron Bands, Big Boulders) + blessing | –                               |
|     3 | blessing                                                                        | Cursed Bell                     |
|     4 | trial (boulder and curse trials) + blessing                                     | –                               |
|     5 | rule + blessing (after the jar grows)                                           | the rule chosen                 |
|     6 | blessing                                                                        | Wind                            |
|     7 | trial (boulder, curse and wind trials) + blessing                               | –                               |
|     8 | blessing                                                                        | Porcelain                       |
|     9 | trial (every trial) + blessing                                                  | –                               |
|    10 | rule + blessing                                                                 | the rule chosen                 |
| 11 on | trial + blessing; rule + blessing every 5 stages                                | the rule chosen, the first time |

Follow-ups keep their "Needs" (Quick Curse and More Curses only once Cursed Bell is taken). A trial pool with fewer than 3 open shows fewer cards; with none open the trial pick is skipped. A rule pick with no rule left (from stage 15) offers a trial from that clear's pool. The debug panel's Picks and Rule pick open the picks as after stage 10.

**The cards** (v0.50; the boulders' since v0.49): as a stage opens, after its picks and the doors (or after "Stage clear!" when the clear had no pick), a card shows over the empty jar: the clip popup (§2.5) with the hazard's or the rule's name in the title lettering, its clip, one line, and a small **Got it** button under it (the menu's coral PLAY pill, as on the picks' Choose) in place of the close button.

- **Boulders** (stage 2, §15.3): its own clip, "Now and then the paw drops a boulder. It never merges: merge two cats right beside it to break it."
- **Cursed Bell** (stage 4, §15.12): "A trial can curse a cat: merge it before its bell runs out, or it turns to stone."
- **Wind** (stage 7, §15.8): the clip blows the run's way; "A trial can bring wind: it blows falling cats sideways. Aim against it."
- **Porcelain** (stage 9, §15.10): "A trial can make cats porcelain: merges crack the cats beside them; cracked twice, a cat breaks in two."
- **A rule** (§15.11), the first time a profile takes it: as the next stage opens, its name, its clip and its line from the rules table ("Every merge rolls a die: sometimes a size more, sometimes it fizzles."). Its hint pill (Hubris, Copycat, Heavy Drop) shows only when no card does. One card per rule.

Unlike boulders, those hazards come only once their trial is taken, so their lines say a trial can bring them. Only Got it or the back button closes a card, never a tap outside, and Got it ignores taps for its first 0.4 s, like the picks. Time stays stopped from the moment the stage opens until the last card closes (several cards would show one after another); the pause covers it, and Resume leaves it waiting; a run saved under it comes back to it, under the pause. Each card shows once per profile (a first-run hint, saved, §11): "How to play" brings them back (§2.4), and so does the tester reset; never in a scene (§2.6) or on a debug jump. Profiles from before v0.50 see each new card once, as v0.49 showed the boulders' card to everyone.

**The Lucky gift** (v0.50, the owner's call): a fresh profile can take only two blessing levels in a run (Golden Cats 1 and Big Drops 1, §10), so from about stage 3 its blessing picks would have nothing to offer, on exactly the stages the teaching order is for. Whenever a clear's blessing pick has nothing open, there is no pick: a **"Lucky gift!"** banner pays coins instead, the cleared stage's last cat's pop value again (§5) times `LUCKY_GIFT_FACTOR` (1, `src/config/economy.ts`), which fly from the banner to the counter with the coin sound, like a Jackpot's. They are run coins like any other (banked at once). The banner shows as the next stage opens (after "Stage clear!" when no doors came), and a card that comes with it waits 1.4 s, so the gift shows first. Measured with the meta bot, the time to buy every card moved by less than 1% (575 → 576 minutes), well inside the 10% the owner allowed, so the factor stays 1 (§14).

The cards show in front of the shut stage doors (§7.1). With the art skin (v0.32) they are built from the Upgrades screen's pieces (§13.1): the title on its cream pill with a line under it, three cards with the icon, the name and the level change ("Lv 0 → 1"), the effect and the stat in the tan strip, and Choose on the menu's coral PLAY pill, faded until a card is chosen. The chosen card pops forward (0.22 s, overshooting a little) in a thick ring of light, blue for a trial, vermilion (the shrine's red) for a rule and gold for a blessing (v0.32.2, the owner found the first glow too faint; v0.32.4 dropped the dimming of the other cards, the owner's call; the rule's since v0.34). While the doors are shut the jar behind them isn't drawn, so the picks run smoothly on slow phones. Each card's icon is the game's own art for the ball it is about, in a cream medallion, stone-grey rimmed for a trial, vermilion for a rule and gold for a blessing (v0.32.1, the owner's call; the rule's rim since v0.34, drawn in CSS like the others): a pyramid of three boulders for More Boulders and a big boulder with a small one and an arrow for Big Boulders (the owner's pictures, v0.32.4); for Iron Bands the boulder as the pick will make it, with one band more than now; the magnet, the hanabi, the joker and the lightning ball for theirs; the biggest drop (the size-4 cat) for Big Drops; a white cat with a gold glow for Golden Cats. Batch 18's five picks get the owner's own pictures (docs/ART_ASSETS.md §4.12; the Wind's carp streamer is mirrored when the run's wind blows to the left), and so do Batch 19's five (§4.13: the worried cat turning to stone for Cursed Bell, the bell and an hourglass for Quick Curse, three bells for More Curses, the black cat and its copy for Copycat, a dice cup for Dice); a pick whose picture hasn't come yet shows the cat it is about. An icon made later with the icon kit (docs/ART_ASSETS.md §5) would take its card's place.

1. **Choose a trial:** 3 cards; the player picks one. Where the jar grows, **Choose a rule** ("It changes the game for the rest of the run") instead: the rules left, at most 3 (of 4); a rule's card reads "New rule" where a trial's shows its level change.
2. **Choose a blessing:** 3 cards; the player picks one.

Then play resumes in the next stage as the doors open: in the grown jar, or in the same empty jar.

- **Options:** each pick shows up to 3 different options, drawn at random from those that are open, with the run's seeded RNG. An option is open when it isn't at its max level (for a blessing: at its shop card's level, §10, v0.36) and, for a **follow-up**, once the pick it needs has been taken (Batch 19): Quick Curse and More Curses are never offered before Cursed Bell. Today there are 8 trials (6 open at first), so the trial pick shows 3 of them, 5 rules (v0.40: Heavy Drop became one), so a rule pick shows 3 of the 5 in random order, and 10 blessings (Lightning since v0.42; the Katana and its three upgrades since v0.55, which need the Katana and their shop card's level), so the blessing pick shows 3 of those open, two of the Katana's upgrades side by side at times. With fewer than 3 open it shows fewer cards; with none open the pick is skipped (a blessing pick pays a Lucky gift instead, v0.50). A trial pick in the teaching order draws only from its clear's trials.
- The player must pick exactly one: no skip, no reroll, no rarities.
- **Levels:** a pick raises that option's level by 1. Levels last for the run, and every run starts at 0. They are saved with the run in progress (§11).
- **Card:** an icon, the name, a one-line effect, the level as pips with "Lv 1 → 2", and the value it changes (current → next), like a shop card (§2.2). Every trial, rule and blessing but Big Drops has a clip button on its icon that shows what it does (§2.5, v0.38); a tap on it doesn't select the card.
- **Choosing:** tap a card to select it (it lifts and glows), then tap **Choose** to confirm. Taps are ignored for the panel's first 0.4 s, because a clear often comes right after a drop and a tap still in flight mustn't pick.
- **Time:** time stays stopped while the panel is up (physics, the drop cooldown, the combo window, the danger timer). The pause button, the back button (→ pause) and backgrounding work as in play; resuming returns to the pick.

**Trials**

| ID             | Name          | Effect per level                      | Max | Level 0 → max                   | Needs       |
| -------------- | ------------- | ------------------------------------- | --: | ------------------------------- | ----------- |
| `moreBoulders` | More Boulders | +3% boulder chance (from stage 2)     |   5 | 3% → 18%                        | –           |
| `ironBands`    | Iron Bands    | Boulders need one more merge to break |   3 | 1 → 4 merges                    | –           |
| `bigBoulders`  | Big Boulders  | Boulders one size bigger              |   4 | size 2 (r 49) → size 6 (r 98)   | –           |
| `wind`         | Wind          | +135 u/s² of wind (§15.8)             |   5 | Calm → Storm                    | –           |
| `porcelain`    | Porcelain     | +10% crack chance (§15.10)            |   4 | 0% → 40%                        | –           |
| `cursedBell`   | Cursed Bell   | Now and then a cat is cursed (§15.12) |   1 | Off → On                        | –           |
| `quickCurse`   | Quick Curse   | Cursed cats turn to stone sooner      |   3 | 10 → 8 → 7 → 6 drops to stone   | Cursed Bell |
| `moreCurses`   | More Curses   | Curses come more often                |   3 | 30 → 25 → 20 → 15 drops between | Cursed Bell |

The boulder trials still multiply each other (more × bigger × harder to break), and so do Quick Curse and More Curses; a pick shows 3 of the open trials, so the player can steer around them. Balance comes later.

**Rules** (v0.34, one level each, §15.11)

| ID          | Name       | Effect                                                                         | Card value                               |
| ----------- | ---------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| `hubris`    | Hubris     | Sizes 1–5 wait a moment to merge in pairs; three merge at once and skip a size | Small pairs merge: At once → After 0.5 s |
| `echo`      | Echo       | Merges of sizes 5–7 leave a cat of their size behind, once per drop            | Off → On                                 |
| `copycat`   | Copycat    | The next cat copies the size of your last merge (§15.13)                       | Next cat: Random → Copied                |
| `dice`      | Dice       | Every merge rolls a die: sometimes a size more, sometimes it fizzles (§15.14)  | Merges: Sure → Rolled                    |
| `heavyDrop` | Heavy Drop | Cats shoot down like fireballs and knock aside the cat they land on (§15.9)    | Fall time: 0.88 s → 0.24 s               |

**Blessings**

| ID            | Name         | Effect per level              | Max | Level 0 → max |
| ------------- | ------------ | ----------------------------- | --: | ------------- |
| `moreMagnets` | More Magnets | +2.25% magnet chance          |   5 | 0% → 11.25%   |
| `bigDrops`    | Big Drops    | +3 drop tilt levels (§8)      |   5 | see below     |
| `goldenCats`  | Golden Cats  | +6% golden cat chance         |   5 | 0% → 30%      |
| `hanabi`      | Hanabi       | +2.25% hanabi chance (§15.6)  |   5 | 0% → 11.25%   |
| `joker`       | Joker Cat    | +2.25% joker chance (§15.7)   |   5 | 0% → 11.25%   |
| `lightning`   | Lightning    | +1.5% lightning (§15.15)      |   5 | 0% → 7.5%     |
| `katana`      | Katana       | Katanas come (§15.16)         |   1 | 0% → 2.25%    |
| `quickKatana` | Quick Katana | +2.25% katanas (needs Katana) |   2 | 2.25% → 6.75% |
| `wideBlade`   | Wide Blade   | A wider cut (needs Katana)    |   2 | Thin → Broad  |
| `moreBlades`  | More Blades  | One more blade (needs Katana) |   3 | 1 → 4 blades  |

Every blessing level counts 1.5 times as much since v0.39 (the owner's call, with the shop, §10): until then +1.5% magnets, +2 tilt levels, +4% golden cats, +1.5% hanabi and +1.5% jokers.

- **Big Drops:** the drop weights use `L = 1.2 × Big Catch level + 3 × Big Drops level`, at most 13, in §8's formula `share_i = base_i + L × (2i − 3)` %.
  - L = 6 gives 22/24/26/28%; L = 9 gives 13/21/29/37%; L = 12 gives 4/18/32/46%; L = 13 gives 1/17/33/49%.
  - Big Drops counts as maxed (not offered) once L reaches 13.
- Every blessing goes only as high as its shop card allows (§10, v0.36): a fresh profile has Golden Cats and Big Drops up to 1 and the others not at all.

### 15.6 Hanabi

> The owner's pick (2026-10-10), built in v0.28 with the numbers proposed in chat. Its look is the owner's art since v0.30 (§13.1): a Japanese firework shell (hanabi-dama) in navy washi with a painted firework burst and a short fuse.

A firework ball that clears space.

- **Size 2** (radius 49). It never merges, and counts for the danger line like a cat (§6).
- **Fuse:** it lights at its first contact (it glows and flickers) and goes off **1 s** later, with a boom, a burst of sparks and a small shake.
- **Blast:** it reaches every ball whose edge is within **200** world units of the hanabi's centre (the jar is 600 wide):
  - cats of **size 1–4** pop into their value (§5: coins, no score, no combo), as at a stage clear;
  - boulders break, paying nothing;
  - another hanabi goes off in the same tick;
  - bigger cats and jokers aren't hurt: they get a push straight away from it (320 units/s, a gentle shove).
- **Stage clear and Lucky Save:** a hanabi in the jar vanishes with the pops, paying nothing; a Lucky Save takes it when it is over the line.
- The magnet can take it (§15.2).

### 15.7 Joker cat

> The owner's pick (2026-10-10), built in v0.28 with the rules proposed in chat. Its look is the owner's art since v0.30 (§13.1): a maneki-neko with pastel rainbow stripes, a wink and a jester hat.

A wild cat that merges with any cat.

- **Size 2** (radius 49), never golden.
- **Merging:** it merges with the first cat it touches, whatever its tier. The cat becomes **one tier bigger where it is** (it grows from its own size, as in §5) and the joker vanishes. A golden cat goes two tiers up (§15.4). Two jokers, a joker and a hanabi, or a joker and a boulder never merge.
  - When it touches two cats at once, the oldest cat goes first, as for every merge (§5).
  - **Size 8 + joker makes the stage's last cat** and clears the stage (§7). The last cat itself doesn't merge with a joker.
- **Payout:** like a merge of the cat's tier (score, coins, combo), with the golden merge's bell.
- **Boulders:** a joker's merge hits the boulders near it like any merge (§15.3). A joker that touches a boulder hits it once too (once per boulder for the joker's life), and stays.
- **Stage clear and Lucky Save:** a joker in the jar vanishes with the pops, paying nothing; a Lucky Save takes it when it is over the line.
- The magnet can take it (§15.2).

### 15.8 Wind

> The owner's pick (2026-10-11), built in v0.34 (docs/plans/batch-18.md).

The wind pushes falling balls sideways.

- **Its card** (v0.50, §15.5): as stage 7 opens, once per profile, before the Wind trial can first be offered at stage 7's clear: the Wind clip blowing the run's way and "A trial can bring wind: it blows falling cats sideways. Aim against it."

- **Direction:** each run blows either to the right or to the left, picked at random when the run starts (the run's seed, on its own roll), whether or not Wind is ever taken. The card says which ("The wind blows falling cats to the right"), and its picture (a carp streamer) faces that way.
- **Force:** with Wind at level L, every ball that leaves the paw (§15.1) is pushed sideways at 135 × L world units per second² (100 × L until v0.41, which raised it with the gravity, so the drift stays the same on a shorter fall), from the drop until it first touches a ball or the floor. A ball that has touched one never feels it, so it never moves the pile. Measured headless (the jar is 600 wide), a size-1 cat dropped straight down drifts:

  | Level | Name   | Empty jar (fall 0.88 s) | Half-full jar (pile top 340–420) |
  | ----: | ------ | ----------------------: | -------------------------------: |
  |     1 | Breeze |                      45 |                               28 |
  |     2 | Gusty  |                      90 |                               55 |
  |     3 | Strong |                     135 |                               85 |
  |     4 | Gale   |                     180 |                              117 |
  |     5 | Storm  |                     225 |                              141 |

  (½·a·t² would be 53 per level on the full fall; air friction takes the rest. The half-full column was measured with v0.40's gravity and wind, which tilt a fall the same way.) A cat landing on the empty floor keeps the sideways speed the wind gave it and rolls on (no rug, §6).

- **With Heavy Drop** the wind tilts the whole fall: Heavy Drop's extra gravity gets the same sideways share as the base gravity, and a heavy ball shoots out of the paw already slanted the wind's way (its start speed times the wind's push over gravity), so it comes down the very line a plain cat would, only faster. It drifts as far as in the table at every Heavy Drop level, on a full fall or a short one (12 to 61 units over 300 units of fall, as a plain cat), and at Storm with Heavy Drop 5 it lands moving 1039 units per second sideways (a plain cat 464; v0.40: 1014 and 386). (v0.34, the owner's call after playing it: at first the wind only pushed, so a faster fall gave it less time and a level-5 heavy ball drifted 3 to 14 units: the wind didn't show.)
- The wind can push a ball against a wall: it slides down the wall, still falling. A wall doesn't end the wind or Heavy Drop, and the wind doesn't press a ball into a wall it touches, so it slides freely and lands as soon as in the open. (v0.34, the owner found it: a heavy ball dropped against the wall the wind blows toward counted the wall as its first contact and lost its speed at once, falling 9% slower at level 1 and 71% at level 5.) The aim guide stays a straight line under the paw: it shows where the ball leaves the paw, not where it lands. The speed limit stays.
- **Look:** sakura petals (the garden's petal shape) and thin ink streaks drift across the top half of the screen the wind's way, more and faster with its level (4 + 3 × L petals and L streaks, crossing in 4.6 − 0.56 × L s). With reduced motion: four slow petals and no streaks. Nothing at level 0.

### 15.9 Heavy Drop

> The owner's pick (2026-10-11), built in v0.34 as a trial of five levels. **A rule since v0.40** (the owner's call, §15.11): it is offered where the jar grows, and taking it drops every ball at the old trial's last level (strength 5 below: shot out of the paw, a 0.24 s fall, the big fireball and the knock) for the rest of the run. Its card reads "New rule" and "Fall time: 0.88 s → 0.24 s" (1.0 s → 0.24 s until v0.41); a hint shows as the next stage starts ("Heavy Drop: cats shoot down like fireballs"). A run saved with the trial at any level comes back with the rule. Levels 1–4 below are kept as strengths of the effect, used by nothing in play now.

Dropped balls fall faster and hit harder, and come down like a fireball.

- With Heavy Drop at strength L, every ball that leaves the paw (§15.1) shoots out of it with a downward speed and feels more gravity (537.5 u/s² more per level, a quarter of the gravity before v0.41) until it first touches a ball or the floor (sliding down a wall, it is still falling, §15.8). While it falls it may go faster than the speed limit (up to 4800 units per second); from its first contact the normal limit applies again, so it bounces off as before.
- Fall from the paw to the empty floor (size 1) and the speed it lands at, measured headless (v0.34, the owner's call after playing it: 17% faster than first built, with most of the speed from the paw so it shoots out instead of just falling faster; until then 0.8 to 0.3 s, leaving the paw at 104 to 2310 u/s). v0.41 re-solved the start speeds for its stronger base gravity, keeping the fall times (until then 814, 1232, 1842, 2521 and 3825, landing at 2000 to 4361 u/s):

  | Level | Fall time | Start speed | Extra gravity | Lands at |
  | ----: | --------: | ----------: | ------------: | -------: |
  |     0 |    0.88 s |           0 |             0 | 1980 u/s |
  |     1 |    0.66 s |         546 |      538 u/s² | 2223 u/s |
  |     2 |    0.53 s |        1020 |     1075 u/s² | 2517 u/s |
  |     3 |    0.41 s |        1679 |     1613 u/s² | 2928 u/s |
  |     4 |    0.33 s |        2391 |     2150 u/s² | 3436 u/s |
  |     5 |    0.24 s |        3732 |     2688 u/s² | 4438 u/s |

  The card shows the fall time (0.88 s → 0.24 s since v0.41, 1.0 s → 0.24 s in v0.40; the trial's card went 1.0 s → 0.66 s → …). The wind tilts a heavy fall as much as a plain one (§15.8).

- **It knocks cats aside** (v0.34, the owner's call): a straight hit from above would only press the cat into the pile (measured: a dead-centre hit didn't move it at all, at any level, while a hit 25 units off-centre pushed it 100–240 units). So the ball a heavy ball lands on from above is knocked sideways, away from it, at 18% of the landing speed times how squarely from above it was hit (the square of the contact's downward share; a dead-centre hit picks a side), and the heavy ball rolls off the other way at half that. Measured: a dead-centre hit on a lone size 3 now moves it 110 units at level 1 and about 240 at level 5; in a row, its neighbours 60–120.
- **Safe:** a heavy ball never passes through a cat, the floor or a wall, and never sinks deeper than half a size-1 radius into anything (TECH_SPEC §5). In a jar full to the rim, 100 drops at level 5 leave every cat in the jar; a cat it knocks aside may squeeze one a little over the rim (up to about 240 units per second, at most 14 units high, in 3 of 6 seeds; never at levels 1 and 3), and the heavy cat itself may bounce back over the rim of such a jar, up to about 320 units per second. With the wind at Storm the fireball comes in slanted and pushes harder: up to about 470 units per second and 55 units over the rim (in 5 of 6 seeds), still with no cat leaving the jar; the cat it meets may also move into it in the same step, so a contact can start up to 1.4 units deeper than the guard's half radius.
- **Look** (visual only): levels 1–2, thin speed lines behind the falling ball; levels 3–4, the owner's small flame (docs/ART_ASSETS.md §4.12): its round head under the ball and its flames trailing back along the ball's path, flickering, with embers; level 5, the big fireball, its head a little wider than the ball so a ring of fire wraps it, and on landing a burst of fire sparks, a short heavy thud and a small shake (no shake with reduced motion). Without the art (`?skin=placeholder`, or the art failing to load) the speed lines stay at every level.

### 15.10 Porcelain

> The owner's pick (2026-10-11), built in v0.34: the neighbour-crack version, in the porcelain look with gold kintsugi seams.

A merge can crack the cats beside it; a cracked cat that cracks again breaks.

- **Its card** (v0.50, §15.5): as stage 9 opens, once per profile, before the Porcelain trial can first be offered at stage 9's clear: the Porcelain clip and "A trial can make cats porcelain: merges crack the cats beside them; cracked twice, a cat breaks in two."

- **Cracking:** every merge, of any kind (a pair, a Hubris three, a joker's merge, a Jackpot), reaches every cat whose edge is within 15 world units of one of the merging balls' edges (as for boulders, §15.3), except cats of the merging cats' size (so a chain of merges isn't spoiled), the stage's last size, the new cat, and any cat that merges in the same step. Each cat it reaches cracks with 10% per Porcelain level (v0.34, the owner's call after playing it: first 20%; a test bot playing stage 1 at level 1 lost 26 of 90 runs, against 13 without Porcelain, with 7.4 breaks per run; at 10% with the shard-mate change below it loses 20, with 2.4 breaks), rolled on its own generator in a fixed order (cats oldest first, then the merges). One merge cracks a cat at most once; two merges in one step may crack it twice. Boulders, hanabi and jokers never crack; golden cats can. A hanabi's pops and a Lucky Save's pops aren't merges and crack nothing.
- **Breaking:** an intact cat that cracks becomes cracked. A cracked cat that cracks again **breaks**: it vanishes, and two cats one size smaller take its place, side by side across its centre (kept inside the walls), each growing in from a quarter of its radius over 0.12 s like a merged cat, so they push their neighbours aside without launching them. The two pieces are **shard mates**: they are born touching and don't merge with each other (that would just mend the cat) until they have come apart: once both have grown in and more than 10 world units lie between their edges, they are two ordinary cats and merge when they meet again (v0.34, the owner's call: at first they never merged). They are ordinary cats 1 s after the break in any case, so two pieces wedged together in a pile merge then (v0.35.2, the owner's call: such pieces never merged; the balance bot found 13–18% of breaks stuck together longer than 3 s). That mends the cat, so Porcelain clogs the jar less: the bot clears 8 stage-1 runs of 30 at level 2 and 12 at level 4 (before: 9 and 4; without Porcelain 11). Meanwhile each merges with any other cat of its size, and under Hubris they can't be in one three. They are neither cracked nor golden, and count as landed. A cracked size 1 that breaks just shatters.
- A cracked cat that merges makes a new, whole cat: that is the player's answer. Gold seams flash on the new cat (kintsugi).
- Cracking and breaking pay nothing, score nothing and don't count for the combo.
- **Look:** a cracked cat shows crack lines over it (the owner's art, docs/ART_ASSETS.md §4.12: one of two patterns, chosen and turned by the cat's id, covering 90% of its radius and rolling with it; with `?skin=placeholder` or without the art, a dashed dark ring inside its outline). A crack throws white chips with a "tink"; a break pops the cat with a porcelain shatter and chips; a cracked cat's merge flashes the matching gold seam on the new cat, fading in about 0.6 s (without the art, a gold ring).

### 15.11 Rules

> The owner's idea (2026-10-11), built in v0.34: picks that change how merging works, offered where the jar grows (§15.5). Hubris and Echo (v0.34), Copycat and Dice (Batch 19, §15.13–§15.14) and, since v0.40, Heavy Drop (§15.9), which was a trial until then.

**Their cards** (v0.50, §15.5): the first time a profile takes a rule, a card shows as the next stage opens, with the rule's name, its clip and its line from the table in §15.5 (the card's effect line). A rule the profile has been shown before shows no card, only its hint pill where it has one.

**Hubris:** three cats of one size from 1 to 5 that touch in a chain (A touches B and B touches C; A and C needn't touch) merge at once into one cat **two sizes** bigger at their centroid (three 3s make a 5); with a golden cat among them, three sizes, never above the stage's last size. Two such cats **wait**: they merge as a pair (one size up) only after touching for 0.5 s, so a third that comes in time makes a three. (v0.34, the owner's call after playing it: at first two small cats never merged at all, which filled the jar with cats waiting for a third: a test bot cleared no stage 1 in 30 runs and lost 17, against 5 and 3 without Hubris; with the wait it clears 3 and loses 8, and about one small merge in seven is a three.) Two resting cats' contact flickers from step to step, so a pair counts as touching until 0.1 s after it was last seen.

- Sizes 6–8 merge in pairs as before, and two 8s still make the stage's last cat. A joker still merges with one cat of any size and makes it one size bigger at once.
- Order: every ball is gone through oldest first; each one still free takes the oldest merge it can make (by the sorted ids of its cats): a pair of bigger cats, a joker's merge or a three; failing those, a small pair that has waited 0.5 s. A cat takes part in at most one merge per step, so four or five connected cats make one three now and the rest wait (six can make two).
- A three is one merge: it hits each boulder in reach once, cracks its neighbours once (Porcelain), counts once for the combo, and pays like a merge of its size **plus half** (a starting value; the economy comes later). It starts at the biggest one's radius and grows into its own, turning the way its two oldest cats slid past each other.
- When Hubris is chosen, a hint shows as the next stage starts: "Hubris: three small cats merge at once and skip a size".

**Echo:** when cats of sizes 5–7 merge (two, or three under Hubris; a golden merge too), a cat of **their** size appears beside the new cat: two 5s make a 6 and a 5; three 5s under Hubris make a 7 and a 5. Only the first such merge after each drop echoes, so an echo can never set off a chain.

- (v0.34, the owner's call after playing it: sizes 4–7 and every merge set off chains that ended a run within about 40 s, won or lost; a test bot cleared 10 of 30 and lost 16, against 5 and 3 without Echo. A 50% chance still chained, up to 6 echoes on one drop, and lost 14. Now it clears 5 and loses 11, about one echo in 14 drops.)
- Never for the stage's last cat (two 8s, or two golden 7s), never for a joker's merge, never for sizes 1–4.
- **Where:** level with the new cat, on a side picked at random (the run's seed, on its own roll), just touching it once both have grown; on the other side if that one would put it through a wall; straight above the new cat if neither fits. It grows in from a quarter of its radius over 0.12 s (no launches), counts as landed, isn't golden or cracked, and may merge on the next step like any cat.
- It pays nothing and isn't a merge (no boulder hit, no crack, no combo).
- **Look:** it fades in from pale with three expanding ripple rings, and a soft bell echo.

### 15.12 Cursed Bell

> The owner's idea (2026-10-11), built in Batch 19 (docs/plans/batch-19.md). Its numbers are starting values.

A trial: now and then a cat is cursed; merge it in time, or it turns to stone. Taking Cursed Bell unlocks two follow-up trials (§15.5): **Quick Curse** (fewer drops before the stone) and **More Curses** (curses come more often).

- **Its card** (v0.50, §15.5): as stage 4 opens, once per profile, before Cursed Bell can first be offered at stage 4's clear: the Cursed Bell clip and "A trial can curse a cat: merge it before its bell runs out, or it turns to stone."

- **When a curse comes.** With Cursed Bell taken, the run counts the stage's drops (every ball that leaves the paw, a magnet's catch dropped again too). The first curse comes due after the stage's 15th drop; the next comes due 30 drops after the last one began (25, 20 and 15 with More Curses 1–3). Curses begin only right after a drop, one at a time: one that comes due while another is on waits until that one ends. The count starts again at every stage.
- **Which cat.** At random (the run's seed, on its own roll), one cat that has landed, isn't growing, is of sizes 1–6 and isn't over the line (§6); golden and cracked cats too. When none fits, it tries again after the next drop.
- **The bell** starts at 10 drops (8, 7 and 6 with Quick Curse 1–3), and every drop after the curse began takes one off. When the player drops while it already shows 0, the cat turns to stone just before that ball leaves the paw, so the drop that brings it to 0 can still make the merge. (Drops, not seconds, so it never rushes the player: time stops in the picks and the pause anyway.)
- **Ways it ends:**
  - **Merged** (a pair, a Hubris three, a joker's merge, a Dice roll of any outcome): the curse is lifted, and the merge pays its coins twice (the bonus equals its own coins; the score isn't doubled), with the golden merge's sparkle and chime.
  - **Magnet:** taking the cursed cat lifts the curse with no bonus; it goes into the paw as a normal cat. The magnet is a counter to it.
  - **Gone otherwise** (a hanabi, a Lucky Save, a Porcelain break, a stage clear): the curse just ends. The merged cat, an echo and a broken cat's pieces are never cursed.
  - **Stone:** the cat is replaced where it is, with its speed, spin and angle, by a bare boulder of its own size that one merge breaks, whatever Iron Bands and Big Boulders say, so the curse doesn't stack with the boulder trials. From then on it is an ordinary boulder (§15.3): merges beside it break it, it crumbles at a clear, a magnet can take it, and it pays nothing.
- The run in progress keeps the curse (§11): the cursed cat, its bell, and the drop the next one is due at.
- **Look:** the cursed cat turns to stone bit by bit, like a cracked cat shows its cracks (§15.10): one of the owner's stone patterns (docs/ART_ASSETS.md §4.13) lies over the cat on 0.9 of its radius and rolls with it, a few stone patches for the first half of its count (10 drops: 10 to 6) and mostly stone for the rest (5 to 0) (v0.35.3, the owner's call: the sheet's first two patterns). There is no number. Without the art (`?skin=placeholder` or `vector`) the drops left show as live text (Fredoka) just above the cat instead, swaying from 2 drops left (not with reduced motion). (v0.35.0 hung a cursed iron bell over the cat with the count on its tag and a ring of ghostly flames round it; the owner found it a poor design.) Turning to stone, the cat fades out as its boulder fades in (0.3 s) in a shower of stone chips, with a low grind. A curse beginning rings a dull iron bell. The first curse of a profile shows a hint: "Cursed! Merge this cat before it turns to stone".
- **Measured** (the balance bot, 30 seeds of stage 1, TECH_SPEC §11): it cleared 10 runs and lost 20, against 11 and 19 without it, with 5 curses a run (2.7 lifted, 2.2 turned to stone); with Quick Curse and More Curses both at their top it cleared 7 and lost 23, with 11 curses and 6 stones a run. Runs don't end sooner (median 70 s and 78 s, against 67 s).

### 15.13 Copycat

> The owner's idea (2026-10-11), built in Batch 19.

A rule: **the next cat copies the size of your last merge.** While it is on, every merge turns the cat in NEXT to the size that met (a pair's or a three's; for a joker's merge its cat's size; for a Dice fizzle the size that met too), at most **size 4**, the biggest drop. Only the cat waiting in NEXT changes: it follows every merge until it moves into the paw, where it is fixed, and the cats after it roll as usual until the next merge.

- The run's first two cats stay the smallest. Magnets, boulders, hanabi and jokers in NEXT never change; a golden cat stays golden at its new size. Every queued cat still rolls its tier (§15.1), so a seed's later rolls don't move, and Big Drops still shapes every roll, so it stays offered.
- **Tuning** (the balance bot, 30 seeds of stage 1): it cleared 6 runs and lost 24, median 49 s, against 11, 19 and 67 s without it, and 45–51 s with Hubris or Echo: big copied cats fill the jar sooner. At size 3: 10 cleared, 63 s. (v0.35.0 also turned every later cat to the latest merge's size until the next merge, so the paw kept handing out one size; the owner found it far too easy, and the bot cleared 29 of 30 runs; it copied up to size 3 there.)
- **Look:** no new art: NEXT's cat pops into its new size like a merged cat. When it is chosen, a hint shows as the next stage starts: "Copycat: the next cat copies your last merge".

### 15.14 Dice

> The owner's idea (2026-10-11), built in Batch 19.

A rule: **every merge rolls a die.** Every merge of two cats, or three under Hubris, rolls before its new cat is made (the run's seed, on its own roll, in the order the merges resolve):

- **Lucky** (1 in 6): the new cat is one size bigger than it would have been (a pair makes two sizes up, a Hubris three three, a golden pair three), never above the stage's last size.
- **Fizzle** (1 in 6): the cats become **one** cat of their own size at their midpoint (two 4s make one 4; a three makes one too), already grown.
- Otherwise the merge is normal.
- No roll for a joker's merge, nor for the merge that would make the stage's last cat (two 8s, two golden 7s). A lucky roll may make the last cat (two 7s), like two golden 7s already can.
- A fizzle counts as a merge in every way: it pays like a merge of its size (a three half as much again), counts for the combo, hits boulders, cracks its neighbours (Porcelain), lifts a curse and sets Copycat's size. It never echoes.
- **Look:** the owner's dice (docs/ART_ASSETS.md §4.13): over a lucky merge the gold die, over a fizzle the cracked grey one, 80 world units tall, pops up just above the new cat, rises a little and fades (0.6 s), with the golden merge's chime for a lucky roll and a clack like a die on wood for a fizzle; with reduced motion the die fades in and out without popping or rising. Normal merges show nothing, and nor does a skin without the art.
- **Measured** (the balance bot): it cleared 11 runs and lost 19, like stage 1 without it, but runs are shorter (median 50 s against 67 s), as with Hubris (51 s) and Echo (45 s); about 15 lucky rolls and 16 fizzles a run.

### 15.15 Lightning

> The owner's idea (2026-10-13), built in v0.42 (Batch 23, docs/plans/batch-23.md). Its look is the owner's art (docs/ART_ASSETS.md §4.16, since v0.42.1); with `?skin=vector` or `placeholder` the game draws plain stand-ins.

A blessing: a lightning ball that clears a whole size of cat, or every boulder.

- **Size 2** (radius 49), never golden. It never merges and counts for the danger line like a cat (§6). The blessing adds 1.5% per level (up to 7.5%), rarer than a hanabi or a joker (2.25%): the player aims it, so a level of it helps about as much as a level of Hanabi (measured below). None comes in a stage's first 20 drops, and a queued one becomes a cat at a stage clear (§15.1).
- **The strike.** The first time it touches a cat or a boulder, it strikes (a wall, the floor, a hanabi, a joker or another lightning ball don't count):
  - a cat: that cat and **every cat of its tier** in the jar, golden ones and a falling one too;
  - a boulder: **every boulder** in the jar, whatever its size and bands.
  - Touching several balls in one step, the oldest decides; of several lightning balls touching something, the oldest strikes and the others wait for the next step.
- **Time stands still for 0.45 s** while the lightning chains through them: physics, the drop cooldown, the combo window and the danger timer stop (a ball already in the paw stays there, and can't be dropped meanwhile). Then every struck cat **pops into its value** (§5: coins, no score, no combo), every struck boulder breaks (paying nothing), and the lightning ball is gone. A pause freezes the strike; a run saved during one comes back to it (§11).
- **Waiting.** On the floor, or resting on a hanabi or a joker, with nothing to strike, it waits: the first cat or boulder that touches it later is struck (a cat dropped onto it, say). The magnet can take it (§15.2).
- A struck cursed cat's curse just ends (§15.12). Its pops aren't merges: no boulder hits, cracks (Porcelain), echoes or Copycat.
- **Stage clear and Lucky Save:** a lightning ball in the jar vanishes with the pops, paying nothing; a Lucky Save takes it when it is over the line.
- **Look** (§12): a bolt comes down from the sky onto the lightning ball, and bolts chain from it to the struck balls, each link to the nearest ball not yet reached (edge to edge, so they branch), one link 35 ms after the one before it, every link swapping between shapes as it flickers; where a link lands a flash and a ring go off and crackles cover the ball. When they pop, all at once, yellow sparks fly with each "+coins". A waiting lightning ball gives off a small arc now and then. The bolts, the sky bolt, the flash, the ring, the crackles (a glowing sphere of arcs on the cat) and the arcs are the owner's sheets of light (a chain link swaps among the six bolts, mirrored at random; v0.42.1), and the struck balls pop in the art's burst of sparks too. With reduced motion nothing flickers. The effects are light (SCREEN blending: Phaser's ADD punches squares into anything see-through on the transparent canvas). v0.42.0–v0.42.1 also darkened the whole screen to a stormy indigo during the strike, and v0.42.0–v0.42.2 flashed it white as the strike began; v0.42.2 and v0.42.3 took them out (the owner's call).
- **Shop card** (§10): it opens at stage 8, for 15K, 25K, 40K, 60K and 85K: later than the other blessings, so the early game stays as it is (the owner's call).
- **Measured** (the smart bot, 30 seeds of three stages from a fresh profile, 15 minutes at most; cleared / lost): no blessing 5 / 25; Lightning 1: 10 / 20, Lightning 3: 17 / 13, Lightning 5: 22 / 7; Hanabi 1: 8 / 22, Hanabi 5: 23 / 7 (Joker Cat 5: 29 / 1). The bot aims a lightning ball at the boulders, else at the small size (1–4) that clutters the jar most; aimed at any size up to 6 it lost only 1 run in 30 at level 5 but timed out in 16 (it kept popping the cats it needed). The meta bot (12 better players, 150 minutes) first clears stage 8 after a median 68 minutes.

### 15.16 Katana

> The owner's design (2026-10-16, docs/plans/weapons-and-passives.md §3.1), built in v0.55: the first weapon of the weapons-and-passives direction. Its look is the owner's art (docs/ART_ASSETS.md §4.21); with `?skin=vector` or `placeholder` the game draws plain stand-ins. Its chances and widths are starting values.

A weapon that cuts every small cat in a straight line.

- **Picks:** taking **Katana** once (a blessing pick) opens it: katanas start to come, 2.25% per queued item. Its upgrades are blessing picks of their own that need it (like Quick Curse needs Cursed Bell), so one pick can show two of them side by side: **Quick Katana** (+2.25% per level, 2 levels, up to 6.75%), **Wide Blade** (a wider cut, 2 levels: Thin, Wide, Broad) and **More Blades** (one more blade per level, 3 levels). Each needs a level of the Katana's shop card (§10): until a profile buys one, no run offers it. On the pick cards the Katana shows the katana's ball (v0.55.3, the owner's call) and each of its upgrades the ball with one small addition, like the boulder and curse families (v0.55.4: Quick Katana's hourglass; More Blades and Wide Blade keep their icons until their pictures come).
- **The drop:** none comes in a stage's first 20 drops, and a queued one becomes a cat at a stage clear (§15.1). In the paw and in NEXT it is a **ball** of size 2, like the other special balls (v0.55.1, the owner's call; v0.55.0 hung the sword itself in the paw, and NEXT showed it lying across the bubble), and the aim guide under it is its cut, a dotted line straight down to the floor. Dropped, the sword shoots out of the ball and falls point down, fast and dead straight, through everything, in **0.24 s** from the paw to the floor (Heavy Drop's fall; 29 ticks). The wind and Heavy Drop don't touch it: a straight line is what it is. It isn't a ball: it never pushes, rests or counts for the danger line, and the magnet can't take it. The drop cooldown follows as for any ball.
- **The cut:** each ball is cut as the point reaches it: a ball is cut once the line from where its blade started to where its point is now comes within its radius plus the **grace** of its centre (8 world units; Wide Blade 33 and 58). So the cats are cut from the top down, and one that rolls into the line before the point passes is cut too.
  - every cat of **sizes 1–4** pops into its value (§5: coins, no score, no combo), golden ones at their plain value; a cursed one is cut like any other and its curse just ends with it;
  - every **boulder** breaks at once, whatever its size and bands (the owner's call), paying nothing;
  - bigger cats, hanabi (not lit, the owner's call), jokers and lightning balls let the blade through untouched.
- **More Blades:** each level adds one more katana falling at the same time: 1, a diagonal from the jar's top corner on the aim's side (the right from the middle on) to the opposite bottom corner; 2, the other diagonal, so the two cross in an X (the owner's example); 3, one straight across the middle of the jar from the aim's side, ✳. The first blade that reaches a ball cuts it.
- **Stage clear and pauses:** a falling katana goes with a stage clear's pops; a pause freezes it, and a run saved during its fall comes back to it (§11: `katana: { x, blades, elapsedSteps }`).
- **Look** (§12): the ball is the owner's image (v0.55.2, docs/ART_ASSETS.md §4.21, image 7): crimson lacquer with gold waves and the katana across it; with `?skin=vector` a cream ball with a sword across it. As it leaves the paw a swoosh flashes there with a steel "shing"; the sword shoots out of the ball and down with a streak of light behind it from where it started to its point and a glint on its point, More Blades' swords coming in along their own lines. Every ball it cuts splits in two along the cut: the two halves of the ball's own picture slide apart, turn and fade (the picture turns to the nearest angle at which the cut lies along or across it, at most 45°, under the flash), under a cut flash, with steel-blue sparks, a short slice, and its "+coins". The points strike the floor (or a wall, the blade across) with a burst of sparks and a soft flash and a small jolt, stick there for 0.42 s and fade with their streaks. The light is drawn with SCREEN, like Lightning's.
- **Measured** (v0.55, the smart bot, 30 seeds of three stages from a fresh profile, 15 minutes at most; it aims a katana down the line that reaches the most small cats and boulders): the Katana alone is about as strong as one level of Hanabi or Lightning, and with all eight levels of its picks about as strong as Hanabi or Lightning at their top, so a weapon with more picks isn't a stronger one (the owner's aim).

  | Picks (the rest at 0)                               | Cleared |    Lost |  Median run |
  | --------------------------------------------------- | ------: | ------: | ----------: |
  | none                                                |      13 |      17 |       266 s |
  | Katana                                              |      11 |      19 |       290 s |
  | Katana, Quick Katana 2                              |      23 |       7 |       341 s |
  | Katana, Wide Blade 2                                |      16 |      14 |       303 s |
  | Katana, More Blades 3                               |      16 |      14 |       315 s |
  | Katana, Quick Katana 2, Wide Blade 2, More Blades 3 |      25 |       5 |       360 s |
  | Lightning 1 / Hanabi 1                              |  15 / 9 | 15 / 21 | 312 / 287 s |
  | Lightning 5 / Hanabi 5                              | 26 / 23 |   4 / 7 | 499 / 384 s |

  Thirty seeds swing a few runs either way (the Katana alone and no picks are within that).

### 15.17 Notes for building it

- The rules (kinds, chances, hits, golden merges, the picks and their levels) live in the headless layers with unit tests. `game/` and `ui/` only draw and send intents (select, Take, the card pick). Every number goes in `src/config/`.
- Debug panel (`?debug=1`): set trial, rule and blessing levels, put a magnet, a boulder, a hanabi, a joker, a lightning ball, a katana or a golden cat in the paw, open the stage-clear picks (or a rule pick), flip the wind, drop a cracked cat and crack the newest cat, curse the newest cat and set its bell, force the next die. `window.__game` gets matching hooks for Playwright.
- The visuals are code-drawn first; the owner's raster art follows through docs/ART_ASSETS.md. Since Batch 19, new looks come from the owner's art only: the code moves, scales, turns and fades it, writes numbers as live text and reuses the existing effects.
- Procedural sounds (§12): the magnet's take, a boulder hit (clang), a boulder break (crunch), the golden two-tier merge (also a joker's merge, a Hubris three, a lifted curse and a lucky die), the hanabi's boom, Heavy Drop's thud, a crack's tink, a break's shatter, an echo's bell, a curse's dull bell, a stone's grind, a fizzle's clack, Lightning's thunder, and the Katana's shing and slice.
- The balance bot (`npm run sim`, TECH_SPEC §11) measures a new pick against the game without it before it ships.

## 16. Not in v1 (ideas for later)

- Daily seeded challenge, achievements, skins, leaderboards
- Cloud save, localization
