# Prompts

Copy-paste prompts for building Maneki Merge with Claude Code (Opus 5.5).
Claude Code: these are for the owner to paste. Don't act on this file unless one of its prompts is pasted.

## How to run a milestone

1. Open a **new session** in the project folder. One milestone per session keeps the context clean; `CLAUDE.md` and `docs/` carry the context between sessions.
2. Choose the model **Opus 5.5** and set the **effort** from the table below.
3. For milestones marked plan mode, switch to plan mode before sending. Review the proposed design and approve it.
4. Paste the prompt. Approve tool permissions when asked (npm, git, gh, Playwright).
5. When Claude Code reports back, test on your phone using ROADMAP → Phone test checklist.

| Prompt                          | Effort                      | Plan mode |
| ------------------------------- | --------------------------- | --------- |
| M1                              | medium                      | –         |
| M2                              | high                        | –         |
| M3                              | high                        | –         |
| M4                              | xhigh                       | yes       |
| M5                              | high                        | –         |
| M6                              | xhigh                       | yes       |
| M7                              | high                        | –         |
| M8                              | high                        | –         |
| M9                              | medium                      | –         |
| M10                             | xhigh                       | yes       |
| M11                             | high                        | –         |
| M13                             | high                        | yes       |
| M14                             | medium (with the APK: high) | –         |
| Bug report                      | high (trivial bugs: medium) | –         |
| Playtest feedback               | medium                      | –         |
| Small text or number change     | low                         | –         |
| CI failed                       | medium                      | –         |
| Stuck after two attempts        | xhigh, then max             | yes       |
| Resume an interrupted milestone | same as the milestone       | –         |

Keep **max** for problems that xhigh couldn't solve. It's the slowest and most expensive level.

---

### M1: Repository, toolchain and CI/CD

```text
This folder already contains the project plan: CLAUDE.md and docs/ (GAME_DESIGN.md, TECH_SPEC.md, ROADMAP.md, PROMPTS.md). Read all of them first.

Implement milestone M1 from docs/ROADMAP.md.
Specific to this milestone:
- Initialize git here with `main` as the default branch. Because the GitHub repo doesn't exist yet, commit directly to main this time (no PR). Include the existing plan files in the initial commit.
- Create the GitHub repository with the GitHub CLI: public, name `maneki-merge`, description "Lucky-cat merge game with a growing jar. Offline PWA for iOS and Android." Then push.
- Enable GitHub Pages with GitHub Actions as the source (via `gh api`), let the deploy workflow run, and confirm that https://sekerderya.github.io/maneki-merge/ serves the app (check with curl and in the browser).
- Use the latest stable versions of all packages (Phaser 4.x, matter-js, Vite, TypeScript, Vitest, Playwright, ESLint flat config).
Then do steps 5, 6 and 8 of the Milestone workflow in CLAUDE.md, and tag the result v0.1.0.
```

### M2: Mobile PWA shell

```text
Implement milestone M2 from docs/ROADMAP.md. First read CLAUDE.md, the M2 section, and TECH_SPEC §7, §9 and §10.
Be careful with iOS home-screen behavior (safe areas, status bar, standalone detection, no rubber-banding or zoom) and with the update policy (never reload during a run).
Verify offline behavior with the Playwright offline test and with a local production build.
Follow the Milestone workflow in CLAUDE.md. In your final report, include step-by-step instructions (in Turkish) for installing the app on iPhone and Android.
```

### M3: Core rules, config and save system

```text
Implement milestone M3 from docs/ROADMAP.md. First read CLAUDE.md, GAME_DESIGN §4–§11, and TECH_SPEC §3 and §8.
Encode the formulas from GAME_DESIGN and write tests that assert its tables exactly. Keep the headless layers free of Phaser/DOM imports and enforce that with ESLint.
Follow the Milestone workflow in CLAUDE.md.
```

### M4: Physics and merge engine (plan mode)

```text
Implement milestone M4 from docs/ROADMAP.md. First read CLAUDE.md, GAME_DESIGN §5–§8, and TECH_SPEC §3–§5 and §11.
Before writing code, propose your design and wait for my approval: module APIs, merge resolution order, the growth and anti-launch approach, the expansion timeline in RunController, the determinism strategy, and the test plan.
This is the foundation of the game feel. Favor robustness over cleverness, keep everything deterministic for a given seed and input sequence, and prove it with headless tests, including the stress test in TECH_SPEC §5. Record the final physics constants, and why you chose them, in TECH_SPEC §5.
Follow the Milestone workflow in CLAUDE.md.
```

### M5: Playable game scene

```text
Implement milestone M5 from docs/ROADMAP.md. First read CLAUDE.md, GAME_DESIGN §2–§6 and §13.1, TECH_SPEC §3–§7, §11 and §15, and the relevant Phaser 4 skills in node_modules/phaser/skills/.
Only stage 1 has to look right for now (expansion comes in M6), but don't hard-code stage 1 anywhere.
In the browser at 390x844 and 375x667, play at least one full run until game over. Check that the numbers on the cats are sharp, the aim line matches where cats land, and the console is clean. Put screenshots in the PR.
Follow the Milestone workflow in CLAUDE.md.
```

### M6: Expansion system (plan mode)

```text
Implement milestone M6 from docs/ROADMAP.md, the game's signature feature. First read CLAUDE.md, GAME_DESIGN §7–§8, TECH_SPEC §4–§6, and the Phaser 4 cameras and tweens skills.
Before writing code, propose the design of the expansion sequence and wait for my approval: the states and what is paused when, how camera zoom/scroll, the wall slide and the rim rise stay in sync, how cash-out works, and how a resize or backgrounding during the sequence is handled.
Quality bar: a smooth 60 fps zoom-out, nothing escaping or jumping, sharp visuals at stage 5, repeated expansions up to stage 5 (verify every stage with the debug tools), and a working locked-stage case.
Follow the Milestone workflow in CLAUDE.md.
```

