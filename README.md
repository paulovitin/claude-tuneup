<!--
THESIS: The whole README is a cross-examination — the cautious heavy user interrogates
the tool, and every answer leads with proof. Refuses the hero/features/FAQ scaffold.
OWN-WORLD: GFM only. Blockquotes carry the reader's voice (the questions); code blocks
carry the tool's evidence (real transcripts, real commands). Affectionately paranoid wit.
STORY: The skeptic arrives hostile, gets every objection answered with a mechanism, and
leaves with the install command earned, not pitched.
FIRST VIEWPORT: Logo, tagline, badges, then the accusation ("your rules cost more than
your junk drawer") and the first hostile question answered by the step-12 transcript.
FORM: Skeptic's interrogation — candidate 5 of 6, assigned by seed 9add6e23 (surface
scope, persuade). FAQ dissolves into the structure.
-->

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

Months of Claude Code use leave a trail on disk. But the more expensive trail is in your
instructions: rules written to compensate for older models, the same guidance copied into four
files, skill descriptions that route badly, a `SOUL.md` you pay for on every session whether it's
relevant or not. All of it loads before you type a word.

You have objections to a tool that wants to touch any of that. **Good.** This tool was built for
people exactly like you — so let's hear them, one at a time. Already convinced? The install command
is [down here](#-fine-what-am-i-typing). Not convinced? Better. Keep reading.

---

## 🧐 "You want to rewrite rules that *I* wrote?"

**No — it wants to *propose*, and you hold the only pen.** The `instructions` group (steps 12–18)
never edits a rule on its own. It shows the original line, the suggested rewrite, and the reason,
and changes nothing until you pick a button:

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

Three things that transcript can't show:

- **Safety absolutes are untouchable.** Rules like "never push to main" or "never commit secrets"
  are kept **verbatim** — never softened, never "improved".
- **Keeping a flagged rule is always a valid answer.** The tool flags; you judge.
- **You'll never judge something you can't identify.** Every question has a *"What does this
  do?"* option that inspects and explains the item **before** you decide.

---

## 📐 "Rewrite them based on *what* — your taste?"

**No opinions.** Every check in the `instructions` group implements one rule from Anthropic's
[**The new rules of context engineering for Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models):

| The rule | The check |
| --- | --- |
| Prefer judgment over rigid rules | **step 12** — rewrite rules written to compensate for older models, keeping safety absolutes verbatim |
| Don't fight the harness | **step 13** — flag instructions that contradict what the runtime already does |
| Say it once | **step 14** — the same instruction across `CLAUDE.md`, agent bodies, agent and skill descriptions |
| Interfaces over examples | **step 15** — `description` fields that route on capability, not on example phrasings |
| Progressive disclosure | **step 16** — what stays always-loaded vs. what becomes a lazily-loaded skill |
| Let auto-memory do memory | **step 10** — `SOUL.md` retires into Claude Code's own memory |

It asks a different question than "what can I delete?" — it asks **"does this still help?"**.
And the skill holds itself to the same rules: only the playbook for the group you're actually
running enters the context — the same token discipline it enforces on your `CLAUDE.md`.

---

## 🔁 "So every run re-asks me the same things?"

**It had no way not to — nothing persisted between runs.** A second tune-up arrived with no
memory of the first: same flagged rules, same declines, same answers. Now what you decided is
recorded, and a re-run opens with one line instead of a re-litigation:

```text
> claude-tuneup

Resident context is up ~380 tokens since your last tune-up (2026-06-14).
3 items you asked me to keep last time — skipped. (`--all` reviews them anyway.)
```

- **A rule you reworded comes back.** Keys hash the *text*, not the path — so a rewritten rule
  is proposed again, correctly: you never approved that wording. Reflowing a paragraph changes
  nothing, because whitespace is normalized first.
- **Nothing is dropped silently.** Declines collapse into that one line, never into nothing.
- **It remembers your decisions, not your writing.** Paths, hashes and verdicts — never the
  contents of your instruction files. It lives beside the backups, so undoing one run can't
  erase what you decided in all the others.

---

## 🩺 "Claude Code already ships `/doctor`. Why do you exist?"

**Because `/doctor` runs first — this tool insists on it.** `/doctor` is better at taking
inventory: it sees real per-component usage across every project and resident-token costs, which
no external skill can measure. So claude-tuneup runs it for you and works from its report,
spending its own effort on what `/doctor` doesn't touch: your **global** `CLAUDE.md`, your agent
and skill descriptions, a legacy `SOUL.md`, and disk. A complement, not a replacement.

> **"And when the skill runs `/doctor` headless, what stops *that* from changing things?"**
> The call always carries a report-only instruction, and a test asserts it's present in every
> command the skill builds — a headless run has no confirmation prompts, so the instruction is
> the safeguard, and the test is the safeguard's safeguard.

⏱️ Budget honestly: a full run waits about **6 minutes** on the `/doctor` pass up front, and asks
before spending another 6 to verify the result.

---

## 🗂️ "Will it touch my chat history?"

**Not unless you ask, confirm per folder, and acknowledge a warning — and never wholesale.**
Conversation transcripts and session state (`projects/`, `todos/`, `shell-snapshots/`,
`file-history/`, `history.jsonl`) are the least replaceable data on the machine and are **never**
bulk-deleted. The default is *keep*. At most it offers age-scoped pruning — "transcripts older
than 6 months: 142 sessions, 1.2G" — with explicit per-folder confirmation, warning you first
that it's permanent and breaks `--resume` and `/insights`.

---

## ↩️ "And the day I regret a click?"

```bash
claude-tuneup restore    # pick the restore point → full, configs-only, or items-only
```

**Every run is a restore point.** Configs are snapshotted and removed items are *moved* — never
`rm`-ed — into `~/.claude-tuneup/backups/<run-id>/`, kept **outside** the skill dir so an update
or reinstall can't wipe your undo history (override with `$CLAUDE_TUNEUP_STATE`). Snapshots are
owner-only, because `.claude.json` can carry tokens.

A run *adds* as well as subtracts, and undo now reverses both: skills written for you during a
run are recorded and taken back out on a full restore — *moved* into `undone-creations/`, not
deleted, since you may have edited one since.

> **"Can the restore itself break something?"**
> It's paranoid too. Before rolling back, it snapshots your *current* configs into a
> `pre-restore-…` folder — so even undoing is undoable — and it never overwrites a newer item
> that re-took a removed path: collisions land at `<path>.restored-<ts>` and are reported.

---

## 🔎 "And when it breaks three days later, in another session?"

**That one has its own entry point.** `restore` assumes you know which run to undo. Three days
on you don't — you have a symptom, not a run id:

```text
> claude-tuneup fix

   "the rule I had about commits is gone"

   2 restore points mention it — ranked, not a verdict:

   ● 2026-06-14 14:02   CLAUDE.md:14 "squash before pushing"   (removed)
     2026-06-02 09:31   actions.log — consolidated skill "git-helper"

   [ Put back just that ]   [ Show me the whole run ]   [ Neither ]
```

- **It reads what every restore point already held** — removed paths, the action log, and the
  snapshotted `CLAUDE.md`/`AGENTS.md`/`SOUL.md`. The evidence was always there; nothing could
  read it back to you.
- **A regression cuts both ways.** Something removed is the obvious cause, but a skill the run
  *created* can shadow one you had and change routing without deleting anything. The two need
  opposite fixes, so the direction is read from the record, never inferred from the path.
- **One item goes back, not the whole run** — the rest of that tune-up stays applied. The
  recovery is recorded too, so the next run doesn't re-propose the very thing that just broke.
- **Your secrets aren't searchable.** `.claude.json` and `settings*.json` are never read by the
  search: they can carry tokens, and a search result is text it prints back to you.

---

## 🧯 "What haven't I thought to ask?"

The failure modes it already worried about so you don't have to:

- **A file-format change can't trick it into a mass uninstall.** If `installed_plugins.json`
  ever parses empty while plugin content exists on disk, the skill refuses to treat "unlisted"
  as "uninstalled".
- **It won't sell you pointless reclaims.** Self-regenerating artifacts (venvs, caches,
  runtimes, `statsig`) are detected — it points you at the real fix (disable the owning plugin)
  instead of deleting something that rebuilds itself next week.
