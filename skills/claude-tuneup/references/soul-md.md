# SOUL.md retirement — step 10

> Loaded on demand by SKILL.md. The UX contract and Rules in SKILL.md apply here.

## STEP 10: Migrate a legacy `SOUL.md` into auto-memory, then retire it

`SOUL.md` was this skill's workaround for a gap Claude Code has since filled. Claude Code now saves
what it learns about the dev into its own memory directory — one file per fact, **recalled when
relevant** instead of loaded into every session. A `SOUL.md` pays its full token cost every session
whether it's relevant or not.

So we stop creating them, and we migrate the ones already out there.

**This is a migration, never a deletion.** Somebody answered eight interview questions and has
carried `@SOUL.md` for months. They must finish this run with that content **live in the new
mechanism** before anything is removed.

**No `SOUL.md`? One line and stop:** *"No SOUL.md found — Claude's auto-memory handles this now."*
Never create one. There is no interview in this skill anymore.

### 10.1 — Detect

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section memory
```

Read `soulStatus` (`absent` | `present-unwired` | `present-wired` | `migrated`), the file's token
cost, `autoMemoryEnabled`, `autoMemoryDirectory`, `memoryDir`, and `memoryScope`.

**Two preconditions, checked before offering anything.** Retiring `SOUL.md` into a disabled
mechanism is data loss with extra steps. If auto-memory is off — the `CLAUDE_CODE_DISABLE_AUTO_MEMORY`
env var, or `autoMemoryEnabled: false` in settings — **do not offer the migration.** Say it's off,
name the switch, leave `SOUL.md` completely alone. Offer to enable it; only then re-offer.

**Never write to a guessed path.** If the memory directory can't be located from what's on disk,
stop, report it, keep `SOUL.md`, change nothing.

**Team mounts are out of scope.** If a team/org memory tier is present, note it and route everything
we write to the dev's own directory. A personal profile does not belong in a shared team store.

### 10.2 — Offer the global memory directory (ask first, always)

By default memory lives per project, while `@SOUL.md` loaded in *every* project. That gap closes with
one setting: `autoMemoryDirectory` in `~/.claude/settings.json` gives migrated memories the same
every-project reach — without the every-session cost.

If it's unset, offer it (AskUserQuestion + explain button), framed honestly: *"this makes what Claude
learns about you apply in every project, like SOUL.md did."*

**Hard rule: never write `~/.claude/settings.json` without an explicit yes to this exact question.**
Changing where memory lives has effects far outside this run; a general "yes, tune me up" does not
cover it. Declining must leave the file byte-identical — and then the scope caveat in 10.5 applies.

Validate after the edit: `node "$SKILL_DIR/scripts/validate-json.mjs" ~/.claude/settings.json`.

### 10.3 — Explain and ask

One AskUserQuestion, with the mandatory explain button:

> You have a `SOUL.md` — a profile of you that this tool used to build, loaded into every session.
> Claude Code now does this itself: it saves what it learns about you as memories, recalled when
> relevant instead of loaded every time. Your `SOUL.md` costs ~N tokens on every single session,
> relevant or not. I can convert it — one memory file per fact, properly typed — then remove
> `SOUL.md` and its `@import`.
>
> **[ Convert and retire it ]** · **[ Convert but keep SOUL.md too ]** · **[ Leave it alone ]** · **[ What does this do? ]**

### 10.4 — Convert

Read `SOUL.md`, split it into atomic facts, and propose one memory file per fact — **shown in full
before anything is written.**

| What the SOUL.md line is | memory `type` |
|---|---|
| Role, expertise, default stack | `user` |
| Communication, tone, verbosity | `user` |
| Pet peeves, stance on disagreement, autonomy | `feedback` |
| Definition of done | `feedback` |
| A specific project or tool | `project` or `reference` |

Rules the conversion obeys:

- **One fact per file.** A line bundling three preferences becomes three files.
- **`feedback` needs its why.** The format wants **Why:** and **How to apply:** lines. If `SOUL.md`
  recorded a preference with no reason, ask for one — or file it as `user` rather than invent one.
- **Drop what memory wouldn't save**: anything the repo, git history, or `CLAUDE.md` already records;
  anything churny like current projects. **Say out loud what was dropped and why.** Never silently
  discard the dev's words.
- **Check for an existing memory that already covers the fact** and update that file instead of
  duplicating it.
- **Link related memories** with `[[slug]]`.
- **One index line per file in `MEMORY.md`** (`- [Title](file.md) — hook`), creating it if absent.
  Never put memory content in the index.

### 10.5 — Remove, only after the dev confirms the memories look right

1. `node "$SKILL_DIR/scripts/backup.mjs" stash "$RP" ~/.claude/SOUL.md` — **moved, never deleted.**
   Fully restorable.
2. Remove the `@SOUL.md` line from `~/.claude/CLAUDE.md`.
3. Re-run `scan.mjs --section memory` and report the new `combinedApproxTokens` — that drop is the
   concrete win.
4. Note in the summary that undo restores both the file and the import.

**Scope caveat, if they declined 10.2.** Memory is per-project; `@SOUL.md` loaded everywhere.
Converting in one project does not populate the others. Say so — this is a real trade-off, not a pure
win. "Convert but keep SOUL.md too" exists for exactly that dev, and choosing it is defensible.
Record the choice and move on.
