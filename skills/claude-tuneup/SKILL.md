---
name: claude-tuneup
description: Tune up a Claude Code installation, in selectable named groups — "cleanup" (skills, plugins, hooks, MCPs, projects, state dirs, root files, global config), "claude.md" (improve CLAUDE.md from real usage via /insights), "soul.md" (build a SOUL.md profile of the human), and "summary". Runs everything or just a chosen group/steps (pass a group name like "cleanup"/"claude.md"/"soul.md", or a step range like "1-3"); "help" lists the groups; "restore" undoes a previous run from a backup; asks first if no argument. Reviews each item step by step, reports size/content, asks before deleting anything. Every run backs up configs and removed items so changes are undoable.
---

# Claude Tuneup Skill

> **To be used as a checklist by an AI agent to guide the developer.**

## Goal

Tune up a Claude Code installation in two halves: (1) **clean + optimize** the install — analyze each item, report size/content/status, ask the dev "delete or keep?", proceed step by step, never delete without explicit confirmation; then (2) **give it a soul** — propose a `SOUL.md` profile of the human so Claude knows who it's talking to. Cleanup removes the junk; SOUL adds the identity.

---

## How to ask the dev (MANDATORY)

Every delete/keep choice MUST be offered through the **AskUserQuestion** tool (clickable buttons) — never a free-text "y/n" or numbered list. Free-text prompts confuse the dev.

- One button option per concrete action, with size in the label (e.g. "Delete (frees 269M)").
- Batch related decisions from the same step into a single multi-question AskUserQuestion call instead of asking one by one.
- When listing candidates, show the **full path + size** for each so "which ones?" never needs a follow-up.

**"What does this do?" option (MANDATORY on EVERY question).** Every single AskUserQuestion in this skill must include one extra button worded simply — e.g. **"O que isso faz? / Explain first"** — no exceptions, whatever the decision is about (a file, dir, plugin, skill, agent, MCP, config key, anything). If the dev picks it:
1. Explain *that specific thing* in 1–3 plain lines — what it is, why it's there, what deleting/keeping it actually means. For a plugin/skill/agent/MCP, read its real source first (`SKILL.md`, `plugin.json`/`README`, agent frontmatter, MCP command). For an unknown file/dir, inspect it (`file`, `head`, `ls`, `du`) before explaining.
2. Then ask again whether they now have enough to decide — re-offer the original buttons **plus the explain button again** (they may want another item explained first).

Never make the dev decide on something they can't identify.

---

## Helper scripts (deterministic, cross-OS)

The mechanical, repeatable work lives in `"$SKILL_DIR"/scripts/*.mjs` — plain Node (no deps), so it runs the same on macOS, Windows and Linux via the `node` that Claude Code already bundles. **Prefer these over ad-hoc inline shell**; the agent's job is judgment (classify, ask, decide), the scripts' job is gather/apply.

- `node scripts/scan.mjs` → read-only discovery of the whole install as JSON (skills, plugins, marketplaces, hooks, MCPs, projects, state dirs, root files). Touches nothing.
- `node scripts/backup.mjs create` → make a restore point, print its path (`$RP`). Also `backup.mjs stash <RP> <path>` (move an item into the restore point, logged) and `backup.mjs log <RP> <msg>`.
- `node scripts/restore.mjs list` / `restore.mjs apply <RP>` → list or apply a restore point.
- `node scripts/insights.mjs` → run `/insights` headless and return the useful report sections as JSON.

`SKILL_DIR` is shown when the skill loads. Inline shell from the steps below is the fallback when a script can't run.

---

## STEP 0: Pick what to run (start here)

Don't assume the dev wants the whole thing. The 11 steps form 4 named groups:

| Group | Steps | What it does |
|-------|-------|--------------|
| **cleanup** | 1–8 | Remove junk + fix config integrity: skills, plugins, hooks, MCPs, projects, state dirs, root files, global `.claude.json` |
| **claude.md** | 9 | Improve `CLAUDE.md`, grounded in real usage via `/insights` |
| **soul.md** | 10 | Interview the dev and build a `SOUL.md` (their profile) |
| **summary** | 11 | Final report of what changed (always runs last) |

