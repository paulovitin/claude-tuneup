---
name: claude-tuneup
description: Audits the instructions a developer wrote for Claude Code — the rules in their global CLAUDE.md, their agent and skill descriptions, a legacy SOUL.md — and reclaims disk space in ~/.claude. Rewrites rules that should be judgment, flags instructions that fight the runtime, removes the same instruction repeated across layers, turns undocumented recurring workflows into skills, and migrates SOUL.md into auto-memory. Also frees space by removing unused skills/plugins/hooks/MCP servers and fixing config integrity. Every change is confirmed first and fully undoable ("claude-tuneup restore"). Complements the built-in /doctor, which it runs itself; it is not a replacement for it. Use when the user mentions claude-tuneup, asks to clean or slim down their Claude Code install, or wants their CLAUDE.md / rules / instructions reviewed. Não é para depuração de código; em português, responde a "limpar/otimizar o Claude Code".
---

# Claude Tuneup Skill

> **To be used as a checklist by an AI agent to guide the developer.**

## Goal

Audit what a developer has told Claude Code to do, and reclaim what their install is wasting.

Most of the cost in a Claude Code setup isn't disk — it's the instructions that load into every
single session: rules written for an older model, the same guidance copied across four files,
descriptions that route badly, a profile file that pays full price whether it's relevant or not.
This skill reads those, proposes changes one at a time, and never applies one without being told to.

**This is a complement to the built-in `/doctor`, not a replacement.** `/doctor` is the better tool
for taking inventory of an install and for a project's checked-in `CLAUDE.md`. So this skill runs it
first, works from its report, and spends its own effort on what's left over.

## Map of this skill (read only what you need)

This file holds the **routing, the UX contract, and the safety rules** — they apply to every group. The per-group playbooks live in `references/` and are loaded on demand. **Before running a group, read its reference file top to bottom; do not run a group from memory.** Don't read reference files for groups that aren't part of this run.

| Group | Steps | What it does | Playbook |
|-------|-------|--------------|----------|
| **cleanup** | 1–8, 19 | remove junk, fix config integrity | `"$SKILL_DIR"/references/cleanup.md` |
| **instructions** | 12–18 | audit the rules and descriptions that load every session | `"$SKILL_DIR"/references/instructions.md` |
| **claude.md** | 9 | the global `CLAUDE.md` + its AGENTS.md bridge | `"$SKILL_DIR"/references/claude-md.md` |
| **soul.md** | 10 | migrate a legacy `SOUL.md` into auto-memory, then retire it | `"$SKILL_DIR"/references/soul-md.md` |
| **summary** | 11 | always runs last; what changed + how to undo | below |

Steps are numbered by history, not by running order — see "Order of a full run" below.

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

The mechanical, repeatable work lives in `"$SKILL_DIR"/scripts/*.mjs` — plain Node (no deps), so it runs the same on macOS, Windows and Linux via the `node` that Claude Code already bundles. **Prefer these over ad-hoc inline shell** — never reach for `python3`, which is not guaranteed to exist; the agent's job is judgment (classify, ask, decide), the scripts' job is gather/apply.

- `node scripts/scan.mjs [--section a,b]` → read-only discovery of the install as JSON. Sections: `skills`, `plugins`, `hooks`, `mcps`, `projects`, `stateDirs`, `rootFiles`, `settings`, `usage`, `memory`. Run it **once per step with just that step's section** instead of re-scanning everything. Touches nothing.
- `node scripts/backup.mjs create` → make a restore point, print its path (`$RP`). Also `backup.mjs stash <RP> <path>` (move an item into the restore point, logged) and `backup.mjs log <RP> <msg>`.
- `node scripts/restore.mjs list` / `restore.mjs apply <RP> [--configs-only|--items-only]` → list restore points, or apply one (fully, or just configs / just removed items).
- `node scripts/doctor.mjs [--no-cache]` → run the built-in `/doctor` headless, **report-only**, and return its findings as JSON (cached 1h). Takes about 6 minutes on a real install.
- `node scripts/insights.mjs [--no-cache]` → run `/insights` headless and return the useful report sections as JSON (cached 1h).
- `node scripts/audit-instructions.mjs [--surfaces]` → extract instruction-line signals, or every resident `description`, as JSON. `--surfaces` covers skills, agents, slash commands, output styles and plugin-bundled components; each carries a `residency` label (`confirmed` / `inferred` / `none`) and totals are split by it. Detects only; never classifies.
- `node scripts/ledger.mjs <cmd>` → cross-run memory: `key`, `check`, `decide`, `record-run`, `trend`, `revert-run`. Stores paths, hashes and verdicts in `~/.claude-tuneup/ledger.json` — never the dev's instruction text.
- `node scripts/consolidate.mjs <name> [--undo]` → move a skill from `~/.claude/skills/` to `~/.agents/skills/` and link back (junction fallback on Windows).
- `node scripts/validate-json.mjs <file...>` → confirm a JSON file still parses (use after every config edit).
- `node scripts/version-check.mjs` → compares the shipped version against the latest GitHub release (cached 24h, fails silently offline). Prints `update:true` + a one-line `message` only when behind. Relay that line; otherwise say nothing.

