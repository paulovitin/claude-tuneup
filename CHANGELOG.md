# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0 note: while on `0.x`, a **minor** bump (`0.MINOR.x`) may carry behavior
changes, and a **patch** bump (`0.x.PATCH`) is reserved for backward-compatible
fixes only.

## [Unreleased]

## [0.4.1] - 2026-06-12

### Added

- **AGENTS.md bridge** — `scan.mjs --section memory` analyzes the user-level memory
  files (`CLAUDE.md`, `AGENTS.md`, `SOUL.md`): per-file size/tokens, the `@imports`
  found in `CLAUDE.md`, `linkStyle` (`import`/`symlink`/`none`), a **`drift`** flag
  when both files carry real content with nothing linking them, and
  `combinedApproxTokens` (what actually loads each session, since imports load at
  launch). Claude Code does not auto-load `AGENTS.md`, so the bridge is the import
  mechanism it *does* have.
- **Step 9.0 in the claude-md playbook** — opt-in sub-flow for multi-agent setups:
  one question ("do other agents read AGENTS.md?"), then the **shim pattern**
  (`CLAUDE.md` = `@AGENTS.md` + `@SOUL.md` + Claude-only deltas), drift
  consolidation with a chosen source of truth, and symlink→shim conversion.
  Claude-only users never see any of it; no `AGENTS.md` is ever created for them.
- `AGENTS.md` is now part of the restore-point snapshot (`backup.mjs`/`restore.mjs`)
  and classified `config-keep` by the root-files scan.
- **Update nudge** — a new `version-check.mjs` helper compares the shipped skill
  version against the latest GitHub release and, only when behind, surfaces a single
  line pointing at `npx skills add paulovitin/claude-tuneup`. The release lookup is
  cached 24h under the state dir and fails silently when offline or rate-limited, so it
  adds no model tokens on most runs and never blocks a tune-up. The skill version now
  ships in a `skills/claude-tuneup/VERSION` file, kept in lockstep with `package.json`
  by a release-guard test.

### Changed

- **SOUL wiring rule hardened** — `@SOUL.md` lives only in `CLAUDE.md`, never in
  `AGENTS.md`: the soul is Claude-specific by design and `@` syntax is noise to
  every other tool. Symlinked setups are converted to the shim first.
- Rule 9 (token budget) now covers the **combined** total in shim setups: shim +
  `AGENTS.md` + `SOUL.md` together stay within ~1500 tokens.
