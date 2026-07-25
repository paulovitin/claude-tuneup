## Summary

Your setup is in good shape. The installation is clean and current (v9.9.9, the latest), permissions are already on auto mode, and no hook is slow. The only real findings are **four connectors you haven't used once in 150 sessions** (one of which quietly costs ~600 tokens every session) and **three add-on bundles with zero recorded use**. Everything proposed below is reversible.

---

## Detail

| Component | Type | Scope | Uses (total since install) | Used in window? | Est. resident tokens | Verdict |
|---|---|---|---|---|---|---|
| `alpha-skill` | skill | user (`~/.claude/skills`) | 172 | no (last 2099‑01‑15) | ~320 | **keep** — heaviest-used skill you own |
| `beta-skill` | skill | user | 0 | no | ~85 | **keep** — zero lifetime uses, but you wired it into your global CLAUDE.md; cheap enough to give it a chance |
| `gamma-skill` | skill | user | 12 | yes (01‑18) | ~49 | keep |
| `delta-skill` | skill | user | 1 | yes (01‑23) | ~44 | keep — overlaps `gamma-skill`; watch it |
| 3 skills already off (`eps-skill`, `zeta-skill`, `eta-skill`) | skills | user | — | — | 0 (disabled) | not touching — already off |
| `example-connector-a` | MCP server | connector | n/a (no counter) | **no** (0 calls) | **~600** (server instructions are resident; its tools are deferred) | **remove** |
| `example-connector-b` | MCP server | connector | n/a (no counter) | **no** (0 calls) | deferred (~25 for tool names) | **remove** |
| `example-connector-c` | MCP server | connector | n/a (no counter) | **no** (0 calls) | deferred | **remove** — also never authorized, so it can't work as-is |
| `example-browser` | MCP server | built-in integration | n/a (no counter) | **yes — 385 calls** | deferred | keep — your most-used connection |
| `srv-one`, `srv-two` | MCP servers | user (`~/.claude.json`) | n/a (no counter) | no | 0 | no action — already disabled in all 45 of your projects |
| `lang-plugin@example-marketplace` | plugin | local → other worktree | 0 | no signal in transcripts | 0 here | keep — language support for a matching repo; counters are unreliable here |
| `setup-plugin@example-marketplace` | plugin | user-enabled + local install | 1 (01‑22) | yes (1 slash call) | ~small | keep |
| `docs-plugin@example-marketplace` | plugin | local → other worktree | 0 | no | 0 here | **remove** |
| `tidy-plugin@example-marketplace` | plugin | local → other worktree | 0 | no | 0 here | **remove** — you already have your own `tidy` skill |
| `CLAUDE.md` (this repo) | memory file | checked in | — | always loaded | ~850 | small trim available (~60) |
| `~/.claude/CLAUDE.md` | memory file | user, all projects | — | always loaded | ~240 | keep as-is |

**Scan window:** 150 most-recently-modified session transcripts across 8 projects, 2099‑01‑18 → 2099‑01‑25 (7 days). Lifetime counters cover all 461 startups since install.

Jargon, once: *skills* are task-specific instruction files; *MCP servers* are connections to external tools; *plugins* are add-on bundles; *hooks* are scripts that run automatically on events; *context* is what I read at the start of every session.

---

## Proposed actions

### Check 0 — setup health: nothing wrong
Native install at `~/.local/bin/claude`, matching `installMethod: "native"`. No npm-global copy, no leftovers, `~/.local/bin` is on `$PATH`. All settings files parse cleanly. All three agent definitions in `~/.claude/agents` have valid frontmatter and unique names. Nothing to fix.

*Minor note, no action proposed:* your global CLAUDE.md tells me to read `tasks/lessons.md` at session start, but this repo has no such file — that instruction is a no-op here.

### Check 1 — unused extensions

**A. Disconnect 3 unused connectors.** Zero tool calls across 150 sessions. `example-connector-a` is the one that actually costs you: it ships a long instruction block that sits in context every single session (~600 est. tokens). The other two are deferred (their tool schemas load on demand), so removing them is decluttering, not token savings.

- **Where:** these are managed in connector settings, not in any local file. I can't disable them from here.
- **Alternative (per-project, local):** `/mcp disable "example-connector-a"` — but note this toggle is **per-project**.
- Reversible: reconnect at any time.

**B. Remove 2 unused plugins.** `docs-plugin` and `tidy-plugin` have zero lifetime uses; their `lastUsedAt` is just the install seed, not real activity.