- **It discovers, it doesn't assume.** Items are classified by traits — size, age, broken
  links, transport type — not hardcoded names.
- **Your `/insights` data stays yours.** It's read live to drive suggestions, never copied into
  the skill or anywhere shared. Inline credentials in MCP configs are flagged by env-var
  **name** only; values are never printed.

---

## 🤝 "I standardized on `AGENTS.md`. Will this fight my setup?"

**The opposite — it offers the clean bridge.** Claude Code doesn't auto-load `AGENTS.md`, so
repos on the cross-tool convention (Codex, Cursor, Gemini CLI…) usually end up with a
`CLAUDE.md` copy that **drifts in silence**. The tune-up detects that drift and consolidates:
shared truth lives once in `AGENTS.md`, and `CLAUDE.md` becomes a three-line shim —

```markdown
@AGENTS.md

# Claude-specific
- (deltas only Claude Code should see)
```

One opt-in question; Claude-only users never see it. Imports beat symlinks here: a symlink makes
`CLAUDE.md` *be* `AGENTS.md`, so every Claude-only line leaks into the file your other tools
read. And the token budget is enforced on the *combined* total, since imports load at launch too.

---

## ♻️ "I still have a `SOUL.md` from your old versions."

**Then it gets migrated, not dropped.** Earlier versions interviewed you and wrote a `SOUL.md`
loaded into every session via `@SOUL.md`. Claude Code now does this itself, better — it saves
what it learns as **memories, recalled when relevant** instead of loaded unconditionally.

