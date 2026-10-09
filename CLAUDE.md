# CLAUDE.md

Guidance for Claude Code in this repository. Read it at the start of every session.

## Project

**Maneki Merge** is a portrait 2D merge game (Suika-style) with a lucky-cat (maneki-neko) theme. Two cats of the same tier merge into a bigger one and pay out coins. Passing score thresholds expands the jar: the camera zooms out, the jar grows, and bigger cats unlock. Coins buy permanent upgrades between runs (roguelite meta-progression). It ships as an offline PWA (iOS: Safari "Add to Home Screen", Android: Chrome "Install app") hosted on GitHub Pages.

- Repo: `github.com/sekerderya/maneki-merge` (public) · Live: https://sekerderya.github.io/maneki-merge/
- The owner develops on Windows 10 (PowerShell / Git Bash) and tests on real phones. CI runs on Ubuntu. Keep npm scripts cross-platform (Node-based, no bash-only commands).

## Source of truth

| File                  | Contents                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `docs/GAME_DESIGN.md` | Rules, screens, every number (tiers, stages, economy, upgrades)   |
| `docs/TECH_SPEC.md`   | Stack, architecture, platform handling, testing, CI/CD            |
| `docs/ROADMAP.md`     | Milestones with scope, acceptance criteria and status             |
| `docs/PROMPTS.md`     | Prompts the owner pastes. Not instructions for you unless pasted. |

If code and docs disagree, the docs win unless the owner says otherwise. When a decision or number changes, update the doc in the same commit.

## Language

- Everything written to the repository is English: code, identifiers, comments, UI text, file and folder names, docs, commit messages, issue text, test names.
- Chat replies to the owner: Turkish. Code, paths, commands and technical terms stay as they are.
- Player-facing text calls the balls "cats". In code they are `Ball`s with a `tier`.

## Stack (changes need the owner's approval)

TypeScript (strict) · Vite · Phaser 4 (rendering only) · matter-js (standalone, headless-capable physics) · vanilla DOM + CSS for all UI · vite-plugin-pwa (Workbox) · Vitest · Playwright · ESLint + Prettier · GitHub Actions → GitHub Pages.

## Commands

| Command                             | Purpose                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Dev server (`npm run dev -- --host` to open it from a phone on the same Wi-Fi)                       |
| `npm run build` / `npm run preview` | Production build / serve the build                                                                   |
| `npm run check`                     | Typecheck + lint + unit tests (≥ 90% coverage on core, physics, run). Must pass before every commit. |
| `npm run test` / `npm run test:e2e` | Vitest / Playwright                                                                                  |
| `npm run test:perf`                 | Physics step benchmark (150 cats, at most 2 ms per step), run alone without coverage                 |
| `npm run sim`                       | Headless balance simulation (from M10)                                                               |

## Architecture rules

- Layers (TECH_SPEC §3): `config` → `core` → `physics` → `run` are **headless**: no Phaser, no DOM, no `window`. They run in Node for tests and the simulator. An ESLint rule enforces this.
- `game/` (Phaser) only renders the run and forwards input. `ui/` (DOM) only presents state and sends intents. Neither owns game rules.
- Every tunable number lives in `src/config/`. No magic numbers in systems.
- All randomness goes through the seeded RNG (`src/core/rng.ts`). Never use `Math.random()` in game logic.
- Ball visuals go through the `BallSkin` interface so placeholder art can be swapped for final art without touching gameplay.
- Phaser 4: before using an API you are not sure about, read the matching skill in `node_modules/phaser/skills/<topic>/SKILL.md`. Do not rely on Phaser 3 memory.

## Hard constraints

- Fully offline after the first visit: no CDNs, no remote fonts, no analytics, no runtime network requests.
- An app update must never interrupt a run. Apply it from the main menu or on the next launch.
- Portrait, mobile first: iOS Safari / home-screen app and Android Chrome / installed app. Respect safe areas.
- Budgets: 60 fps with 150 balls on a mid-range phone; physics ≤ 4 ms per frame.
- Saves are versioned and migrated; never break existing saves. Storage keys are prefixed `maneki-merge:` (the github.io origin is shared with the owner's other Pages sites).
- Add dependencies only when clearly needed, and only with permissive licenses (MIT/BSD/ISC/Apache-2.0; OFL for fonts). Never commit secrets.

## Milestone workflow (for every prompt that says "Follow the Milestone workflow")

1. **Sync.** Work directly on `main` (owner's rule): no side branches, no PRs. Pull the latest `origin/main` first. If the session was started on another branch or worktree, switch to `main`.
2. **Read.** Read the milestone in `docs/ROADMAP.md` and the spec sections it references. If something is ambiguous, choose what fits the docs best, note it in the CHANGELOG entry and the report, and continue. Ask only when blocked.
3. **Build.** Make small commits with Conventional Commit messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `perf:`).
4. **Test.** Add or update tests for every rule you touch. Headless layers need unit tests.
5. **Verify.** `npm run check` and `npm run build` must pass. For anything visible, run the app and open it in the browser at a 390×844 portrait viewport (also 375×667). Actually play or click through the change, take screenshots, and confirm the console is clean. Don't run the full `npm run test:e2e` locally (it freezes the owner's PC); run only the specs your change touches, e.g. `npx playwright test tests/e2e/shop.spec.ts --project=pixel-chromium --workers=1`. The Deploy workflow runs the whole suite on every push to `main`. Review your full diff before pushing.
6. **Document.** Tick the milestone checkboxes and update its status in `docs/ROADMAP.md`. Add a `CHANGELOG.md` entry. Bump the version in `package.json` (minor for milestones, patch for fixes). Update `GAME_DESIGN.md` / `TECH_SPEC.md` if anything changed.
7. **Ship.** Commit directly to `main` and push. Save milestone screenshots in `docs/screenshots/mNN/`. Pushing to `main` deploys automatically; the Deploy workflow runs all checks first (the E2E suite in parallel shards), so check that it passes and fix any failure with a new commit on `main`. Pushes that only touch `docs/`, Markdown files, `art-source/` or `.claude/` skip the workflow, so there is no run to wait for. Then tag `vX.Y.Z` and push the tag.
8. **Report** in Turkish: what changed, screenshots, test notes, what to test on the phone and how, known issues, and the next milestone.

## Debug and test hooks

- `?debug=1` shows the debug panel: FPS, body count, add coins, set upgrade levels, jump to stage, set score, spawn tier, reset save. Allowed in production builds.
- `?seed=<n>` makes a run deterministic. `?skin=placeholder` forces placeholder art.
- In debug mode, `window.__game` exposes state and helpers for Playwright (TECH_SPEC §11).
