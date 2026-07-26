<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### The rules you wrote for Claude are costing you more than your junk drawer is.

An AI agent audits the instructions loading into **every session** — and cleans the disk too.<br/>
Every change is a button. Every button has a *"What does this do?"*. Every run can be rolled back.

<br/>

[![Install](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](#-license)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)

<br/>

🌐 **Read in your language:**<br/>
🇺🇸 **English** • 🇧🇷 [Português](README.pt-BR.md) • 🇯🇵 [日本語](README.ja.md) • 🇨🇳 [简体中文](README.zh-CN.md) • 🇪🇸 [Español](README.es.md) • 🇫🇷 [Français](README.fr.md) • 🇷🇺 [Русский](README.ru.md)

</div>

---

> [!IMPORTANT]
> **Did you know?** Anthropic cut over **80%** of Claude Code's own system prompt for Claude 5 generation models. Obsolete rules written for older models in `CLAUDE.md` or `SOUL.md` waste reasoning tokens on every session. `claude-tuneup` audits your context against Anthropic's official guidelines!

> **Run `/doctor` first.** It ships with Claude Code, it takes inventory of your install better than
> anything else, and it's free. Then run `claude-tuneup` on what's left. This skill runs `/doctor`
> for you and works from its report — it's a complement, not a replacement.

Months of Claude Code use leave a trail on disk. But the more expensive trail is in your instructions:
rules written to compensate for older models, the same guidance copied into four files, skill
descriptions that route badly, a `SOUL.md` you pay for on every session whether it's relevant or not.
All of it loads before you type a word.

So the tool asks a different question than "what can I delete?" — it asks **"does this still help?"**.
Every check in the `instructions` group comes from one source: Anthropic's
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models).

```text
> claude-tuneup

📝 STEP 12: Rules that should be judgment

   ~/.claude/CLAUDE.md:14
   "default to writing no comments. Never write multi-paragraph docstrings."

   Written for an older model. Current models read the surrounding code.
   Suggested: "Write code that reads like the surrounding code: match its
              comment density, naming, and idiom."

   [ Rewrite it ]   [ Keep as-is ]   [ Delete it ]   [ What does this do? ]
```

Same contract as always: nothing changes without a button, and `claude-tuneup restore` puts anything back.

## ⚡ Install

```bash
npx skills add paulovitin/claude-tuneup
```

Then, in Claude Code:

```bash
claude-tuneup            # runs everything
```

First time? Start with `claude-tuneup --dry-run` — it shows everything it *would* do and touches nothing.

⏱️ A full run waits about **6 minutes** on the `/doctor` pass up front, and asks before spending another 6 to verify the result.

**Updating.** Re-run `npx skills add paulovitin/claude-tuneup` to pull the latest version — it runs in your shell, so it costs zero model tokens. The skill also nudges you (once, cached for a day) when a newer release exists, so you'll know when it's worth re-running.

---

## 🎛️ Usage

```bash
claude-tuneup                    # runs everything
claude-tuneup cleanup            # run a group by name
claude-tuneup instructions       # audit your rules + descriptions
claude-tuneup 1-3                # run a step range
claude-tuneup 6,7                # run specific steps
claude-tuneup claude.md soul.md  # combine groups
claude-tuneup --dry-run          # scan + report what would change, touch nothing
claude-tuneup help               # list groups + triggers
claude-tuneup restore            # undo a previous run (fully, or configs/items only)
```

| Group | Steps | What it does |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8    | Remove junk + fix config integrity — skills, plugins, hooks, MCPs, projects, state dirs, root files, global `.claude.json` |
| 📝 **`instructions`** | 12–17  | Audit what loads every session: rules that should be judgment, instructions that fight the runtime, the same rule in four places, descriptions that route badly, and workflows you repeat but never wrote down |
| 📄 **`claude.md`**    | 9      | Your global `CLAUDE.md` + the `AGENTS.md` bridge *(for a project's checked-in `CLAUDE.md`, run `/doctor` — it does that better)* |
| ♻️ **`soul.md`**      | 10     | Migrate a legacy `SOUL.md` into Claude's auto-memory, then retire it |
| 📊 **`summary`**      | 11     | Final report of what changed + how to undo *(always runs last)* |

> No argument runs everything. Step numbers are historical; the run order is diagnose → subtract → reorganize → add.

---

## ♻️ `SOUL.md` is retired — and migrated, not dropped

Earlier versions of this tool interviewed you and wrote a `SOUL.md`: a profile loaded into every
session via `@SOUL.md`. Claude Code now does this itself, better — it saves what it learns about you
as **memories, recalled when relevant** instead of loaded unconditionally.

So the interview is gone. If you already have a `SOUL.md`, the tune-up **converts it** — one memory
file per fact, properly typed, shown to you in full — and only then moves the file into the restore
point and removes the `@SOUL.md` import. Nothing is deleted before the replacement is live, and undo
brings back both the file and the import.

Worried about scope? Memories are per-project by default, while `@SOUL.md` loaded everywhere. The
tune-up offers to close that gap with one setting so migrated memories apply in every project — and
it will never touch your settings file without you saying yes to that exact question.

---

## 🤝 Plays nice with `AGENTS.md`

Claude Code doesn't auto-load `AGENTS.md`, so repos that standardize on the cross-tool convention (Codex, Cursor, Gemini CLI…) usually end up with a `CLAUDE.md` copy that **drifts in silence**. The tune-up detects that drift and offers the clean bridge: shared truth lives once in `AGENTS.md`, and `CLAUDE.md` becomes a three-line shim —

```markdown
@AGENTS.md

# Claude-specific
- (deltas only Claude Code should see)
```

One opt-in question; Claude-only users never see it. Imports beat symlinks here: a symlink makes `CLAUDE.md` *be* `AGENTS.md`, so every Claude-only line leaks into the file your other tools read.

---

## 🛟 Safety & undo (built for the cautious — affectionately)

This skill edits things you wrote and deletes things you own, so it's paranoid by design:

- **✍️ Your words are yours.** The `instructions` group rewrites the rules *you* wrote, which is a
  sharper kind of change than deleting a cache. So steps 12–16 **only propose** — they show the
  original line, the suggested rewrite, and the reason, and change nothing until you pick a button.
  Safety-critical absolutes ("never push to main", "never commit secrets") are kept **verbatim** and
  are never softened. Keeping a rule the tool flagged is always a valid answer.
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

## 📐 Where the rules come from

The `instructions` group isn't a set of opinions. Each check implements one rule from
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models):

| The rule | The check |
| --- | --- |
| Prefer judgment over rigid rules | **step 12** — rewrite rules written to compensate for older models, keeping safety absolutes verbatim |
| Don't fight the harness | **step 13** — flag instructions that contradict what the runtime already does |
| Say it once | **step 14** — the same instruction across `CLAUDE.md`, agent bodies, agent and skill descriptions |
| Interfaces over examples | **step 15** — `description` fields that route on capability, not on example phrasings |
| Progressive disclosure | **step 16** — what stays always-loaded vs. what becomes a lazily-loaded skill |
| Let auto-memory do memory | **step 10** — `SOUL.md` retires into Claude Code's own memory |

The skill holds itself to the same rules: the split below is progressive disclosure, and only the
playbook for the group you're running enters the context.

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
│  ├─ instructions.md     #   steps 12–17
│  ├─ harness-invariants.md  # what the runtime already does (step 13's list)
│  ├─ claude-md.md        #   step 9
│  └─ soul-md.md          #   step 10
└─ scripts/               # deterministic, cross-OS (gather & apply)
   ├─ scan.mjs            # read-only discovery → JSON (--section for just one slice)
   ├─ backup.mjs          # restore point + snapshot + stash
   ├─ restore.mjs         # list / apply (full, --configs-only, --items-only)
   ├─ doctor.mjs          # run the built-in /doctor headless, report-only (cached 1h)
   ├─ insights.mjs        # run /insights headless (cached 1h; --no-cache)
   ├─ audit-instructions.mjs  # instruction signals + resident descriptions → JSON
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
No changes and no backup — it only reads. It does still make the two diagnostic calls (`/doctor` and `/insights`), both read-only and cached for an hour, so budget the `/doctor` wait.

**Why does it run `/doctor` instead of replacing it?**
Because `/doctor` is better at taking inventory — it sees real per-component usage across every project, and resident-token costs, which no external skill can measure. Running it first means claude-tuneup spends its effort on what `/doctor` doesn't touch: your **global** `CLAUDE.md`, your agent and skill descriptions, a legacy `SOUL.md`, and disk.

**Will it rewrite my `CLAUDE.md` behind my back?**
No. Every rewrite is shown as a before/after with a reason, and applied only if you click. Safety rules are kept word-for-word. And the whole run sits inside a restore point, so `claude-tuneup restore` brings back the original file.

**Is `/doctor` allowed to change things when the skill runs it?**
No. The call always carries a report-only instruction, and a test asserts it's present in every command the skill builds — a headless run has no confirmation prompts to stop it, so the instruction is the safeguard.

---

## 📄 License

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)