So the interview is gone, and the tune-up **converts** what you have: one memory file per fact,
properly typed, shown to you in full — and only then moves the file into the restore point and
removes the `@SOUL.md` import. Nothing is deleted before the replacement is live, and undo brings
back both the file and the import.

> **"Memories are per-project. `@SOUL.md` loaded everywhere. That's a downgrade."**
> Caught — and covered. The tune-up offers to close that gap with one setting so migrated
> memories apply in every project, and it will never touch your settings file without you saying
> yes to that exact question.

---

## ⚡ "Fine. What am I typing?"

```bash
npx skills add paulovitin/claude-tuneup
```

Then, in Claude Code:

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
claude-tuneup fix                # "X stopped working": trace which run did it, put back just that
```

**First time? Start with `--dry-run`** — it shows everything it *would* do and touches nothing.
(It only reads: no changes, no backup. It does still make the two diagnostic calls — `/doctor`
and `/insights`, both read-only and cached for an hour — so budget the `/doctor` wait.)

| Group | Steps | What it does |
| -------------------- | ------ | ------------- |
| 🧹 **`cleanup`**      | 1–8, 19 | Remove junk + fix config integrity — skills, plugins, hooks, MCPs, projects, state dirs, root files, global `.claude.json`, and what `settings.json` actually says — dead paths, permission rules that contradict each other |
| 📝 **`instructions`** | 12–18   | Audit every surface that loads each session — rules, skill and agent descriptions, slash commands, output styles, plugin-bundled components: rules that should be judgment, instructions that fight the runtime, the same rule in four places, descriptions that route badly, and workflows you repeat but never wrote down |
| 📄 **`claude.md`**    | 9       | Your global `CLAUDE.md` + the `AGENTS.md` bridge *(for a project's checked-in `CLAUDE.md`, run `/doctor` — it does that better)* |
| ♻️ **`soul.md`**      | 10      | Migrate a legacy `SOUL.md` into Claude's auto-memory, then retire it |
| 📊 **`summary`**      | 11      | Final report of what changed + how to undo *(always runs last)* |

No argument runs everything. Step numbers are historical; the run order is
diagnose → subtract → reorganize → add.

**Updating:** re-run `npx skills add paulovitin/claude-tuneup` — it runs in your shell, so it
costs zero model tokens. The skill also nudges you (once, cached for a day) when a newer release
exists.

---

## 🧩 "What exactly is running on my machine?"

**A checklist and some Node scripts — you can read both.** A `SKILL.md` the agent follows,
backed by deterministic helpers for the mechanical parts. The agent decides (classify, ask,
delete/keep); scripts only gather and apply, and every action is logged so it can be reversed.

```
skills/claude-tuneup/
├─ SKILL.md               # routing + UX contract + safety rules (lean — loads on trigger)
├─ VERSION                # shipped skill version (drives the update nudge)
├─ references/            # per-group playbooks, loaded only when that group runs
│  ├─ cleanup.md          #   steps 1–8, 19
│  ├─ instructions.md     #   steps 12–18
│  ├─ harness-invariants.md  # what the runtime already does (step 13's list)
│  ├─ claude-md.md        #   step 9
│  └─ soul-md.md          #   step 10
└─ scripts/               # deterministic, cross-OS (gather & apply)
   ├─ scan.mjs            # read-only discovery → JSON (--section for just one slice)
   ├─ backup.mjs          # restore point + snapshot + stash
   ├─ restore.mjs         # list / search / apply (full, configs, items, or one --only <path>)
   ├─ ledger.mjs          # what you decided last run, so a re-run does not re-ask (never file contents)
   ├─ doctor.mjs          # run the built-in /doctor headless, report-only (cached 1h)
   ├─ insights.mjs        # run /insights headless (cached 1h; --no-cache)
   ├─ audit-instructions.mjs  # instruction signals + resident descriptions → JSON
   ├─ consolidate.mjs     # move a skill to ~/.agents/skills + link back (junction on Windows)
   ├─ validate-json.mjs   # JSON sanity check after every config edit
   └─ version-check.mjs   # token-cheap update nudge (cached 24h, silent offline)
skills.sh.json             # registry manifest
```

> **"Does it actually work on Windows, or 'works on Windows'?"**
> The helpers are plain Node — no dependencies, **no `python3` required** — so they run
> identically on macOS, Windows and Linux via the `node` Claude Code already bundles. On
> Windows, skill consolidation falls back to junctions where symlinks would need admin rights.
> Everything safety-critical is covered by an automated test suite (unit + end-to-end
> backup→restore roundtrips) running in CI on all three OSes.

---

## ⚖️ The verdict is yours

That's every objection we've heard so far — if you have a new one,
[open an issue](https://github.com/paulovitin/claude-tuneup/issues): the best questions in this
file started as someone's suspicion. The contract stands either way: nothing changes without a
button, and `claude-tuneup restore` puts anything back.

Built for the cautious — affectionately.

---

## 📄 License

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)