Routing:
- **`help` / `?`** → print the help card below and **stop** (run nothing):

  ```
  claude-tuneup — tune up your Claude Code install (undoable; asks before deleting)

  Groups:
    cleanup    steps 1–8   remove junk + fix config integrity
    claude.md  step  9      improve CLAUDE.md from real usage via /insights
    soul.md    step 10      interview you + build a SOUL.md profile
    summary    step 11      always runs last; shows what changed + how to undo

  How to trigger:
    claude-tuneup                 → asks which group to run
    claude-tuneup cleanup         → run a group by name
    claude-tuneup soul.md         → (cleanup | claude.md | soul.md | summary)
    claude-tuneup 1-3             → run a step range
    claude-tuneup 6,7             → run specific steps
    claude-tuneup claude.md soul.md → combine groups
    claude-tuneup restore         → undo a previous run from a backup
    claude-tuneup help            → show this card

  Backups: every run snapshots configs + moved items to <skill dir>/.backups/<ts>/.
  Undo anytime with "claude-tuneup restore".
  ```
- **`restore`** → undo a previous run, even in a later session. Do NOT run any cleanup step:
  1. List restore points: `node "$SKILL_DIR/scripts/restore.mjs" list` (timestamp, how many items removed, log size).
  2. Ask (AskUserQuestion, with the mandatory "What does this do?" button) which restore point to use.
  3. Apply: `node "$SKILL_DIR/scripts/restore.mjs" apply <RP>` — copies snapshotted configs back, moves removed items to their original paths, and prints any manual re-add commands (marketplaces/plugins) for you to replay.
  4. Confirm what was restored; offer to keep or purge the restore point afterward.
- **Argument given** (a group/steps) → run exactly that. Accept group names (`cleanup`, `claude.md`, `soul.md`, `summary`), step numbers, or ranges (`1-3`, `step 5`, `6,7`). Then run STEP 11. Be lenient on aliases (`insights` → `claude.md`, `soul` → `soul.md`).
- **No argument** → offer the choice via AskUserQuestion before touching anything: options = "Full tune-up (1–11)", "Cleanup only (1–8)", "CLAUDE.md from /insights (9)", "Build SOUL.md (10)". Let them pick one (multiSelect ok for combining claude.md + soul.md).

Always finish a run with STEP 11 (summary) scoped to whatever ran. Announce each step as you enter it.

---

### STEP 0.5: Restore point (before ANY change)

A tune-up must be undoable. Before the first mutation of the run, create a timestamped restore point **inside this skill's own directory** and log every action into it.

`SKILL_DIR` = the base directory of this skill (shown when the skill loads, e.g. `~/.agents/skills/claude-tuneup`). All backups live under `$SKILL_DIR/.backups/<ts>/` — self-contained, travels with the skill, nothing scattered across `~/.claude`.

```bash
RP=$(node "$SKILL_DIR/scripts/backup.mjs" create)   # snapshots configs, prints the restore-point path
```

`backup.mjs create` snapshots the small irreplaceable config files (`.claude.json`, `settings*.json`, `CLAUDE.md`, `SOUL.md`), seeds `actions.log` + `removed.json`, and ensures `.backups/` is git-ignored so backups never leak when the skill is shared.

