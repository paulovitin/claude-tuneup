# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version note: releases up to `0.4.1` were pre-1.0, where a **minor** bump could
carry behavior changes. From `5.0.0` on, plain SemVer applies — breaking changes
take a **major** bump.

## [Unreleased]

## [5.1.1] - 2026-07-28

Two settings bugs, both found by asking why the same question was answered in six places.

### Fixed

- **Auto-memory settings were read from `settings.json` alone.** A dev who set
  `autoMemoryEnabled: false` or `autoMemoryDirectory` in `settings.local.json` was told
  auto-memory was still on, and their configured memory directory was reported as unset.
  Precedence (the local file wins for a scalar key) now lives in one place and every scan
  answers the same way.
- **`insights.mjs` cached inside `~/.claude`.** This skill's own state belongs beside the
  backups (`~/.claude-tuneup/`, `$CLAUDE_TUNEUP_STATE`) — the old location was the one place
  it must not be, where the skill's own root-file scan classes it as a stray cache and
  offers to delete it. A run now sweeps the stale file left by earlier versions.

### Changed

- `doctor.mjs` now answers from a warm cache inside a nested run instead of refusing on the
  recursion guard, matching what `insights.mjs` already did.
- `restore.mjs` `list`/`search`/`apply` output now includes a `runId` field — the restore
  point's basename, which is the ledger run id by construction — so `ledger.mjs revert-run`
  after an undo never needs the id computed by hand.
- Internal: install layout, settings precedence and the restore-point config list moved into
  `scripts/install.mjs`; the `claude -p` guard/spawn/cache plumbing shared by `doctor.mjs`
  and `insights.mjs` moved into `scripts/headless.mjs`. No script flags changed. The
  restore-point on-disk format shared by `backup.mjs`/`restore.mjs` now lives in
  `scripts/restorepoint.mjs`, and `scan.mjs`'s settings audit is a pure function over one
  filesystem snapshot.

## [5.1.0] - 2026-07-27

The v5 pivot said the tool audits *what loads into every session*. It read three of those
surfaces. This closes the gap, and makes a second run cheap enough to be worth doing.
It also makes the undo honest: a full restore now reverses what a run *added*, and a
symptom noticed three days later can be traced back to the run that caused it.

### Added

- **Slash commands, output styles and plugin-bundled components are now audited.**
  `audit-instructions.mjs --surfaces` walks `~/.claude/commands/**` (namespaced by
  directory, so `commands/git/commit.md` is `git:commit`), `~/.claude/output-styles/`,
  and any skills/agents/commands a plugin ships. Steps 14 and 15 cover them; plugin
  components are report-only, because the action there is uninstalling the plugin.
- **Residency is labelled instead of assumed.** Each surface carries
  `residency: confirmed | inferred | none`, and totals are split
  (`approxResidentTokens` vs `approxResidentTokensInferred`) so a verified cost is
  never blended with a guess. Only the *active* output style is resident, and it costs
  its body, not its description — an unselected one is clutter, not spend.
- **STEP 18 — surfaces that are installed but inert.** Unselected output styles,
  never-used agents, commands duplicating a skill, unreadable frontmatter. It refuses to
  read a missing usage counter as zero usage.
- **STEP 19 — `settings.json` semantics.** New `scan.mjs --section settings`: permission
  rules naming directories that no longer exist, rules duplicated within a list or across
  both files, the same rule both allowed and denied, `statusLine`/hook commands pointing
  at deleted scripts, credential-looking `env` var **names**, a configured `outputStyle`
  matching no file, and unrecognized top-level keys. Unknown keys are reported and never
  proposed for removal — the key list is hand-maintained and a newer Claude Code is the
  likelier explanation.
- **`ledger.mjs` — memory across runs.** Records what the dev decided so a second tune-up
  stops re-proposing it, and tracks resident tokens per run so regrowth surfaces at
  STEP 0. Decision keys are content-addressed: rewriting a rule reopens it, because the
  dev never approved the new wording. New `--all` re-asks everything anyway. The ledger
  stores paths, hashes and verdicts — **never the dev's instruction text** — and lives
  beside the backups so a `restore` can't erase it (`restore` calls `revert-run` to drop
  just that run's decisions).
- `scan.mjs --section usage` now reports `agentUsage` and `pluginUsage`, plus
  `countersPresent` so "used zero times" is distinguishable from "we can't see usage".
