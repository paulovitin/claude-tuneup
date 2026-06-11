# Cleanup playbook — steps 1–8

> Loaded on demand by SKILL.md. The UX contract ("How to ask the dev"), the restore-point
> policy (STEP 0.5) and the Rules in SKILL.md apply to **every** step below.

Run each step's scan with its own section — e.g. `node "$SKILL_DIR/scripts/scan.mjs" --section skills` — instead of one giant scan, so only the data the current step needs enters the context. Inline shell (`ls`, `du`) is the fallback when the script can't run.

---

## STEP 1: Skills (`~/.claude/skills/` and `~/.agents/skills/`)

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section skills
```

Each entry has `name`, `origin` (`claude` | `agents`), `type` (`dir` | `symlink` | `file`), `size`, `broken` (for symlinks) and `alsoInOther` (duplicate across the two locations).

Possible actions per item:
- **Broken symlink** → delete (it's a dead pointer; log it to `$RP`).
- **Duplicate** (`alsoInOther: true`) → show both sizes, ask which copy wins; stash the loser.
- **Real skill dir in `~/.claude/skills/`** → ask if it's used. If unused → stash. If used, see consolidation below.
- **Plugin wrongly in skills/** → stash (the plugin already lives in `plugins/`).
- Valid symlink → ✅ OK.

**Consolidation is opt-in, not a default.** `~/.agents/skills/` is a cross-agent convention — useful **only** if the dev runs other agents that read it. Ask ONCE per run (AskUserQuestion + explain button): "Do you use other AI agents that share `~/.agents/skills/`?" If **no**, keeping skills in `~/.claude/skills/` is the simpler, perfectly valid setup — skip consolidation entirely. If **yes**, consolidate each used skill with:

```bash
node "$SKILL_DIR/scripts/consolidate.mjs" <name>          # move + link back (junction on Windows)
node "$SKILL_DIR/scripts/consolidate.mjs" <name> --undo   # reverse it
```

The script refuses to overwrite an existing target (resolve duplicates first) and prints what it did as JSON.

---

## STEP 2: Plugins (`~/.claude/plugins/`)

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section plugins
```

Returns `totalSize`, `installedCount`, `installed` (names), `marketplaces` (each with size + `used`), `unusedMarketplaces`, and **`listingReliable`**.

**`listingReliable: false` is a hard stop for uninstall proposals.** It means `installed_plugins.json` parsed empty while plugin content exists on disk — the file format likely changed, so "not in the listing" must NOT be read as "not installed". In that case: tell the dev the listing can't be trusted, still review marketplace **sizes**, and skip every "uninstall unlisted plugin" suggestion.

When the listing IS reliable:
- Plugin directory present but not in `installed` → ask whether to uninstall.
- Unused marketplaces (no installed plugin references them) → ask whether to remove; log the re-add command (`claude plugin marketplace add <url-or-repo>`) to `$RP` first.
- Broken symlinks → delete.

**Uninstall a plugin** (NEVER without confirmation) — plugins are managed by the `plugin` CLI family, not `mcp`:

```bash
claude plugin uninstall <plugin>@<marketplace>
```

Add `--scope project|local` if the install was scoped; on Claude Code ≥ 2.1.121, `--prune` also removes its now-orphaned dependencies. Then re-check the directory. If remnants remain, ask, then stash them.

---

## STEP 3: Hooks (`~/.claude/hooks/` + user-level settings)

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section hooks
```

The scan checks **both** `settings.json` and `settings.local.json` (`settingsChecked` lists which were read) — a hook wired only in the local file is NOT an orphan. Each on-disk hook carries `referencedIn`.

- **`onDiskNotReferenced`** → candidate orphans, but mind the scan's `note`: a project-level `.claude/settings.json` somewhere may still reference it, and the scan can't see every repo. Phrase it honestly — "not referenced in your user-level settings; does it ring a bell from a project?" — then ask whether to stash.
- **Hooks in settings but NOT on disk** → dead entries; ask whether to remove from the JSON (validate after editing — Rule 4).
- **Active hooks** (on disk + referenced) → show what each does (read the file header), ask whether to keep.

---

## STEP 4: MCP servers (`.claude.json` + `settings*.json`)

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section mcps
```

Servers are returned per source (`global`, `settings`, `settingsLocal`) and classified **by trait, not by name**:

- **`transport: "remote"`** (type `http`/`sse`, or a `url`) → managed elsewhere — claude.ai connectors or `claude mcp`. **Do NOT touch these as local files**, whatever their name is. At most, ask whether the dev still wants the entry at all.
- **`transport: "local"`** → check `missingPaths`. A server whose command/paths no longer exist → ask whether to remove the entry. Disabled-in-project servers → ask whether to remove.
- **`secretHints`** lists env var **names** that look like inline credentials (the scan never prints values — neither should you). Alert immediately: plaintext keys in `.claude.json` are a leak risk; suggest moving them to the environment or a secret manager.

Every removal is a JSON edit → validate after (Rule 4).

---

## STEP 5: Projects in `.claude.json`

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section projects
```

Returns `total`, `alive`, and `gone` (project paths that no longer exist on disk).

- For each `gone` path → ask whether to remove the entry (these often pile up for years).
- For alive projects → check whether the inner `mcpServers`/`mcpConfig` has dead servers (same trait rules as STEP 4).
- Edits → validate after (Rule 4).

---

## STEP 6: State directories (`~/.claude/`)

**Do NOT work from a fixed list of directory names — you don't know what you'll find.** Installs differ and change across versions. Discover what's actually there, then classify each by traits, not by a hardcoded name.

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section stateDirs
```