`SKILL_DIR` is shown when the skill loads. Every script takes `--help`; run it rather than guessing at flags. Inline shell from the playbooks is the fallback when a script can't run.

---

## STEP 0: Pick what to run (start here)

The 19 steps form 5 named groups (see the map above). **With no argument, run all of them** — a tune-up is the default, and every individual change is still confirmed one at a time.

**Two token-cheap openers, in this order, before anything else.** Both are one line or silence; neither is ever blocking. Skip both on `help`.

1. `node "$SKILL_DIR/scripts/version-check.mjs"` — if it returns `update:true`, relay its one-line `message`. On `update:false` or `ok:false`, say nothing about versions.
2. `node "$SKILL_DIR/scripts/ledger.mjs" trend` — if `message` is non-null, open with it (*"resident context is up ~380 tokens since the last tune-up"*). On `firstRun` or a null `message`, say nothing.

**Don't re-ask what the dev already settled.** Before any step asks about an item, build its key and look it up:

```bash
K=$(node "$SKILL_DIR/scripts/ledger.mjs" key <kind> <path> "<the exact text>" | ...)
node "$SKILL_DIR/scripts/ledger.mjs" check "$K" ...
```

Anything in `declined` is something the dev already told you to keep — **collapse the whole set into one line** (*"3 items you asked me to keep last time"*) rather than asking again, and never drop them silently. Keys are content-addressed, so a rule the dev has since rewritten reopens on its own. `--all` overrides the filter.

Routing:
- **`help` / `?`** → print the help card below and **stop** (run nothing):

  ```
  claude-tuneup — audit your Claude Code instructions + reclaim disk (undoable; asks first)

  Runs the built-in /doctor first and works from its report.
  A complement to it, not a replacement.

  Groups:
    cleanup       steps 1–8,19 remove junk + fix config integrity
    instructions  steps 12–18  audit the rules + descriptions that load every session
    claude.md     step  9      the global CLAUDE.md + its AGENTS.md bridge
    soul.md       step 10      migrate a legacy SOUL.md into auto-memory, then retire it
    summary       step 11      always runs last; shows what changed + how to undo

  How to trigger:
    claude-tuneup                    → runs everything
    claude-tuneup cleanup            → run a group by name
    claude-tuneup instructions       → (cleanup | instructions | claude.md | soul.md | summary)
    claude-tuneup 1-3                → run a step range
    claude-tuneup 6,7                → run specific steps
    claude-tuneup claude.md soul.md  → combine groups
    claude-tuneup restore            → undo a previous run from a backup
    claude-tuneup --dry-run          → scan + report what would change, touch nothing
    claude-tuneup --all              → also re-ask everything you kept in earlier runs
    claude-tuneup help               → show this card

  A full run waits ~6 min on /doctor up front, and asks before spending another 6 to verify.

  Backups: every run snapshots configs + moved items to ~/.claude-tuneup/backups/<run-id>/.
  Undo anytime with "claude-tuneup restore".
  ```