### M7: Economy and persistence in play

```text
Implement milestone M7 from docs/ROADMAP.md. First read CLAUDE.md, GAME_DESIGN §5, §6, §9 and §11, and TECH_SPEC §8.
Coins must never be lost. Prove it by earning coins, reloading mid-run, and checking the wallet, and add an E2E test for it.
Follow the Milestone workflow in CLAUDE.md.
```

### M8: Main menu and upgrade shop

```text
Implement milestone M8 from docs/ROADMAP.md. First read CLAUDE.md, GAME_DESIGN §2 and §10, and TECH_SPEC §7.
Wire every upgrade effect into the game and prove that each one works: unit tests for the math, and E2E or debug-driven browser checks for the visible ones.
Check the layout at 375x667, 390x844 and 430x932 portrait, and put screenshots in the PR.
Follow the Milestone workflow in CLAUDE.md.
```

### M9: Audio, haptics and juice

```text
Implement milestone M9 from docs/ROADMAP.md. First read CLAUDE.md, GAME_DESIGN §12, and TECH_SPEC §10.
Keep all sound effects procedural (Web Audio, no audio files). Pool particles and throttle sounds so long chains stay smooth. Respect the sound and haptics settings and prefers-reduced-motion.
Follow the Milestone workflow in CLAUDE.md.
```

### M10: Balance simulation and tuning (plan mode)

```text
Implement milestone M10 from docs/ROADMAP.md. First read CLAUDE.md, all of GAME_DESIGN (especially §14), and TECH_SPEC §5.
Before writing code, propose the simulator design and wait for my approval: bot policies, metrics, the meta-progression model, and the runtime budget.
Then run the simulations, tune only values in src/config/, and repeat until the §14 targets are met or you can explain why a target is unrealistic. Record the method, the before/after numbers and the final values in docs/BALANCE.md, and update the GAME_DESIGN tables.
Follow the Milestone workflow in CLAUDE.md.
```

### M11: QA, performance and hardening

```text
Implement milestone M11 from docs/ROADMAP.md. First read CLAUDE.md and TECH_SPEC §10–§13.
Be skeptical and actively try to break the game: rapid taps, rotation, backgrounding in the middle of an expansion, offline use, storage errors, 20 runs in a row. Fix what you find. Measure performance with CPU throttling and put the before/after numbers in the PR.
Follow the Milestone workflow in CLAUDE.md.
```

### M13: Final art integration (plan mode)

```text
Implement milestone M13 from docs/ROADMAP.md. My designs are in art-source/: tier-01.png … tier-15.png [plus: list any extra files, e.g. app-icon.png, logo.png, background.png, music.ogg].
First read CLAUDE.md, GAME_DESIGN §13, and TECH_SPEC §6 and §14. Then inspect every image (size, transparency, padding around the round body, consistency), propose the pipeline, list any problems, and wait for my approval.
My notes on the art: [e.g. "hide the numbers", "cats should not rotate", "make the background color ..."].
Follow the Milestone workflow in CLAUDE.md, with screenshots of every tier at stage 1 and stage 5.
```

### M14: Release v1.0

```text
Implement milestone M14 from docs/ROADMAP.md. First read CLAUDE.md and the M14 section. [Also do the optional Android APK part.]
Go through the release QA checklist in the browser and with the E2E suite, and list anything I must check by hand on my phones.
Follow the Milestone workflow in CLAUDE.md, then tag v1.0.0 and create the GitHub Release.
```

---

## Utility prompts

### Bug report

```text
Bug: [what happened]
Device: [e.g. iPhone 13, iOS 26, home-screen app]. Version shown on the menu: [x.y.z (hash)]
Steps: 1) … 2) … 3) …
Expected: […]
Find the root cause instead of patching the symptom, add a regression test when possible, fix it, and follow the Milestone workflow in CLAUDE.md on a branch named fix-<short-name>.
```

### Playtest feedback

```text
Playtest feedback (version [x.y.z]):
- [e.g. Cats fall too slowly at stage 3]
- [e.g. The coin text is too small on my phone]
- [e.g. Big Catch feels useless]
For each point, propose a concrete change: which config value or UI element to change, and why. Apply the clear ones and list the ones that need my decision. Keep GAME_DESIGN.md in sync with any number you change, and follow the Milestone workflow in CLAUDE.md on a branch named tune-<short-name>.
```

### Small text or number change

```text
Change [exact text or number] to [new value]. Keep the docs in sync and follow the Milestone workflow in CLAUDE.md on a branch named tune-<short-name>.
```

### CI failed

```text
The GitHub Actions run for [PR / branch / main] failed. Read the failed job logs with gh, find the root cause, fix it, and get CI green again. Don't skip or weaken tests to make it pass.
```

### Stuck after two attempts (plan mode)

```text
Two attempts to fix [problem] have failed. Start fresh: read the relevant code and tests, list at least three hypotheses for the root cause, and check each one with evidence (logs, a failing test, a minimal headless reproduction) before changing any code. Then fix the confirmed cause and explain in the PR what was wrong. Follow the Milestone workflow in CLAUDE.md.
```

### Resume an interrupted milestone

```text
Continue milestone [MNN] from docs/ROADMAP.md. Check the current branch, `git status`, open PRs and the ROADMAP checkboxes to see what's already done, then finish the rest and follow the Milestone workflow in CLAUDE.md.
```
