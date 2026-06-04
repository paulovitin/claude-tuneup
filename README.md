<div align="center">

<img src="assets/logo.png" alt="claude-tuneup" width="220" />

# claude-tuneup

### Clean your Claude Code install. Optimize it. Then give it a soul.

A guided, **undoable** tune-up an AI agent runs *with* you —<br/>
it asks before every change and explains anything you don't recognize.

<br/>

[![Install](https://img.shields.io/badge/npx_skills_add-paulovitin%2Fclaude--tuneup-000?style=for-the-badge&logo=anthropic&logoColor=white)](https://github.com/paulovitin/claude-tuneup)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](#-license)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-d97757?style=for-the-badge)](https://claude.com/claude-code)

</div>

---

## ⚡ Install

```bash
npx skills add paulovitin/claude-tuneup
```

Then, in Claude Code:

```bash
claude-tuneup            # asks which group to run
```

---

## 🎛️ Usage

```bash
claude-tuneup                    # asks which group to run
claude-tuneup cleanup            # run a group by name
claude-tuneup 1-3                # run a step range
claude-tuneup 6,7                # run specific steps
claude-tuneup claude.md soul.md  # combine groups
claude-tuneup help               # list groups + triggers
claude-tuneup restore            # undo a previous run from a backup
```

| Group | Steps | What it does |
|:------|:-----:|:-------------|
| 🧹 **`cleanup`** | 1–8 | Remove junk + fix config integrity — skills, plugins, hooks, MCPs, projects, state dirs, root files, global `.claude.json` |
| 📄 **`claude.md`** | 9 | Improve `CLAUDE.md`, grounded in your **real usage** via the built-in `/insights` report |
| ✨ **`soul.md`** | 10 | Interview you and build a `SOUL.md` profile — tone, autonomy, pet peeves, stack, definition of done |
| 📊 **`summary`** | 11 | Final report of what changed + how to undo *(always runs last)* |

> Run everything, or just one group. No argument → it asks first.

---

## ✨ Why a `SOUL.md`?

Cleaning Claude is half the job — the other half is Claude knowing **who it's talking to**.

| File | Answers | Scope |
|:-----|:--------|:------|
| `CLAUDE.md` | **how** to work | operational rules, per project |
| `SOUL.md` | **who** you are | stable identity — tone, autonomy, pet peeves, stack, what *"done"* means |

It loads every session via `@SOUL.md`, so every answer fits **you** instead of a generic dev.

---

## 🛟 Safety & undo

- **🔘 Nothing deleted without confirmation.** Every choice is a button, and every question has a *"What does this do?"* option that explains the item **before** you decide.
- **↩️ Every run is undoable.** Configs are snapshotted and removed items are *moved* (never `rm`-ed) into a backup under the skill's own `.backups/<timestamp>/`. Roll back anytime with `claude-tuneup restore`.
- **♻️ No pointless reclaims.** Self-regenerating artifacts (venvs, caches, runtimes) are detected — the skill points you at the real fix (disable the owning plugin) instead of deleting something that just rebuilds.
- **🔒 Privacy.** The `/insights` report is *your* local data — read live to drive suggestions, never copied into the skill or anywhere shared. Backups are git-ignored.

---

## 🧩 How it works

A single `SKILL.md` the agent follows as a checklist. It **discovers** your install rather than assuming it — no hardcoded file lists — asks before each change, and logs every action so it can be reversed.

```
skills/claude-tuneup/SKILL.md   # the skill
skills.sh.json                  # registry manifest
```

---

## 📄 License

[MIT](LICENSE) © [paulovitin](https://github.com/paulovitin)
