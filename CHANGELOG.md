# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0 note: while on `0.x`, a **minor** bump (`0.MINOR.x`) may carry behavior
changes, and a **patch** bump (`0.x.PATCH`) is reserved for backward-compatible
fixes only.

## [Unreleased]

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

[Unreleased]: https://github.com/paulovitin/claude-tuneup/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/paulovitin/claude-tuneup/releases/tag/v0.1.0