- **`claude-tuneup fix` — trace a symptom back to the run that caused it.** The common
  failure isn't a crash during a tune-up; it's a run that finished cleanly and something
  being wrong three days later, in a session with no memory of it and a dozen changes to
  choose from. `restore list` showed timestamps and counts, which can't map a symptom to
  a cause. New `restore.mjs search <term...>` reads what was always sitting in every
  restore point: removed item paths, `actions.log`, and the snapshotted
  `CLAUDE.md`/`AGENTS.md`/`SOUL.md` — so "the rule I had about commits is gone" is
  findable too. Results are ranked by how many terms hit and presented as candidates, not
  a verdict. `.claude.json` and `settings*.json` are never searched: they can carry
  tokens, and a search result is text we print.
- **Surgical recovery, in both directions.** `restore.mjs apply <RP> --only <path>` handles
  one item and touches nothing else, so fixing one regression no longer means reverting
  everything the dev was happy with. A removed item goes back; a created one is moved into
  `<RP>/undone-creations/`. No fuzzy path matching — restoring the wrong path is worse than
  asking again — and a newer file that retook the path is parked, never clobbered. `fix`
  also records a standing keep, so the next run doesn't repropose what just broke things.

### Fixed (undo)

- **"Undo everything" did not undo everything.** `restore.mjs apply` reversed config edits
  and put removed items back, but nothing recorded what a run *added* — so the skills
  steps 16 and 17 write were silently left in place by a full restore, and a regression
  caused by an addition could never be traced. A skill that shadows an existing one
  changes routing without deleting anything, and the two cases need opposite fixes.
  New `backup.mjs created <RP> <path>` records additions (the file itself is not touched);
  `apply` now reverses them, `search` reports them in their own `created` bucket rather
  than leaving the direction to be inferred from a path, and `list` shows `createdCount`
  alongside `removedCount`. Undoing an addition **moves** it to `undone-creations/` rather
  than deleting it — the dev may have edited a skill this tool wrote for them.
- **A contract for a step failing mid-run.** There wasn't one. A failed **mutation** now
  halts the whole run — everything after it would reason about a state neither side
  models — while read failures still continue as before. It reports the raw error, what
  already changed, and what never ran, then offers: roll everything back, undo just this
  step, leave it and stop, or say how to fix it. Rollback is never automatic; that would
  be a second destructive surprise on top of the first. A broken config is repaired first
  and separately, before any of those choices.
- **A retry after an undo.** An undo is the strongest signal the tool gets: a run
  finished, the dev looked at it, and rejected it. Both undo paths now offer a second
  attempt and **require a stated reason** — a category button plus the dev's own words —
  because without one a retry is the same run again. The reason is converted into
  constraints before anything re-runs: named items become standing keeps, nothing the
  reverted run did comes back by default, and each category maps to a concrete change in
  how the retry behaves (one edit per confirmation, propose-only, smaller scope). The
  retry is scoped to the group that failed by default, with a full re-run available on
  request. `ledger.mjs record-retry` / `retries` store the lineage; reasons survive
  `revert-run`, since that is the only thing the next attempt knows that this one didn't.
  Two failed attempts is a hard cap — `depth` is computed from the chain, not guessed —
  and the summary of an adapted run must quote the reason and name what changed, because
  unqualified "adjusted based on your input" only claims the dev was listened to.

### Fixed

- **`~/.claude/.credentials.json` no longer routes through the ask-the-dev flow.** It fell
  through to `class: 'unknown'`, which STEP 7 inspects and asks about — so every run
  prompted the dev about their own OAuth tokens. Now classed `secret-never-touch`: never
  read, never offered as a decision. `keybindings.json` joins `config-keep` for the same
  reason.
- `insights.mjs` had no test of any kind, despite carrying the recursion guard that exists
  because it could spawn itself. Refactored to the exported shape `doctor.mjs` was modelled
  on and covered: the guard, cache TTL, the empty-parse-is-never-cached rule, and a missing
  `claude` binary (which now reports a reason instead of a timeout message).
