# claude-tuneup

**Tune up your Claude Code installation: clean it, optimize it, then give it a soul.**

`claude-tuneup` is a guided, **undoable** checklist that an AI agent runs *with* you. It walks your Claude Code install step by step — skills, plugins, hooks, MCPs, projects, state directories, root files — reports the size and content of each item, and **never deletes anything without an explicit, button-click confirmation**. Then it can rewrite your `CLAUDE.md` from your *real* usage data and interview you to build a `SOUL.md` so Claude actually knows who it's talking to.

Built to be shared: no machine-specific assumptions, no hardcoded file lists — it discovers what's actually on your system and classifies by traits.

## Install

```bash
npx skills add paulovitin/claude-tuneup
```

## Usage

In Claude Code:

```
claude-tuneup                  # asks which group to run
claude-tuneup cleanup          # run a group by name
claude-tuneup 1-3              # run a step range
claude-tuneup 6,7              # run specific steps
claude-tuneup claude.md soul.md  # combine groups
claude-tuneup help             # list groups + triggers
claude-tuneup restore          # undo a previous run from a backup
```

### Groups

| Group | Steps | What it does |
|-------|-------|--------------|
| `cleanup` | 1–8 | Remove junk + fix config integrity: skills, plugins, hooks, MCPs, projects, state dirs, root files, global `.claude.json` |
| `claude.md` | 9 | Improve `CLAUDE.md`, grounded in real usage via the built-in `/insights` report |
| `soul.md` | 10 | Interview you and build a `SOUL.md` profile (tone, autonomy, pet peeves, stack, definition of done) |
| `summary` | 11 | Final report of what changed + how to undo (always runs last) |

Run everything, or just one group. No argument → it asks first.

## Why a SOUL.md?

Cleaning Claude is half the job — the other half is Claude knowing *who it's talking to*.

- `CLAUDE.md` = **how** to work (operational rules, per project).
- `SOUL.md` = **who** you are (stable identity: tone, autonomy, pet peeves, default stack, what "done" means).

It loads every session via `@SOUL.md`, so every answer fits you instead of a generic dev.

## Safety & undo

- **Nothing is deleted without confirmation.** Every choice is a button, and every question has a *"What does this do?"* option that explains the item before you decide.
- **Every run is undoable.** Configs are snapshotted and removed items are moved (not `rm`-ed) into a backup under the skill's own `.backups/<timestamp>/`. Roll back anytime with `claude-tuneup restore`.
- **No pointless reclaims.** Self-regenerating artifacts (venvs, plugin caches, downloaded runtimes) are detected; the skill tells you the real fix (disable the owning plugin) instead of deleting something that just rebuilds.
- **Privacy.** The `/insights` report is your own local data — it's read live to drive suggestions, never copied into the skill or anywhere shared. Backups are git-ignored.

## How it works

The skill is a single `SKILL.md` the agent follows as a checklist. It discovers your install rather than assuming it, asks before each change, and logs every action so it can be reversed.

```
skills/claude-tuneup/SKILL.md   # the skill
skills.sh.json                  # registry manifest
```

## License

MIT