Each dir comes flagged: `empty`, `big` (≥ 50M), `sessionHistory` (+ `span`), and sometimes `hint: "regenerable"` (name-pattern hint only — e.g. `statsig`, `*cache*`, `tmp` — you still inspect and ask). Skip dirs already handled by earlier steps of this run (skills/plugins/hooks). For every *other* directory:

- **Empty** → offer to delete.
- **Big (≥ 50M)** → drill in (`du -sh <dir>/* | sort -rh`) and surface the large children. **Size beats labels** — the biggest win is often inside a dir that *sounds* internal (e.g. a bundled venv/runtime). Never skip a dir just because its name sounds important.
- **Looks regenerable** (the `hint`, or cache/tmp/venv/build/log signatures, or content that's clearly derived) → offer to delete, but warn it may **self-regenerate**: venvs, plugin caches, telemetry caches like `statsig`, and downloaded runtimes get rebuilt on next use, so deleting reclaims nothing lasting. After deleting a big artifact, re-measure to confirm it stayed gone; if it came back, the real reclaim is **uninstall/disable the owning plugin** — offer that instead.
- **Session history / irreplaceable state** → see the dedicated rules below. Default keep; never bulk-delete.
- **Unknown / can't classify** → do NOT guess. Inspect it (`ls`, `du`, `file`, peek at a sample file) and route through the "What does this do?" flow: explain what you found, then ask.

Every prompt here goes through AskUserQuestion with the mandatory "What does this do?" button.

### Session history — handle with extra care

The most valuable, **least replaceable** data in a Claude Code install is the conversation history and session state. `scan.mjs` flags these with `sessionHistory: true` (dirs) or `class: "session-history"` (files), and includes a `span` (`count`, `oldest`, `newest`) so you can reason about age. The span dates the **session files inside** project dirs (recursing below `projects/<proj>/`), so a project touched yesterday can't mask year-old transcripts. Canonical locations: `projects/` (full transcripts, `.jsonl` per session), `todos/`, `shell-snapshots/`, `file-history/`, `sessions/`, and `history.jsonl` (prompt history). Note `statsig` is **not** history — it's a regenerable feature-flag cache.

Hard rules for anything flagged as session history:

1. **Never in the restore point.** STEP 0.5 only snapshots small config files — transcripts are far too large to copy, so they are **NOT backed up**. Deleting them is **permanent and unrecoverable**. State this out loud before any such delete.
2. **Default is keep — full stop.** Do not offer to delete an entire history dir, and never include it in a "clean everything" batch. If the dev didn't explicitly ask to reclaim history space, leave it untouched.
3. **Only ever offer age-scoped pruning, never wholesale.** If (and only if) the dev wants to reclaim space here, use the `span` to propose pruning **clearly old** entries by a concrete cutoff (e.g. "transcripts older than 6 months: 142 sessions, 1.2G, dated 2024-08 → 2025-01"). Show exact count, size, and date range. Keep everything recent.
4. **Each prune is its own confirmation.** One AskUserQuestion per dir, with the mandatory "What does this do?" button explaining what that history powers (see below). Never a single yes that wipes multiple history dirs.
5. **Move, don't `rm`, when feasible.** For a bounded prune, move the selected old entries into `$RP/removed/` and log them, so the dev has a window to recover before purging the restore point — even though the main snapshot doesn't cover history.
6. **Explain the real cost.** Deleting `projects/` breaks `claude --resume` / `--continue` for those sessions and removes the data `/insights` (step 9) learns from — so it degrades the very feature this skill uses to improve `CLAUDE.md`. `file-history/` loses per-session edit undo. Make the dev aware before they decide.

When in doubt about a history dir, **keep it** and say why. Reclaiming a few hundred MB is never worth silently destroying someone's conversation history.

---

## STEP 7: Files in the root (`~/.claude/`)

Same rule: **no hardcoded filename list.** Classify by traits.

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section rootFiles
```

Each file comes pre-classed; verify before acting:
- **`os-cruft-skip`** (`.DS_Store`, `Thumbs.db`) → **skip entirely.** Don't list it, don't ask — the OS recreates it instantly, so deleting wastes the dev's time. Ignore it everywhere it appears, in every step.
- **`stale-backup`** (`*.bak`, `*.old`, `*.backup*`, dated copies) → offer to delete, keeping the newest if it's a rolling backup.
- **`regenerable`** (`*-cache.json`, `*result*.json`, lockfile-style artifacts — including this skill's own insights cache) → offer to delete; they come back.
- **`session-history`** (`history.jsonl`) → the STEP 6 hard rules apply.
- **`config-keep`** (`CLAUDE.md`, `SOUL.md`, `settings*.json`) → keep; `CLAUDE.md`/`SOUL.md` are handled in steps 9–10.
- **`unknown`** → don't assume from the name. Inspect (`file`, `head`) and route through "What does this do?": explain, then ask.

---

## STEP 8: Global `.claude.json` (integrity pass)

Steps 4–5 already covered dead `mcpServers` and gone `projects`; this is the final integrity check of the file as a whole.

- Re-run the relevant sections if edits happened: `node "$SKILL_DIR/scripts/scan.mjs" --section mcps,projects` — anything still orphaned? Remove with confirmation.
- Validate: `node "$SKILL_DIR/scripts/validate-json.mjs" ~/.claude.json ~/.claude/settings.json` — a broken global config takes the whole install down, so never end this step on an unvalidated edit.