- **Path checking was blind on Windows.** `checkCmdPath` only recognized paths beginning
  with `/`, so a command naming `C:\...\server.exe` matched nothing and the scan reported
  no finding at all rather than a wrong one — meaning a broken local MCP server path has
  never once been flagged on Windows. `permissionPathPrefix` likewise rejected anything not
  starting with `/` and split on `/` alone, leaving every path-shaped permission rule in a
  Windows settings file unchecked. Both now read a drive letter, and the reported prefix
  keeps the separator the rule itself used rather than being normalized to the platform's.
  Because `C:\Program Files\` is where interpreters live, a path is resolved by the longest
  run that exists instead of stopping at the first space — truncating there would report a
  working `statusLine` or hook as broken.
- Repo documentation drift: `CLAUDE.md` described 10 steps and three playbooks against the
  17 steps and five references actually shipping; `scan.mjs`'s header comment omitted
  `memory`; `tools/changelog-section.mjs` still pointed at its pre-move path; the two
  tickets and the modernization plan in `tasks/` read as open work.

## [5.0.0] - 2026-07-25

A deliberate version jump. claude-tuneup stops being an install
cleaner and becomes an **instruction auditor**, following Anthropic's
[The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models).
Almost nothing about a run behaves the way 0.4.x behaved.

### Added

- **New `instructions` group (steps 12–17)** — the new center of the tool. Audits what loads into
  every session: rules that were written to compensate for older models and should now be judgment
  (12), instructions that contradict what the Claude Code runtime already does (13), the same
  instruction repeated across `CLAUDE.md`, agent bodies, agent descriptions and skill descriptions
  (14), `description` fields that route badly (15), and a full restructure of the global
  `~/.claude/CLAUDE.md` into what stays, what becomes a skill, and what becomes a memory (16).
  Playbook: `references/instructions.md`.
- **`references/harness-invariants.md`** — the seed list behind step 13, with a per-entry evidence
  label (**confirmed** vs **inferred**) so a flagged conflict can be judged on how well we know it.
  States its own limit out loud: the session prompt isn't readable from disk, so this check is
  incomplete by construction and reports "conflicts I can currently detect", never a clean bill.
- **`scripts/doctor.mjs`** — runs Claude Code's built-in `/doctor` headlessly and parses its report
  into JSON. The call always carries a report-only instruction, and a test asserts it is present in
  every command the module builds: a headless run has no confirmation prompts, so that instruction
  is the safeguard. 600s timeout (a real pass measured 359s), cached 1h, degrades silently.
- **`scripts/audit-instructions.mjs`** — extracts instruction-line signals and every resident
  `description`. Detects only; classification and rewriting stay with the agent.
- **STEP 0.6** — `/doctor` and `/insights` both fire at the start of a run, in parallel. `/insights`
  runs here rather than where it's consumed so it reads the session history *before* cleanup step 6
  offers to prune it.
- **Optional verification pass** — step 11 offers a second `/doctor` run, with the ~6-minute cost
  stated plainly, and builds the summary from the difference between the two reports. Skipped
  silently when the run changed nothing. A hard filter prevents it from proposing removal of skills
  this run just created (they have zero usage by definition).
- `--help` on every script, and `scan.mjs --sections` to list valid section names. Previously
  `insights.mjs --help` spent a real model call before printing anything.

### Changed

- **`claude-tuneup` with no argument now runs everything.** The "which group?" menu is gone. Every
  individual change is still confirmed one at a time, so a full run is safe by construction;
  `--dry-run` is the recommended first contact.
- **Positioning: a complement to `/doctor`, not a competitor.** The skill runs `/doctor` itself and
  works from its report — steps 1, 2 and 4 read its usage verdicts instead of guessing. README,
  help card, skill description and `package.json` description all rewritten to say so.
- **`insights.mjs` output is redirected.** It no longer feeds "Suggested CLAUDE.md Additions" into
  your `CLAUDE.md` as new rules. It now drives **step 17**, which proposes a *skill* for a recurring
  workflow you never wrote down. This is the one thing in the tool that reads behavior rather than
  files — every other check, including `/doctor`'s, can only find what you already wrote.
- **Step 9 narrows to the global `CLAUDE.md`** and hands a project's checked-in `CLAUDE.md` to
  `/doctor` by name, whose checks 3 and 4 do that job better.
- Skill `description` de-example-stuffed to state capability and boundary.

### Removed

- **`SOUL.md` creation.** The interview, all eight axes, and the `@SOUL.md` wiring are gone. Claude
  Code's auto-memory does this now, and it recalls when relevant instead of loading unconditionally.
  **Existing files are migrated, not dropped:** step 10 converts a `SOUL.md` into typed memory files,
  shows them in full, and only then moves the file into the restore point and removes the import.
  Nothing is removed before the replacement is live, and undo restores both. The `soul.md` group name
  and alias stay indefinitely — someone who comes back in a year and types what they always typed
  must still be caught and migrated. If auto-memory is disabled, the migration is not offered at all.

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

[Unreleased]: https://github.com/paulovitin/claude-tuneup/compare/v5.1.1...HEAD
[5.1.1]: https://github.com/paulovitin/claude-tuneup/compare/v5.1.0...v5.1.1
[5.1.0]: https://github.com/paulovitin/claude-tuneup/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/paulovitin/claude-tuneup/compare/v0.4.1...v5.0.0
[0.4.1]: https://github.com/paulovitin/claude-tuneup/compare/v0.3.0...v0.4.1
[0.3.0]: https://github.com/paulovitin/claude-tuneup/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/paulovitin/claude-tuneup/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/paulovitin/claude-tuneup/releases/tag/v0.1.0
