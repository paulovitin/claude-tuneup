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

- **`SKILL.md` + `references/*.md`** — the judgment layer the agent reads. `SKILL.md` holds routing, the UX contract, and safety rules (loads on trigger). Per-group playbooks load **only when that group runs** — token hygiene the skill also enforces on the user's `CLAUDE.md`. The agent decides (classify, ask, delete/keep); scripts only gather and apply.

  | Playbook | Group | Steps |
  |---|---|---|
  | `cleanup.md` | cleanup | 1–8, 19 |
  | `instructions.md` | instructions | 12–18 |
  | `claude-md.md` | claude.md | 9 |
  | `soul-md.md` | soul.md | 10 |
  | `harness-invariants.md` | — | second-level, loaded by `instructions.md` for step 13 |

  Steps are numbered by history, not running order; `SKILL.md` holds the running order and step 11 (summary). Numbers are never reused — a retired step's number stays retired.

- **`scripts/*.mjs`** — deterministic, cross-OS (macOS/Windows/Linux), Node built-ins only; `lib.mjs` is the shared core everything imports. `SKILL.md` documents each script and its flags — that is the source of truth, so don't restate it here.

### Invariants — do not break these

- **No Python, no deps, no Node-version-specific APIs.** Scripts must run identically on all three OSes via the bundled node. Windows matters: use `linkDir()` (junction fallback) not raw symlinks, and never assume `python3` exists.
- **Path resolution via `fileURLToPath`**, never `new URL().pathname` — install paths contain spaces/unicode (e.g. `~/Library/Application Support`).
- **Backups live OUTSIDE the skill** (`~/.claude-tuneup/backups/<run-id>/`, override `$CLAUDE_TUNEUP_STATE`) so a skill update/reinstall can't wipe the undo history. `restore.mjs` still reads the legacy in-skill `.backups/` too.
- **Move, never `rm`, anything irreplaceable** (`lib.move()` — rename with verified cross-device copy fallback). Hard `rm` is only OK for self-regenerating caches (venvs, statsig). `SESSION_HISTORY` dirs (transcripts, todos, sessions) are never bulk-deleted.
- **Snapshots are chmod-restricted owner-only** — `.claude.json` can carry tokens.
- **Trust scan flags over names.** Items are classified by traits (size/age/broken-link/transport), not hardcoded names. If `plugins.listingReliable` is false, never propose uninstalls from the listing (format-drift fuse).
- **Never read `.credentials.json`, and never print an env value.** Scans emit credential-looking env var *names* only (`secretHints`, `envSecretHints`); `.credentials.json` is classed `secret-never-touch` and is skipped without being opened.
- **A claim about the harness carries an evidence label.** `confirmed` vs `inferred` in `harness-invariants.md` and in `--surfaces` `residency`. Never fold inferred cost into a confirmed total — `approxResidentTokens` and `approxResidentTokensInferred` stay separate for that reason.
- **The ledger stores hashes, never the user's text**, and lives beside the backups (`~/.claude-tuneup/ledger.json`) so a restore can't erase it. Decision keys are content-addressed: rewriting a rule reopens it.
- `CLAUDE_TUNEUP_HOME` overrides `HOME` for every script — the entire test suite relies on it. Anything reading the install must route through `lib.mjs` constants, not `os.homedir()` directly.

## Releasing

Merge-driven. Never `git tag` or bump `package.json` by hand — a release PR does both, and the version and its `CHANGELOG.md` section must move together or the release fails loudly. See `RELEASING.md`.