Deletion policy:
- **Unique / irreplaceable** (real skills, project data, configs, anything the dev can't easily regenerate) → `node "$SKILL_DIR/scripts/backup.mjs" stash "$RP" <path>` (moves it into the restore point, logged + restorable), never `rm`.
- **Self-regenerating artifacts** (venvs, plugin caches) → hard `rm` is fine; they rebuild. OS cruft (`.DS_Store`, `Thumbs.db`) → skip entirely (see STEP 7).
- **Marketplace / plugin removals** → can't move; record the re-add command: `node "$SKILL_DIR/scripts/backup.mjs" log "$RP" "marketplace removed: <name> (re-add: claude plugin marketplace add <url>)"`.
- Config edits are covered by the snapshot above.

Tell the dev the restore point exists and how to undo (see STEP 11). Only ONE restore point per run; if a step is skipped, the snapshot is still valid.

---

## Main Flow

Run the selected steps in order, announcing the current step before starting.

---

### STEP 1: Skills (`~/.claude/skills/`)

```
ls -la ~/.claude/skills/
```

For each item, check:
- Is it a symlink? Where does it point? Does the target exist?
- Is it a real directory? What size? (`du -sh`)
- **Skill** or **plugin**? (plugins live in `~/.claude/plugins/`, skills in `~/.agents/skills/`)

Possible actions per item:
- **Broken symlink**: delete
- **Real skill**: ask if it's used. If yes → move to `~/.agents/skills/` + create a symlink back. If no → delete.
- **Plugin wrongly in skills/**: delete (plugin already lives in plugins/)
- Already a valid symlink → ✅ OK

---

### STEP 2: Plugins (`~/.claude/plugins/`)

```
ls -la ~/.claude/plugins/
du -sh ~/.claude/plugins/
```

- List installed plugins (`installed_plugins.json`)
- List marketplaces (`known_marketplaces.json`)
- Check `blocklist.json`
- For each plugin in the directory, check if it's in `installed_plugins.json`
- Plugins with a directory but not listed → ask whether to uninstall
- Broken symlinks → delete

**Uninstall plugin** (NEVER without confirmation):
```
claude mcp uninstall <name>
```
Then check whether the directory is gone. If not, delete it manually.

---

### STEP 3: Hooks (`~/.claude/hooks/` and `settings.json`)

```bash
ls -la ~/.claude/hooks/
cat ~/.claude/settings.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('hooks',{}), indent=2))"
```

- List each hook on disk vs hooks in settings.json
- Hooks on disk but NOT in settings.json: orphans. Ask whether to delete.
- Hooks in settings.json but NOT on disk: dead entries. Ask whether to remove from the JSON.
- Active hooks (disk + settings.json): show what they do (read the file header). Ask whether to keep.

---

### STEP 4: MCPs (`.claude.json` and `settings.json`)

```bash
cat ~/.claude.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('mcpServers',{}), indent=2))"
cat ~/.claude/settings.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('mcpServers',{}), indent=2))"
```

- List global MCPs (`.claude.json`) and per-project ones (`settings.json`)
- Flag cloud MCPs (Gmail, Google Drive, Google Calendar, Windsor.ai) — managed via the claude.ai web app, do NOT touch them locally
- For each local MCP: check whether the server directory exists, whether it's running, last use
- MCPs with a missing directory → ask whether to remove the entry
- MCPs disabled in projects → ask whether to remove
- **Warning**: MCPs with plaintext credentials (e.g. API key in `.claude.json`) → alert immediately

---

### STEP 5: Projects in `.claude.json`

```bash
cat ~/.claude.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('projects',{}), indent=2))"
```

- For each project: check whether the project directory still exists
- Deleted projects → ask whether to remove the entry
- Active projects → check whether the inner `mcpServers` or `mcpConfig` has dead servers

---

### STEP 6: State directories (`~/.claude/`)

**Do NOT work from a fixed list of directory names — you don't know what you'll find.** Installs differ and change across versions. Discover what's actually there, then classify each by traits, not by a hardcoded name.

Get the discovery as JSON (the `stateDirs` array already flags `empty` and `big` per dir):

```bash
node "$SKILL_DIR/scripts/scan.mjs"
```

Fallback if the script can't run:

```bash
ls -la ~/.claude/
du -sh ~/.claude/*/ 2>/dev/null | sort -rh
```

Skip dirs already handled by earlier steps of this run (skills/plugins/hooks). For every *other* directory, gather signals and classify:

- **Empty** (`[ -z "$(ls -A <dir>)" ]`) → offer to delete.
- **Big (≥ 50M)** → drill in (`du -sh <dir>/* | sort -rh`) and surface the large children. **Size beats labels** — the biggest win is often inside a dir that *sounds* internal (e.g. a bundled venv/runtime). Never skip a dir just because its name sounds important.
- **Looks regenerable** (cache/tmp/venv/build/log signatures, or content that's clearly derived) → offer to delete, but warn it may **self-regenerate**: venvs, plugin caches and downloaded runtimes get rebuilt on next use, so deleting reclaims nothing lasting. After deleting a big artifact, re-`du` to confirm it stayed gone; if it came back, the real reclaim is **uninstall/disable the owning plugin** — offer that instead.
- **Looks like history/state you can't recreate** (sessions, transcripts, file history) → default to keep; only offer pruning of clearly old entries.
- **Unknown / can't classify** → do NOT guess. Inspect it (`ls`, `du`, `file`, peek at a sample file) and route through the "What does this do?" flow: explain what you found, then ask.

Every prompt here goes through AskUserQuestion with the mandatory "What does this do?" button.

---

### STEP 7: Files in the root (`~/.claude/`)

Same rule: **no hardcoded filename list.** List what's actually present and classify by traits.

```bash
ls -la ~/.claude/ | grep -v '^d' | grep -v '^total'
```

For each file:
- **OS cruft that regenerates** (`.DS_Store`, `Thumbs.db`) → **skip entirely.** Don't list it, don't ask — macOS/Windows recreate it instantly, so deleting wastes the dev's time. Ignore it everywhere it appears, in every step.
- **Stale backups** (`*.bak`, `*.old`, `*.backup*`, dated copies) → offer to delete, keeping the newest if it's a rolling backup.
- **Regenerable caches / result files** (`*-cache.json`, `*result*.json`, lockfile-style artifacts) → offer to delete; they come back.
- **Files this skill edits or that hold real config** (`CLAUDE.md`, `SOUL.md`, `settings*.json`, the global `.claude.json`) → keep; `CLAUDE.md`/`SOUL.md` are handled in steps 9–10.
- **Unknown** → don't assume from the name. Inspect (`file`, `head`) and route through "What does this do?": explain, then ask.

---

### STEP 8: Global `.claude.json`

```bash
cat ~/.claude.json | python3 -m json.tool
```

- Review `mcpServers` — any dead?
- Review `projects` — any deleted project?
- Remove orphan entries with confirmation

---

### STEP 9: Improve `CLAUDE.md` (grounded in real usage via `/insights`)

Offer to the dev: "Want me to review and improve CLAUDE.md?"

Claude Code ships a built-in **`/insights`** command that analyzes the dev's own sessions and writes a usage report (HTML) — including a ready-made **"Suggested CLAUDE.md Additions"** section. A skill can't type a slash command into the TUI, but it CAN run `/insights` **headlessly** with `claude -p` (no browser opens; it just prints the report path) and read the HTML.

**Privacy / generic-skill rule:** the report is the dev's own data, generated locally on their machine. Never paste report contents into this skill or anywhere shared — read it live, with the dev, only to drive the suggestions below. Skip anything that looks like a secret, token, or private path.

Run it headless and get the sections as JSON (no browser; costs one model call; needs prior session history):

```bash
node "$SKILL_DIR/scripts/insights.mjs"
```

It returns `{ ok, report, sections: { suggestedClaudeMd, whatYouWorkOn, howYouUse, friction } }`, or `{ ok:false, reason }` when there's no history / `claude -p` is unavailable. Use the report's "Suggested CLAUDE.md Additions" as the spine of your proposal; cross-reference "What You Work On" / friction for domain and pain points.

**Fallback** (no session history yet, or `claude -p` unavailable) — mine usage counters directly:

```bash
cat ~/.claude.json | python3 -c "
import sys,json,datetime
d=json.load(sys.stdin)
def top(x,n=12):
    items=[(k,v.get('usageCount',0),v.get('lastUsedAt',0)) for k,v in x.items()]
    items.sort(key=lambda t:t[1],reverse=True); return items[:n]
def fmt(ts): return datetime.date.fromtimestamp(ts/1000).isoformat() if ts else '?'
for label,key in [('SKILLS','skillUsage'),('TOOLS','toolUsage')]:
    print('===',label,'==='); [print(f'{c:>4}  last {fmt(ts)}  {k}') for k,c,ts in top(d.get(key,{}))]
"
```
- Stale heavy hitters (high count, old `lastUsedAt`, no current install) → mention as history, don't add as a preference.

Then:
- Read `~/.claude/CLAUDE.md`
- Propose additions grounded in the report/scan: code preferences, favorite tools/workflows, recurring domains, recurring friction worth a guardrail
- Ask (AskUserQuestion buttons) which to add/remove
- Apply changes
- Note: `/insights` reports accumulate in `~/.claude/usage-data/` — offer to prune old ones (ties back to STEP 6).

---

### STEP 10: Propose a `SOUL.md` (give the install a soul)

Cleanup removes junk; this step adds identity. `SOUL.md` is a stable profile of the **human** — who they are, how they want to be talked to — so Claude knows who it's serving on every session.

**First, explain the value to the dev** (plain language), then offer to build one via AskUserQuestion (Yes / Not now):

> Cleaning Claude is half the job — the other half is Claude knowing *who it's talking to*. A `SOUL.md` is your profile: tone, how much autonomy you give, pet peeves, default stack, what "done" means to you. It loads every session via `@SOUL.md` and makes every answer fit you instead of a generic dev. It's the **soul** to the install's clean body.

`SOUL.md` vs the other files:
- `CLAUDE.md` = **how** to work (operational rules, per project).
- `SOUL.md` = **who** the human is (stable identity — tone, autonomy, peeves, stack, definition of done).
- Keep churny state (active projects, current tasks) OUT of SOUL — it goes stale. Put it in memory / an MCP instead.

If the dev says yes, **interview them with AskUserQuestion buttons** (their preferred input). Cover these axes, ~3 questions per round, options + free-text "Other":
1. **Role** — what they do (sets the tone).
2. **Communication** — language, verbosity, how much jargon, learning style (analogy-first vs trade-offs vs examples).
3. **Pet peeves** — what to always avoid (preamble, assuming, sycophancy, over-engineering…).
4. **On disagreement** — push back hard / point out + alternative / obey-but-warn.
5. **Autonomy** — how far to run before checking in; clarify it means executing the agreed plan, not inventing scope.
6. **Default stack** — languages/frameworks to suggest first.
7. **Definition of done** — what makes them trust a delivery (ran it / tested+verified / clean+explained).
8. **Tone** — dry/blunt vs light vs neutral.

Then:
- Write `~/.claude/SOUL.md` from the answers — tight, only facts that change how the agent acts.
- Wire it: add `@SOUL.md` to the top of `~/.claude/CLAUDE.md` so it loads each session (it is NOT auto-loaded otherwise).
- Read it back and offer to adjust. Stop when more questions would only add bloat — say so honestly.

---

### STEP 11: Final summary

```
du -sh ~/.claude/
```

Report:
- Total size after cleanup
- Removed items (with sizes)
- Skills consolidated in `~/.agents/skills/`
- Symlinks created
- `SOUL.md` created + wired (if the dev opted in)
- Pending suggestions

**How to undo** — always show this, pointing at the run's restore point `$RP` (`$SKILL_DIR/.backups/<ts>/`):
- Restore a config: `cp $RP/<file> ~/.claude/` (or `~/` for `.claude.json`).
- Recover a removed item: it's in `$RP/removed/` — move it back.
- Re-add a marketplace/plugin: see the exact command in `$RP/actions.log`.
- Self-regenerating artifacts (venvs/caches) weren't backed up — they rebuild on next use.

Then, via AskUserQuestion, ask if the result looks good:
- **"Looks good — purge restore point"** → `rm -rf $RP` (frees the space held by removed items).
- **"Keep backup for now"** → leave `$RP`; mention old restore points under `$SKILL_DIR/.backups/` can be pruned later.
- **"Undo everything"** → restore configs from `$RP`, move all of `$RP/removed/` back, replay re-add commands from `actions.log`.

---

## Rules

1. **NEVER delete without explicit confirmation** from the dev
2. Always show size and a summarized content before asking
3. Advance step by step, don't skip
4. When editing JSON (`.claude.json`, `settings.json`), use `python3 -m json.tool` before and after to validate. Back up the file first (e.g. `cp ~/.claude.json ~/.claude.json.bak-cleanup`).
5. Before deleting a directory, confirm it isn't a symlink to something important
6. **All decisions via AskUserQuestion buttons** — never free-text y/n. **EVERY question must include a "What does this do?" button** (no exceptions, even an obvious-looking delete); picking it inspects + explains that item, then re-asks. See "How to ask the dev".
7. **Size beats labels** — measure everything, drill into any dir ≥ 50M even if marked "internal/keep"
8. **Verify deletes stuck** — re-`du` after deleting big artifacts; if it regenerated, the real fix is disabling the owning plugin
