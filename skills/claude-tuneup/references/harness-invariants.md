# Harness invariants — seed list for step 13

> Loaded on demand by `references/instructions.md`. The UX contract and Rules in `SKILL.md` apply here.

Things the Claude Code runtime or session prompt already does, which an instruction in a memory file
can contradict. Step 13 matches the user's lines against this list.

**Verified against Claude Code 2.1.220.** If the installed version is newer, say so in the report:
this list is maintained by hand and drifts between releases.

## The honest limit — state it in the report

The session system prompt is not readable from disk. This check compares against a maintained list,
so it is **incomplete by construction**. Report findings as *"conflicts I can currently detect"* —
never as a clean bill of health. An empty result means this list found nothing, not that the user's
instructions are conflict-free.

## The list

Entries 1–5 are **confirmed** and produce a *conflict* finding. Entries 6–8 are **inferred** and
produce a *possible conflict* — say "possible" out loud, and never propose a rewrite as confidently.

| # | Harness behavior | Contradicting instruction shape | Evidence |
|---|---|---|---|
| 1 | The session prompt may forbid calling the Agent tool unprompted | "delegate all execution to subagents", "always spawn a subagent for X" | **Confirmed** — appears verbatim in real session prompts |
| 2 | Auto-memory writes what it learns to the memory dir itself | "record what you learn in CLAUDE.md", "append decisions to SOUL.md", "keep a lessons file and read it at session start" | **Confirmed** — memory module, Claude Code 2.1.220 |
| 3 | Skills load on trigger; only the description is resident | "always read `~/.claude/skills/foo/SKILL.md` at session start" | **Confirmed** — forces resident cost the harness deliberately avoids |
| 4 | MCP tool schemas are deferred behind a tool search by default | "the X tool is always available, just call it" | **Confirmed** — `/doctor` check 1 documents deferral |
| 5 | Permission posture is a settings concern | "never ask me before running commands", "always ask before every command" | **Confirmed** — this is `permissions.defaultMode`, which a memory file cannot grant |
| 6 | Todo and task tracking is model-managed tooling | "always write a plan to `tasks/plan.md` before coding" | **Inferred** — may be a legitimate project convention |
| 7 | Context compaction is automatic; work continues across it | "stop and hand off when the context gets long" | **Inferred** |
| 8 | The harness may provide a scratchpad/temp directory | "always use `/tmp` for temporary files" | **Inferred** |

## Trigger vocabulary

`audit-instructions.mjs` greps for these to narrow the candidate set. The words are a net, not a
verdict — every hit still needs the judgment call below.

`subagent` · `delegate` · `Agent tool` · `at session start` · `always read` · `never ask` ·
`always ask` · `remember this in` · `record ... in CLAUDE.md` · `lessons.md` · `/tmp` · `hand off`

## How to report a conflict

Never auto-resolve. Some users deliberately override a default, and writing that down is a
legitimate choice — the failure is doing it *unknowingly*.

For each finding, show:

1. The user's line, quoted verbatim.
2. What the harness does instead, in one plain sentence.
3. The evidence label — **confirmed** or **inferred** — and what that means for their confidence.
4. The concrete failure mode: what actually goes wrong if both stay.

Then AskUserQuestion (with the mandatory explain button):

- **Rewrite it to cooperate with the harness** — show the rewrite.
- **Keep it, I mean it** — record the accepted conflict in the summary, unchanged.
- **Delete it** — the harness already covers it.

## Maintaining this list

Adding an entry requires an observable, stable behavior and an evidence label. A pattern someone
*thinks* the harness does is not an entry. When a Claude Code release changes one of these, fix the
row rather than deleting it — a user whose instruction was written for the old behavior still needs
to be told.
