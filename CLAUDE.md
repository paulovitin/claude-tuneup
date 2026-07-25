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
- **`scripts/*.mjs`** — deterministic, cross-OS (macOS/Windows/Linux), Node built-ins only; `lib.mjs` is the shared core everything imports. `SKILL.md` documents each script and its flags — that is the source of truth, so don't restate it here.

### Invariants — do not break these

- **No Python, no deps, no Node-version-specific APIs.** Scripts must run identically on all three OSes via the bundled node. Windows matters: use `linkDir()` (junction fallback) not raw symlinks, and never assume `python3` exists.
- **Path resolution via `fileURLToPath`**, never `new URL().pathname` — install paths contain spaces/unicode (e.g. `~/Library/Application Support`).
- **Backups live OUTSIDE the skill** (`~/.claude-tuneup/backups/<run-id>/`, override `$CLAUDE_TUNEUP_STATE`) so a skill update/reinstall can't wipe the undo history. `restore.mjs` still reads the legacy in-skill `.backups/` too.
- **Move, never `rm`, anything irreplaceable** (`lib.move()` — rename with verified cross-device copy fallback). Hard `rm` is only OK for self-regenerating caches (venvs, statsig). `SESSION_HISTORY` dirs (transcripts, todos, sessions) are never bulk-deleted.
- **Snapshots are chmod-restricted owner-only** — `.claude.json` can carry tokens.
- **Trust scan flags over names.** Items are classified by traits (size/age/broken-link/transport), not hardcoded names. If `plugins.listingReliable` is false, never propose uninstalls from the listing (format-drift fuse).
- `CLAUDE_TUNEUP_HOME` overrides `HOME` for every script — the entire test suite relies on it. Anything reading the install must route through `lib.mjs` constants, not `os.homedir()` directly.

## Releasing

Merge-driven. Never `git tag` or bump `package.json` by hand — a release PR does both, and the version and its `CHANGELOG.md` section must move together or the release fails loudly. See `RELEASING.md`.
