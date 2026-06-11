# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`claude-tuneup` ships as a single Claude Code **skill** (`skills/claude-tuneup/`) — not an app. The "product" is `SKILL.md` (a checklist an agent follows to clean/personalize a `~/.claude` install) backed by deterministic Node helpers in `scripts/`. There is no build step and no runtime; the only code that executes is the helper scripts and their tests.

## Commands

```bash
npm test                                    # run everything (node --test, discovers *.test.mjs)
node --test skills/claude-tuneup/scripts/scan.test.mjs   # one test file
node tools/changelog-section.mjs X.Y.Z      # preview release notes for a version
```

Helper scripts run via the bundled `node` (zero deps). To exercise one against a throwaway tree instead of your real install, set `CLAUDE_TUNEUP_HOME`:

```bash
CLAUDE_TUNEUP_HOME=/tmp/fakehome node skills/claude-tuneup/scripts/scan.mjs --section skills
```

## Architecture

Two layers, deliberately split:

- **`SKILL.md` + `references/*.md`** — the judgment layer the agent reads. `SKILL.md` holds routing, the UX contract, and safety rules (loads on trigger). Per-group playbooks (`cleanup.md` steps 1–8, `claude-md.md` step 9, `soul-md.md` step 10) load **only when that group runs** — token hygiene the skill also enforces on the user's `CLAUDE.md`. The agent decides (classify, ask, delete/keep); scripts only gather and apply.
- **`scripts/*.mjs`** — deterministic, cross-OS (macOS/Windows/Linux), Node built-ins only. `lib.mjs` is the shared core (everything imports it). `scan.mjs` is read-only discovery → JSON (`--section`). `backup.mjs`/`restore.mjs` are the undo system. `consolidate.mjs` moves a skill to `~/.agents/skills` + links back. `validate-json.mjs` is the post-edit sanity check. `insights.mjs` runs `/insights` headless (cached 1h).

### Invariants — do not break these

- **No Python, no deps, no Node-version-specific APIs.** Scripts must run identically on all three OSes via the bundled node. Windows matters: use `linkDir()` (junction fallback) not raw symlinks, and never assume `python3` exists.
- **Path resolution via `fileURLToPath`**, never `new URL().pathname` — install paths contain spaces/unicode (e.g. `~/Library/Application Support`).
- **Backups live OUTSIDE the skill** (`~/.claude-tuneup/backups/<run-id>/`, override `$CLAUDE_TUNEUP_STATE`) so a skill update/reinstall can't wipe the undo history. `restore.mjs` still reads the legacy in-skill `.backups/` too.
- **Move, never `rm`, anything irreplaceable** (`lib.move()` — rename with verified cross-device copy fallback). Hard `rm` is only OK for self-regenerating caches (venvs, statsig). `SESSION_HISTORY` dirs (transcripts, todos, sessions) are never bulk-deleted.
- **Snapshots are chmod-restricted owner-only** — `.claude.json` can carry tokens.
- **Trust scan flags over names.** Items are classified by traits (size/age/broken-link/transport), not hardcoded names. If `plugins.listingReliable` is false, never propose uninstalls from the listing (format-drift fuse).
- `CLAUDE_TUNEUP_HOME` overrides `HOME` for every script — the entire test suite relies on it. Anything reading the install must route through `lib.mjs` constants, not `os.homedir()` directly.

## Conventions

- Tests sit side-by-side with source (`scan.test.mjs` next to `scan.mjs`), use `node:test` + `node:assert`, and point at temp trees via `CLAUDE_TUNEUP_HOME`.
- Scripts emit JSON via `lib.out()` for the agent to reason over.

## Releasing

Merge-driven, no manual `git tag`. A release PR (`chore(release): X.Y.Z`) bumps `package.json` version **and** moves `CHANGELOG.md` `[Unreleased]` into a dated section. On merge to `main`, `.github/workflows/release.yml` tags + publishes. Version and changelog section must stay in lockstep or the release fails loudly. See `RELEASING.md`.
