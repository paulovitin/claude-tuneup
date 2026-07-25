# CLAUDE.md playbook — step 9

> Loaded on demand by SKILL.md. The UX contract and Rules in SKILL.md apply here.

## STEP 9: The global `CLAUDE.md` and its AGENTS.md bridge

**Scope: `~/.claude/CLAUDE.md` only** — the user-level file, plus whatever it imports. For a
project's checked-in `CLAUDE.md`, say so by name: **run `/doctor` there. Its checks 3 and 4 do that
job better**, with the repo in front of them. This step deliberately does not compete.

Restructuring the global file — deciding what stays, what becomes a skill, what becomes a memory —
is **step 16**, in the `instructions` group. This step handles the bridge and the budget.

### 9.0 — AGENTS.md bridge (multi-agent setups only)

Claude Code does **not** auto-load `AGENTS.md` — it reads `CLAUDE.md`. Repos and users standardizing on the cross-tool `AGENTS.md` convention (Codex, Cursor, Gemini CLI…) therefore end up maintaining a drifting `CLAUDE.md` copy. This sub-step fixes that with the import mechanism Claude Code *does* have.

First, see how the user-level memory files relate:

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section memory
```

Returns per-file stats (`lines`, `approxTokens`, `contentLines`), the `imports` found in `CLAUDE.md`, `linkStyle` (`import` | `symlink` | `none`), **`drift`** (both files substantive and nothing links them), and `combinedApproxTokens` — what actually loads each session.

Then ask ONCE (AskUserQuestion + explain button): **"Do you use other coding agents (Codex, Cursor, Gemini…) that read AGENTS.md?"**
- **No** → skip this entire sub-step. CLAUDE.md-only is the simple, valid setup — never create an `AGENTS.md` for a Claude-only user.
- **Yes** → apply the **shim pattern** below, routing by what the scan found.

**The shim pattern (import, never symlink).** Shared truth lives once in `AGENTS.md`; `CLAUDE.md` becomes a tiny shim:

```markdown
@AGENTS.md
@SOUL.md

# Claude-specific
- (deltas that only apply to Claude Code go here)
```

Why import beats symlink: a symlink makes `CLAUDE.md` *be* `AGENTS.md`, so any Claude-specific line — including `@SOUL.md` — leaks into the cross-tool file where other agents read it as noise; the shim keeps a home for Claude-only deltas; and symlinks need privileges on Windows while imports are just text.

Routing by scan result (every edit goes through AskUserQuestion; configs are already in the `$RP` snapshot, `AGENTS.md` included):
- **`drift: true`** → show both files' sizes and a short diff summary; ask which is the source of truth; merge the unique content of the loser into it (propose the merged result, never auto-merge), then rewrite `CLAUDE.md` as the shim.
- **`linkStyle: "symlink"`** → offer to convert to the shim (same content reachable, plus a place for `@SOUL.md` and deltas). Use `validate`-style care: remove link, write shim, confirm `AGENTS.md` untouched.
- **`linkStyle: "import"`** → already bridged ✅ — just verify the shim stays lean.
- **Yes but no `AGENTS.md` yet** → offer the migration: move the shareable content of `CLAUDE.md` into a new `AGENTS.md`, keep Claude-only lines in the shim.

Two hard rules: **never put `@` imports inside `AGENTS.md`** (it's tool-agnostic — Claude syntax doesn't belong there), and **`@SOUL.md` lives only in `CLAUDE.md`** (see the soul-md playbook).

**Budget with imports:** imported files still load at launch, so the memory-file budget in SKILL.md Rule 9 applies to `combinedApproxTokens` — shim + `AGENTS.md` + `SOUL.md` together, not per file. Show the combined number to the dev whenever this sub-step changes anything.

### 9.1 — Report what actually loads

Read the global file and show the dev what it costs them, every session:

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section memory
```

Report line count, approximate tokens, and — in a shim setup — the combined total. Apply the budget
in SKILL.md Rule 9. If the file is over it, say so here; the fix is step 16, not an ad-hoc trim.

**What this step no longer does.** It used to mine `/insights` for "Suggested CLAUDE.md Additions"
and paste them in as new rules. That is now wrong twice over: it pushes more rigid rules at a model
that needs fewer, and it puts them in the always-resident file. `/insights` still runs — its findings
now become **skills** in step 17 instead of rules here.

If the dev asks for content changes to the global file, route them to the `instructions` group:
step 12 questions the rules already in it, step 16 restructures the whole file.
