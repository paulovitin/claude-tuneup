# CLAUDE.md playbook — step 9

> Loaded on demand by SKILL.md. The UX contract and Rules in SKILL.md apply here.

## STEP 9: Improve `CLAUDE.md` (grounded in real usage via `/insights`)

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

**Budget with imports:** imported files still load at launch, so the ≤ ~1500-token budget applies to `combinedApproxTokens` — shim + `AGENTS.md` + `SOUL.md` together. Show the combined number to the dev whenever this sub-step changes anything.

### 9.1 — Ground it in real usage

Offer to the dev: "Want me to review and improve CLAUDE.md?" (In a shim setup, "CLAUDE.md content" means the file the shim imports — improvements land in `AGENTS.md` if they're tool-agnostic, in the shim's Claude-specific section if not.)

Claude Code ships a built-in **`/insights`** command that analyzes the dev's own sessions and writes a usage report (HTML) — including a ready-made **"Suggested CLAUDE.md Additions"** section. A skill can't type a slash command into the TUI, but it CAN run `/insights` **headlessly** with `claude -p` (no browser opens; it just prints the report path) and read the HTML.

**Privacy / generic-skill rule:** the report is the dev's own data, generated locally on their machine. Never paste report contents into this skill or anywhere shared — read it live, with the dev, only to drive the suggestions below. Skip anything that looks like a secret, token, or private path.

Run it headless and get the sections as JSON (no browser; costs one model call; needs prior session history):

```bash
node "$SKILL_DIR/scripts/insights.mjs"            # cached for 1h
node "$SKILL_DIR/scripts/insights.mjs" --no-cache # force a fresh run (e.g. right after pruning history)
```

It returns `{ ok, report, sections: { suggestedClaudeMd, whatYouWorkOn, howYouUse, friction } }`, or `{ ok:false, reason }` when there's no history / `claude -p` is unavailable. Use the report's "Suggested CLAUDE.md Additions" as the spine of your proposal; cross-reference "What You Work On" / friction for domain and pain points.

**If `sections` comes back empty (or with a `note`):** the `/insights` HTML layout probably changed under the parser. Don't give up — the `report` path is still valid: read the HTML file directly and extract the "Suggested CLAUDE.md Additions" content yourself. (The script deliberately doesn't cache empty parses, so a later run re-tries.)

**Fallback** (no session history yet, or `claude -p` unavailable) — mine usage counters directly, no python needed:

```bash
node "$SKILL_DIR/scripts/scan.mjs" --section usage
```

Returns the top skills/tools by `usageCount` with `lastUsed` dates. Stale heavy hitters (high count, old `lastUsed`, no current install) → mention as history, don't add as a preference.

Then:
- Read `~/.claude/CLAUDE.md`
- Propose additions grounded in the report/scan: code preferences, favorite tools/workflows, recurring domains, recurring friction worth a guardrail
- Ask (AskUserQuestion buttons) which to add/remove
- Apply changes
- Note: `/insights` reports accumulate in `~/.claude/usage-data/` — offer to prune old ones (ties back to cleanup step 6).

**Keep it lean (hard budget).** `CLAUDE.md` loads into the context of *every* session — bloat is a permanent token tax. Enforce:
- **≤ 200 lines and ideally ≤ ~1500 tokens** (`wc -l ~/.claude/CLAUDE.md`; `≈ chars/4` for tokens). If a proposed addition would blow the budget, don't just append — trim or merge first.
- Every line must **change behavior**. Cut anything generic ("write clean code"), redundant, or already implied. One sharp line beats a paragraph.
- Prefer terse rules / bullets over prose. No filler, no restating the obvious.
- If the file is **already over budget**, offer to compress it (dedupe, merge sections, drop dead rules) before adding anything.
- Show the before/after line+token count so the dev sees the cost.