- Frontmatter description gains the `AGENTS.md` trigger ("wire or de-duplicate
  AGENTS.md with CLAUDE.md").

## [0.3.0] - 2026-06-11

### Fixed

- **Plugin uninstall used the wrong CLI family** — the cleanup playbook now runs
  `claude plugin uninstall <plugin>@<marketplace>` (with `--scope` / `--prune` notes)
  instead of the nonexistent `claude mcp uninstall`.
- **Hooks wired only in `settings.local.json` were flagged as orphans** — `scanHooks()`
  now checks `settings.json` *and* `settings.local.json`, reports `referencedIn` per
  hook, and carries a note that project-level settings can't be fully verified.
- **`statsig` was misclassified as irreplaceable session history** — it's a
  regenerable feature-flag cache and is now hinted as such instead of being protected
  as conversation data.
- **Age spans for `projects/` were computed from project-dir mtimes** — `ageSpan()`
  now dates the session *files* below each project dir, so a project touched
  yesterday can no longer mask year-old transcripts during age-scoped pruning.
- **Hardcoded "cloud MCP" vendor list removed** — MCP servers are classified by
  trait (`transport: remote` for `http`/`sse`/`url`, `local` otherwise); remote
  servers are never touched as local files regardless of their name.
- **`--dry-run` no longer creates a restore point** — a dry run changes nothing, so
  it no longer litters `~/.claude-tuneup/backups/` with empty entries.

### Changed

- **`python3` is no longer required anywhere** — all inline `python3 -c` /
  `python3 -m json.tool` usage replaced by Node: `scan.mjs --section usage` (usage
  counters) and the new `validate-json.mjs` (config validation). The cross-OS,
  zero-dependency promise now holds end to end.
- **Progressive disclosure for the skill itself** — `SKILL.md` shrank from 403 to
  ~160 lines (routing + UX contract + safety rules) and the per-group playbooks moved
  to `references/{cleanup,claude-md,soul-md}.md`, loaded only when that group runs.
  The frontmatter description was rewritten trigger-first and cut from ~690 to ~550
  chars — it loads into every session, same token discipline the skill preaches.
- **Skill consolidation to `~/.agents/skills/` is now opt-in** — the skill asks once
  whether the dev actually uses other agents that share that dir; keeping skills in
  `~/.claude/skills/` is treated as a valid setup.
- `scan.mjs` accepts `--section <a,b>` so each step pulls only its own slice of the
  install into context instead of re-scanning everything.

### Added

- **Mass-uninstall fuse** — `scanPlugins()` reports `listingReliable`; when
  `installed_plugins.json` parses empty while plugin content exists on disk, the
  skill refuses to treat unlisted plugins as uninstalled. Flat-map manifest formats
  are tolerated.
- **Selective restore** — `restore.mjs apply <RP> --configs-only | --items-only`,
  surfaced in the `restore` flow as a scope question.
- **`consolidate.mjs`** — deterministic move + link-back for skills, with a junction
  fallback on Windows where plain symlinks need admin rights (`--undo` reverses it).
- **`validate-json.mjs`** — cross-OS JSON sanity check used after every config edit.
- **`insights.mjs --no-cache`** — force a fresh `/insights` run; empty section parses
  are no longer cached and now point the agent at reading the report HTML directly.
- **Secret hygiene** — restore points and pre-restore snapshots are chmod-restricted
  (owner-only), and MCP credential detection reports env var *names* only, never values.
- **End-to-end test suite** — backup→stash→restore roundtrips, collision handling,
  selective restore, the plugins listing fuse, local-settings hook references,
  `statsig`/span behavior, consolidate+undo, and JSON validation, all exercised as
  child processes against a throwaway `$CLAUDE_TUNEUP_HOME`.

## [0.2.0] - 2026-06-05

### Changed

- **Backups now live outside the skill dir** — `~/.claude-tuneup/backups/<run-id>/`
  (override with `$CLAUDE_TUNEUP_STATE`). A skill update, reinstall, or move can no
  longer wipe the undo history. `restore` still scans the legacy in-skill `.backups/`
  so older restore points keep working. (#3)

### Fixed

- Collision-proof, lexically sortable run ids replace the second-precision timestamp;
  two runs in the same second no longer resolve to the same backup dir. (#3)
- `skillRoot()` decodes percent-encoded install paths (spaces / unicode, e.g.
  "Application Support") instead of resolving to a `%20`-mangled dir. (#3)
- `move()` verifies the cross-device copy landed before deleting the source. (#3)
- `checkCmdPath()` no longer flags `//host/path` inside a URL arg as a missing local file. (#3)
- `scanHooks()` matches whole filename tokens, so `a.sh` is no longer counted as
  referenced by a hook named `aa.sh`. (#3)
- `insights.mjs` guards against spawning `claude -p` recursively from inside an insights run. (#3)

### Added

- First automated test suite (`node:test`, zero deps) and CI running it on
  Linux, macOS, and Windows. (#3)

## [0.1.0] - 2026-06-05

### Added

- Initial tagged baseline: `cleanup` / `claude.md` / `soul.md` / `summary` groups;
  deterministic cross-OS Node helpers (`scan`, `backup`, `restore`, `insights`);
  undoable runs via restore points; session-history protection; `--dry-run`;
  EN + pt-BR READMEs.

[Unreleased]: https://github.com/paulovitin/claude-tuneup/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/paulovitin/claude-tuneup/compare/v0.3.0...v0.4.1
[0.3.0]: https://github.com/paulovitin/claude-tuneup/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/paulovitin/claude-tuneup/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/paulovitin/claude-tuneup/releases/tag/v0.1.0
