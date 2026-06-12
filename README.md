<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Your `~/.claude` is a junk drawer. This cleans it — and gives it a soul.

A guided, **fully undoable** tune-up an AI agent runs *with* you.<br/>
Every change is a button. Every button has a *"What does this do?"*. Every run can be rolled back.

<br/>

[![Install](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](#-license)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)
[![pt-BR](https://img.shields.io/badge/README-pt--BR-30A3DC?style=for-the-badge)](README.pt-BR.md)

</div>

---

Months of Claude Code use leave a trail: dead symlinks, orphaned hooks, MCP entries pointing nowhere, marketplaces nothing uses anymore, plugin caches quietly eating **gigabytes** — and a `CLAUDE.md` that's either empty or a 400-line token tax you pay on *every single session*.

You could spelunk through `~/.claude` by hand. Or you could say one word and have an agent walk you through it, item by item, explaining anything you don't recognize **before** you decide:

```text
> claude-tuneup

🧹 STEP 2: Plugins — 1.2G total

   marketplaces/old-experiments (412M) — no installed plugin uses it

   [ Remove (frees 412M) ]   [ Keep ]   [ What does this do? ]
```

That's the whole experience. No flags to memorize, no "wait, what did it just delete?" — and if you ever regret anything, `claude-tuneup restore` puts it back.

## ⚡ Install

```bash
npx skills add paulovitin/claude-tuneup
```

Then, in Claude Code:

```bash
claude-tuneup            # asks which group to run
```

First time? Start with `claude-tuneup --dry-run` — it shows everything it *would* do and touches nothing.

**Updating.** Re-run `npx skills add paulovitin/claude-tuneup` to pull the latest version — it runs in your shell, so it costs zero model tokens. The skill also nudges you (once, cached for a day) when a newer release exists, so you'll know when it's worth re-running.

---

## 🎛️ Usage

```bash
claude-tuneup                    # asks which group to run
claude-tuneup cleanup            # run a group by name
claude-tuneup 1-3                # run a step range
claude-tuneup 6,7                # run specific steps
claude-tuneup claude.md soul.md  # combine groups
claude-tuneup --dry-run          # scan + report what would change, touch nothing
claude-tuneup help               # list groups + triggers
claude-tuneup restore            # undo a previous run (fully, or configs/items only)
```

| Group | Steps | What it does |
| ----------------- | ----- | ------------- |
| 🧹 **`cleanup`**   | 1–8   | Remove junk + fix config integrity — skills, plugins, hooks, MCPs, projects, state dirs, root files, global `.claude.json` |
| 📄 **`claude.md`** | 9     | Improve `CLAUDE.md`, grounded in your **real usage** via the built-in `/insights` report — kept lean (≤ 200 lines) since it loads every session |
| ✨ **`soul.md`**   | 10    | Interview you and build a `SOUL.md` profile — tone, autonomy, pet peeves, stack, definition of done (also kept lean) |
| 📊 **`summary`**   | 11    | Final report of what changed + how to undo *(always runs last)* |

> Run everything, or just one group. No argument → it asks first.

---

## ✨ Why a `SOUL.md`?

Cleaning Claude is half the job — the other half is Claude knowing **who it's talking to**.

| File        | Answers         | Scope |
| ----------- | --------------- | ------ |
| `CLAUDE.md` | **how** to work | operational rules, per project |
| `SOUL.md`   | **who** you are | stable identity — tone, autonomy, pet peeves, stack, what *"done"* means |

It loads every session via `@SOUL.md`, so every answer fits **you** instead of a generic dev. Stop re-explaining yourself at the top of every conversation.

---

## 🤝 Plays nice with `AGENTS.md` — without losing the soul

Claude Code doesn't auto-load `AGENTS.md`, so repos that standardize on the cross-tool convention (Codex, Cursor, Gemini CLI…) usually end up with a `CLAUDE.md` copy that **drifts in silence**. The tune-up detects that drift and offers the clean bridge: shared truth lives once in `AGENTS.md`, and `CLAUDE.md` becomes a three-line shim —

```markdown
@AGENTS.md
@SOUL.md

# Claude-specific
- (deltas only Claude Code should see)
```

One opt-in question; Claude-only users never see it. And `@SOUL.md` stays in `CLAUDE.md` by rule — your soul never leaks into the cross-tool file.

---

## 🛟 Safety & undo (built for the cautious — affectionately)

This skill's job is deleting things, so it's paranoid by design:

- **🔘 Nothing deleted without confirmation.** Every choice is a button, and every question has a *"What does this do?"* option that inspects and explains the item **before** you decide. You will never be asked to judge something you can't identify.
- **🗂️ Your chat history is sacred.** Conversation transcripts and session state (`projects/`, `todos/`, `shell-snapshots/`, `file-history/`, `history.jsonl`) are the least replaceable data on the machine and are **never** bulk-deleted. The default is *keep*; at most it offers age-scoped pruning ("transcripts older than 6 months: 142 sessions, 1.2G") with explicit per-folder confirmation — warning you first that it's permanent and breaks `--resume` and `/insights`.
- **↩️ Every run is undoable.** Configs are snapshotted and removed items are *moved* (never `rm`-ed) into `~/.claude-tuneup/backups/<run-id>/` — kept **outside** the skill dir so an update or reinstall can't wipe your undo history (override with `$CLAUDE_TUNEUP_STATE`). Snapshots are owner-only (`.claude.json` can carry tokens). Roll back anytime — fully, or just configs, or just removed items:

  ```bash
  claude-tuneup restore
  ```
- **🛡️ The restore can't clobber.** Before rolling back, it snapshots your *current* configs into a `pre-restore-…` folder (so the restore itself is reversible) and never overwrites a newer item that re-took a removed path — collisions land at `<path>.restored-<ts>` and are reported.
- **🧯 Format-drift fuse.** If `installed_plugins.json` ever parses empty while plugin content exists on disk, the skill refuses to treat "unlisted" as "uninstalled" — a file-format change can't trick it into proposing a mass uninstall.
- **♻️ No pointless reclaims.** Self-regenerating artifacts (venvs, caches, runtimes, `statsig`) are detected — the skill points you at the real fix (disable the owning plugin) instead of deleting something that just rebuilds.
- **🔒 Privacy.** The `/insights` report is *your* local data — read live to drive suggestions, never copied into the skill or anywhere shared. Inline credentials in MCP configs are flagged by env-var **name** only; values are never printed.

---

## 🧩 How it works

A `SKILL.md` the agent follows as a checklist, backed by deterministic Node helpers for the mechanical parts. It **discovers** your install rather than assuming it — items are classified by traits (size, age, broken links, transport type), not hardcoded names — asks before each change, and logs every action so it can be reversed.

The helpers are plain Node (no dependencies, **no `python3` required**), so they run identically on macOS, Windows and Linux via the `node` that Claude Code already bundles — including Windows, where skill consolidation falls back to junctions when symlinks would need admin rights.

```
skills/claude-tuneup/
├─ SKILL.md               # routing + UX contract + safety rules (lean — loads on trigger)
├─ VERSION                # shipped skill version (drives the update nudge)
├─ references/            # per-group playbooks, loaded only when that group runs
│  ├─ cleanup.md          #   steps 1–8
│  ├─ claude-md.md        #   step 9
│  └─ soul-md.md          #   step 10
└─ scripts/               # deterministic, cross-OS (gather & apply)
   ├─ scan.mjs            # read-only discovery → JSON (--section for just one slice)
   ├─ backup.mjs          # restore point + snapshot + stash
   ├─ restore.mjs         # list / apply (full, --configs-only, --items-only)
   ├─ insights.mjs        # run /insights headless (cached 1h; --no-cache)
   ├─ consolidate.mjs     # move a skill to ~/.agents/skills + link back (junction on Windows)
   ├─ validate-json.mjs   # JSON sanity check after every config edit
   └─ version-check.mjs   # token-cheap update nudge (cached 24h, silent offline)
skills.sh.json             # registry manifest
```

The split is deliberate token hygiene: only the playbook for the group you're actually running enters the context — the same discipline the skill enforces on your `CLAUDE.md`.

Everything safety-critical is covered by an automated test suite (unit + end-to-end backup→restore roundtrips) running in CI on Linux, macOS and Windows.

---

## ❓ FAQ

**Will it delete my chat history?**
Not unless you explicitly ask for it, confirm it per folder, and acknowledge the warning — and even then only age-scoped slices, never wholesale. Default is always *keep*.

**I deleted something I regret.**
`claude-tuneup restore` → pick the restore point → full, configs-only, or items-only. The restore itself snapshots your current state first, so even undoing is undoable.

**Does it work on Windows?**
Yes — the helpers are pure Node, JSON validation doesn't shell out to `python3`, and consolidation uses junctions where symlinks would need admin rights.

**I use Codex/Cursor with `AGENTS.md` — will this fight my setup?**
The opposite: it detects CLAUDE.md↔AGENTS.md drift, consolidates with your confirmation, and wires `CLAUDE.md` as an import shim so every tool reads one source of truth. The token budget is enforced on the *combined* total, since imports load at launch too.

**What does a dry run cost?**
Nothing. It reads, reports sizes and candidates, and creates no backup, no changes, no model calls (the `/insights` call only happens in step 9 and is cached for an hour).

---

## 📄 License

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)