- **`restore`** → undo a previous run, even in a later session. Do NOT run any cleanup step:
  1. List restore points: `node "$SKILL_DIR/scripts/restore.mjs" list` (timestamp, how many items removed, log size).
  2. Ask (AskUserQuestion, with the mandatory "What does this do?" button) which restore point to use.
  3. Ask the **scope**: "Full restore" / "Configs only" / "Removed items only" (plus the explain button). Configs-only is the safe pick when the dev just wants a botched `CLAUDE.md`/`.claude.json` edit undone; items-only brings back deleted skills/dirs without touching configs.
  4. **Warn before applying.** A restore copies *old* configs back over the current ones. `.claude.json` carries live state (projects, session pointers) — so restoring it can drop projects/sessions created **after** the backup. Say this explicitly and confirm. The script protects you two ways: it first saves the **current** configs into a `pre-restore-…` folder (so the restore is itself reversible), and it never overwrites a newer item that re-took a removed path (those land at `<path>.restored-<ts>` instead).
  5. Apply: `node "$SKILL_DIR/scripts/restore.mjs" apply <RP> [--configs-only|--items-only]` — prints `restored`, `collisions` (items that couldn't take their original path and where they went), `preRestoreSnapshot` (the pre-restore safety copy, when configs were restored), and `manualReAdd` (marketplaces/plugins for you to replay).
  6. Validate restored JSON: `node "$SKILL_DIR/scripts/validate-json.mjs" ~/.claude.json ~/.claude/settings.json`. Report `collisions` to the dev so they resolve any `.restored-<ts>` items by hand. Offer to keep or purge the restore point + the pre-restore snapshot afterward.
  7. Retire that run's decisions: `node "$SKILL_DIR/scripts/ledger.mjs" revert-run <run-id>`. Undoing a run un-decides it — leaving the verdicts in place would keep suppressing questions about changes that no longer exist. The ledger itself survives (it lives beside the backups, not inside them), so every *other* run's decisions stand.
- **`--dry-run`** → run every read-only step in **report mode**: scan, show what would be removed/consolidated/changed, include sizes, but **ask zero delete questions** and touch nothing — and that includes STEP 0.5: a dry run changes nothing, so do **NOT** create a restore point (it would only litter `~/.claude-tuneup/backups/` with empty entries). Skip stash/move/rm entirely. STEP 0.6 still makes its opening calls (they only read); the closing `/doctor` pass never runs. Report "DRY RUN — nothing was changed" in the summary. A dry run also records **nothing** in the ledger — no `decide`, no `record-run` — though it still reads `trend` and `check`, so its report reflects what you'd actually be asked. **This is the best first contact with the tool** — suggest it to anyone running claude-tuneup for the first time.
- **`--all`** (aliases: `reset`, "review everything again") → run normally but **ignore the ledger's `declined` list**, re-asking items the dev kept in earlier runs. Nothing else changes; decisions from this run are still recorded. Offer it whenever the collapsed "N items you asked me to keep" line is what the dev seems to be asking about.
- **Argument given** (a group/steps) → run exactly that. Accept group names (`cleanup`, `instructions`, `claude.md`, `soul.md`, `summary`), step numbers, or ranges (`1-3`, `step 5`, `6,7`, `12-17`). Then run STEP 11. Be lenient on aliases (`audit`/`rules` → `instructions`, `insights` → `instructions`, `soul` → `soul.md`).
- **No argument** → **run everything.** Don't offer a menu; a bare `claude-tuneup` means the full tune-up. Say what's about to happen, including the `/doctor` wait, then start. Nothing is deleted or edited without its own confirmation, so a full run is safe by construction.

Always finish a run with STEP 11 (summary) scoped to whatever ran. Announce each step as you enter it. Once the run's groups are decided, read the matching `references/*.md` playbook(s) before starting.

### Order of a full run

Diagnose → subtract → reorganize → add. Step numbers are historical; **this is the running order**:

| Order | Steps | |
|---|---|---|
| 1 | 0, 0.5 | routing, version nudge, regrowth trend, restore point |
| 2 | 0.6 | `/doctor` **and** `/insights`, both headless, both fired here |
| 3 | 1–8, 19 | cleanup — disk, integrity, dead config, `settings.json` semantics |
| 4 | 12, 13, 14 | subtract: rules→judgment, harness conflicts, cross-layer duplication |
| 5 | 9, 15, 16, 18 | reorganize: global file + AGENTS.md bridge, descriptions, restructure, inert surfaces |
| 6 | 10 | `SOUL.md` retirement |
| 7 | 17 | add: skills for workflows nobody wrote down |
| 8 | 11 | summary, optionally preceded by a second `/doctor` pass |

Only step 17 adds anything, and it adds in the lazily-loaded direction. That is the point.

---

### STEP 0.5: Restore point (before ANY change)

A tune-up must be undoable. Before the first **mutation** of the run (not on dry runs), create a restore point and log every action into it.

Backups live in a **stable location outside the skill** — `~/.claude-tuneup/backups/<run-id>/` (override with `$CLAUDE_TUNEUP_STATE`). This is on purpose: a skill update, reinstall, or move between `~/.claude/skills` and `~/.agents/skills` must **not** take the undo history with it. Snapshots are chmod-restricted (owner-only) because `.claude.json` can carry tokens. `restore` still scans the legacy in-skill `.backups/` too, so older restore points keep working.

```bash
RP=$(node "$SKILL_DIR/scripts/backup.mjs" create)   # snapshots configs, prints the restore-point path
```

`backup.mjs create` snapshots the small irreplaceable config files (`.claude.json`, `settings*.json`, `CLAUDE.md`, `SOUL.md`), seeds `actions.log` + `removed.json`, and names the restore point with a collision-proof run id (so two runs in the same second never clobber each other).

Deletion policy:
- **Unique / irreplaceable** (real skills, project data, configs, anything the dev can't easily regenerate) → `node "$SKILL_DIR/scripts/backup.mjs" stash "$RP" <path>` (moves it into the restore point, logged + restorable), never `rm`.
- **Self-regenerating artifacts** (venvs, plugin caches) → hard `rm` is fine; they rebuild. OS cruft (`.DS_Store`, `Thumbs.db`) → skip entirely.
- **Marketplace / plugin removals** → can't move; record the re-add command: `node "$SKILL_DIR/scripts/backup.mjs" log "$RP" "marketplace removed: <name> (re-add: claude plugin marketplace add <url>)"`.
- Config edits are covered by the snapshot above.

Tell the dev the restore point exists and how to undo (see STEP 11). Only ONE restore point per run; if a step is skipped, the snapshot is still valid.

---

### STEP 0.6: Diagnose first — `/doctor` and `/insights`

Both are Claude Code's own built-ins, both run headless, and **both are fired here, at the start.**

```bash
node "$SKILL_DIR/scripts/doctor.mjs"     # ~6 minutes; report-only, changes nothing
node "$SKILL_DIR/scripts/insights.mjs"   # reads the dev's sessions
```

**Tell the dev the wait is coming, with the real number** — *"the built-in checkup takes about six
minutes"* — never a vague "one moment". Then start both; they don't depend on each other.

**Why `/insights` fires here even though step 17 is the last step to use it.** Its result is cached
for an hour, so the call and the consumption don't have to happen at the same moment. Running it now
also means it reads the session history **before** cleanup step 6 offers to prune it — otherwise the
run would degrade its own evidence and never notice.

**Why `/doctor` runs at all.** It sees things this skill's scan structurally cannot: real per-component
usage counts across every project, resident-token estimates, and connectors that cost context without
ever being called. Steps 1, 2 and 4 read its verdicts instead of guessing. It is also the right tool
for a project's checked-in `CLAUDE.md`, which is why step 9 hands that work to it by name.

**Report-only is enforced.** `doctor.mjs` always appends an instruction telling `/doctor` to report and
apply nothing — a test asserts this — because a headless run has no confirmation prompts to stop it.
Never call `claude -p "/doctor"` by hand from this skill; go through the script.

**Both are optional by design.** Either can return `{ ok: false, reason }` — no session history, no
`claude` on PATH, a timeout. Say so in one line and **continue the run without it.** A tune-up must
never depend on either succeeding.

---

## Main flow

1. STEP 0 routing decided which groups run; STEP 0.5 made the restore point; STEP 0.6 gathered evidence.
2. For each selected group, **read its playbook** (`references/cleanup.md`, `references/instructions.md`, `references/claude-md.md`, `references/soul-md.md`) and execute its steps, following the running order above and announcing each step.
3. Finish with STEP 11 below.

---

### STEP 11: Final summary

#### The optional verification pass

Before writing the summary, offer a second `/doctor` run — and **state the cost out loud**: *"want me
to check the result? it takes about 6 minutes."*

```bash
node "$SKILL_DIR/scripts/doctor.mjs" --no-cache
```

Recommend it when the run made substantial changes; **skip it silently when the run changed nothing**,
and never run it on a dry run. If the dev accepts, build the summary from the **difference** between
the two reports — before/after resident context, and whether every edit survived (`/doctor` re-parses
every settings file and re-validates agent frontmatter, so a config this run broke surfaces here,
while the restore point is still on disk).

**The trap, and the hard rule.** A skill created ten minutes ago has zero usage, and `/doctor` reads
zero usage as grounds for removal — so the closing pass will confidently propose deleting the skills
this run just helped the dev build. **Never surface a removal proposal for anything this run created,
whatever the report says.** Keep the list of names from steps 16 and 17 and filter against it. Also
pass those names to `/doctor` so it knows they're new — but that is the courtesy, not the safeguard;
the filter is the safeguard.

#### The report

Report total size after cleanup (`du -sh ~/.claude/` or sum the scan sizes), removed items (with sizes), skills consolidated in `~/.agents/skills/`, links created, and pending suggestions.

For an `instructions` run, report what actually matters to the dev: **resident tokens before and
after**, rules rewritten, conflicts found (and any they chose to keep — say so plainly, they made a
call), duplicates removed, descriptions rewritten, skills created, and whether `SOUL.md` was migrated.

**How to undo** — always show this, pointing at the run's restore point `$RP` (`~/.claude-tuneup/backups/<run-id>/`):
- Restore everything, or selectively: `node "$SKILL_DIR/scripts/restore.mjs" apply $RP [--configs-only|--items-only]`.
- Recover a single removed item by hand: it's in `$RP/removed/` — move it back.
- Re-add a marketplace/plugin: see the exact command in `$RP/actions.log`.
- Self-regenerating artifacts (venvs/caches) weren't backed up — they rebuild on next use.

**Write the run down.** So the next tune-up is quiet where it should be:

```bash
node "$SKILL_DIR/scripts/ledger.mjs" decide "$KEY" <keep|applied|deleted> --run <run-id>   # per decision
node "$SKILL_DIR/scripts/ledger.mjs" record-run --groups <groups> --changes <n> --id <run-id>
```

Record **every** decision, including the keeps — a keep is the one that saves the dev from being asked twice. Use the restore point's run id so `restore` can revert the decisions along with the files. Skip both on a dry run; there is nothing to remember.

Then, via AskUserQuestion, ask if the result looks good:
- **"Looks good — purge restore point"** → `rm -rf $RP` (frees the space held by removed items).
- **"Keep backup for now"** → leave `$RP`; mention old restore points under `~/.claude-tuneup/backups/` can be pruned later.
- **"Undo everything"** → `node "$SKILL_DIR/scripts/restore.mjs" apply $RP`, then replay re-add commands from `actions.log`.

---

## Rules

1. **NEVER delete without explicit confirmation** from the dev
2. Always show size and a summarized content before asking
3. Advance step by step in the running order above. Skipping ahead is how a step ends up deciding on evidence a later step was going to gather
4. When editing JSON (`.claude.json`, `settings.json`), validate after every edit with `node "$SKILL_DIR/scripts/validate-json.mjs" <file>` (never assume `python3` exists). Back up the file first if it isn't already in the restore-point snapshot.
5. Before deleting a directory, confirm it isn't a symlink to something important
6. **All decisions via AskUserQuestion buttons** — never free-text y/n. **EVERY question must include a "What does this do?" button** (no exceptions, even an obvious-looking delete); picking it inspects + explains that item, then re-asks. See "How to ask the dev".
7. **Size beats labels** — a directory's name tells you nothing about what's in it. The big finds are usually inside something that sounds internal, so measure rather than assume; **≥ 50M is the threshold worth drilling into**, and it is load-bearing — it's what surfaces bundled runtimes and venvs
8. **Verify deletes stuck** — re-measure after deleting big artifacts; if it regenerated, the real fix is disabling the owning plugin
9. **Memory files stay lean** — `CLAUDE.md`, `AGENTS.md`, `SOUL.md`. They load into every session, so every line is a permanent tax and must earn it by changing behavior. **The working budget is ~200 lines / ~1500 tokens**, and **imports count toward it** — in an AGENTS.md shim setup it covers the *combined* total (`memory` scan's `combinedApproxTokens`), not each file separately. Over budget, trim before adding. This is the one statement of the budget in this skill; the playbooks point here rather than restating it
10. **Trust scan flags over assumptions** — if `plugins.listingReliable` is `false`, never propose uninstalls based on the listing; if an MCP's `transport` is `remote`, never touch it as a local file.