- **Caveat:** both are installed at *local scope* to another worktree — they are **not loaded in this project**, so removing them saves nothing here. The edit target would be that project's `.claude/settings.local.json`:
  ```json
  "enabledPlugins": {
    "docs-plugin@example-marketplace": false,
    "tidy-plugin@example-marketplace": false
  }
  ```
- Easier path: run `/plugin` from that project.
- Reversible: set back to `true` or reinstall.

**C. Stale entry, optional.** `~/.claude/settings.json` enables a plugin at user scope that is only installed locally elsewhere. Harmless, just inconsistent. No action recommended.

### Check 2 — LOCAL memory dedup: nothing found
`~/.claude/CLAUDE.md` (947 chars) has no overlap and no contradiction with this repo's checked-in `CLAUDE.md`. No `CLAUDE.local.md` exists here or in any ancestor directory. Nothing to dedup.

### Check 3 — trim derivable content from checked-in CLAUDE.md

`CLAUDE.md` is 3,396 chars (~850 est. tokens) — well under the ~40,000-char warning threshold. It's already lean; only two small cuts qualify.

**File: `/path/to/repo/CLAUDE.md`** — cut ~4 lines, ~60 est. tokens saved:

1. Boilerplate preamble (line 3) — says nothing a session doesn't already know:
   ```
   This file provides guidance to Claude Code when working with code in this repository.
   ```
2. Two derivable command lines (lines 12–13) — `package.json` already declares `"test": "node --test"`:
   ```
   npm test
   node --test path/to/one.test.mjs
   ```

**Kept deliberately:** the non-guessable tool invocation, the custom env-var example, the entire **Invariants** section (failure contracts and safety prohibitions — keep-always), and the Architecture split rationale.

These would be ordinary working-tree edits you'd review in `git diff` — I'd never commit them.

### Check 4 — migrate to lazy loading: nothing to migrate
What survives check 3 is universal repo constraints, safety-critical prohibitions, and design rationale — all correctly always-loaded. No proposal.

### Check 7 — version: up to date
Installed **9.9.9**; latest on the `latest` channel is **9.9.9**. Nothing to do.

### Check 8 — auto mode: already your default
`~/.claude/settings.json` has `"permissions": {"defaultMode": "auto"}` at user scope, and this project defines no settings file that could shadow it. Healthy — no proposal.

### Check 9 — pre-approve denied read-only commands: nothing worth proposing
Only 26 denials in 150 sessions, and none of them would be fixed by an allow rule:

| Pattern | Count | Kind mix | Why no rule |
|---|---|---|---|
| `AskUserQuestion` / `ExitPlanMode` | 8 | `user-rejected` | You deliberately said no; not allowlistable operations |
| `grep -n`, `ls src`, `sed -n` | 11 | `automode-unavailable` | Already auto-allowed; a rule wouldn't help |
| `example-browser__javascript_tool` | 6 | `permission-rule` | **Not read-only** — executes JavaScript. Never allowlist. |
| `Agent` | 1 | `automode-unavailable` | Not read-only |

No `permissions.allow` rules proposed.

---

## Warnings (no actions)

### Check 5 — hooks: all fast, one that was failing is already gone
| Hook | Runs in window | Median | Max |
|---|---|---|---|
| `PreToolUse:Bash` | 520 | 71 ms | 163 ms |
| `Stop` | 103 | 26 ms | 66 ms |
| `UserPromptSubmit` | 51 | 10 ms | 30 ms |
| `PostToolUse:Edit` | 10 | 61 ms | 80 ms |
| `SessionStart` (startup/clear/compact/resume) | 14 | 13–46 ms | 156 ms |

Everything is far under the thresholds (2 s for per-call events, 10 s for session events), and **zero hooks timed out**.

One thing to know: **104 hook runs failed** in the window — all from one hook that has since been removed. These were non-blocking errors, so they never broke anything. Nothing to fix unless you see it recur.

### Check 6 — where your context actually goes
| Component | Est. resident tokens/session |
|---|---|
| This repo's `CLAUDE.md` | ~850 |
| **`example-connector-a` server instructions** | **~600** |
| Your 4 active skills' listing entries | ~540 (of which `alpha-skill` alone is ~320) |
| `~/.claude/CLAUDE.md` | ~240 |
| Deferred MCP tool-name lists | ~100 |
| Non-deferred MCP tool schemas | 0 — every server you have is deferred |

Total user-controlled resident cost ≈ **2.3k est. tokens**. The single biggest avoidable item is `example-connector-a`'s instruction block, for a connector you've never invoked.

All figures are disk-based estimates (chars ÷ 4). Run `/context` for the exact live measurement.

---

## Nothing was changed

Per your instruction, this is report-only — I made no edits. If you want, I can apply any subset.
