# Instructions playbook — steps 12–17

> Loaded on demand by `SKILL.md`. The UX contract and Rules in `SKILL.md` apply here.

Every check here implements one rule from Anthropic's [**The new rules of context engineering for
Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) — step 12 is judgment over rigid rules, 13 is not fighting the
harness, 14 is saying it once, 15 is interfaces over examples, 16 is progressive disclosure.

Cleanup takes junk off the disk. This group takes junk out of the **instructions** — the files that
load into every session and shape how Claude behaves. Nothing here is about space; everything here
is about whether what the dev wrote still helps.

**Where these run.** The user-level layer: `~/.claude/CLAUDE.md` (and `AGENTS.md` through its
imports), `~/.claude/agents/*.md`, `~/.claude/skills/*/SKILL.md` frontmatter. A project's own files
only when the dev is standing in one *and* opts in — for a checked-in project `CLAUDE.md`, say so
plainly: **`/doctor` checks 3 and 4 do that job, run it there.**

**Read-only by default.** Steps 12–16 propose; they change nothing until the dev picks a button.
Every edit is covered by the run's restore point from STEP 0.5.

**Order is the point.** Subtract before reorganizing, reorganize before adding: 12–14 remove, 15–16
restructure what survives, 17 is the only step that adds anything.

## The scripts this group uses

```bash
node "$SKILL_DIR/scripts/audit-instructions.mjs"              # candidate signals, per line
node "$SKILL_DIR/scripts/audit-instructions.mjs" --surfaces   # every resident description, extracted
node "$SKILL_DIR/scripts/scan.mjs" --section memory           # what loads each session, and its cost
```

The scripts detect signals and count tokens. **They never classify and never rewrite** — that is the
whole division of labor in this skill, and it matters most here, where a wrong verdict edits the
dev's own words.

---

## STEP 12: Rules that should be judgment

Rigid rules were how you got a model to behave. Current models read context and infer — so a rule
written to compensate for an older model now just costs tokens and blocks the right call in cases
its author never imagined.

Run the helper for candidates, then sort each one into **exactly one** bucket. The sorting *is* the
step:

| Bucket | The question to ask | What to do |
|---|---|---|
| **Safety-critical** | Would breaking it cause irreversible damage or a security incident? | **Keep verbatim. Never soften.** "never push to main", "never commit secrets" |
| **Environment fact** | Is it a fact about *this* machine or org that can't be discovered? | **Keep**, but rewrite from order to fact — something to reason from, not obey |
| **Written for an older model** | Is it a rigid constraint on style, verbosity or process that a current model gets right from context? | **Propose a judgment rewrite** |
| **Already enforced mechanically** | Does a linter, hook, or CI check enforce it? | **Propose deleting it** — it is being enforced twice |

The shape of a good rewrite: **replace the prohibition with the goal the prohibition was
protecting**, and let the model infer the action.

> *before:* "default to writing no comments. Never write multi-paragraph docstrings."
> *after:* "Write code that reads like the surrounding code: match its comment density, naming, and idiom."

Show each finding as a per-line diff: original quoted, rewrite offered, bucket and one-line reason
visible. Then AskUserQuestion per batch. **A dev who wants their absolute kept is right by
definition** — it is their file. Record it and move on.

---

## STEP 13: Conflicts with how Claude Code already works

An instruction that fights the runtime doesn't win — it just burns context and produces confusing
behavior. Read `"$SKILL_DIR"/references/harness-invariants.md` and follow it: it holds the list,
the evidence labels, the honest limit to state, and the three-button reporting contract.

---

## STEP 14: The same instruction in four places

An instruction repeated across layers costs tokens every session and drifts — the copies stop
agreeing and nobody notices which one won.

```bash
node "$SKILL_DIR/scripts/audit-instructions.mjs" --surfaces
```

Compare four surfaces at once, which nothing else does:

1. `~/.claude/CLAUDE.md` (+ `AGENTS.md` via import)
2. `~/.claude/agents/*.md` — frontmatter `description` **and** body
3. `~/.claude/skills/*/SKILL.md` — frontmatter `description`
4. MCP tool descriptions, read-only, when a live listing is available

Three failure shapes to look for:

- **Global file → agent body.** An agent already inherits the global file; the copy is pure
  duplication that also drifts.
- **Global file → skill description.** The worst kind: the skill listing is resident in *every*
  session, budgeted at roughly 1% of context.
- **Agent description → agent body.** The description says *when to route here*; the body says
  *what to do*. A description that restates the body inflates the resident listing.

Then propose the placement rule:

| Kind of information | Its one home |
|---|---|
| Routing / selection ("use this when…") | the `description` field |
| Execution instructions | the body |
| Cross-cutting constraints | `~/.claude/CLAUDE.md` |

Show the resident-token delta for every removal — that number is the argument.

**Frontmatter caution.** The extractor reads a conservative subset of YAML. Any file it can't parse
confidently is **reported and skipped, never guessed at**. A mis-read description would invent a
duplicate that isn't there, and the dev would delete something real on our word.

---

## STEP 15: Descriptions that route

A `description` is an interface: it is what Claude sees when deciding whether to load the thing. It
is resident in every session, so it is also the most expensive text the dev owns. A good one states
capability and boundary and needs no examples.

What to flag:

- **Example-stuffed** — lists trigger phrases instead of describing capability. **Carve-out, and it
  is mandatory:** example phrases in a *different language* than the description's main language are
  real routing work — they carry a signal no monolingual sentence can. **Never flag those.** Only
  same-language examples that restate the capability sentence count.
- **Capability-silent** — names the thing but not what it does or when to pick it ("Helper for X").
- **Boundary-silent** — never says when *not* to route here. The usual cause of a skill firing on
  the wrong prompt.
- **Overlapping** — two descriptions a reader can't tell apart. A routing ambiguity no token count
  reveals.
- **Over budget** — sum every resident description against the ~1% listing budget. Past it, routing
  degrades. `/doctor` check 1 reports the total; this step names *which* descriptions are paying it.

Propose a rewrite per item — capability plus boundary, no example phrases — with before/after
character counts.

---

## STEP 16: Restructure the global CLAUDE.md

This is the file `/doctor` structurally leaves alone: its checks 3 and 4 both carve
`~/.claude/CLAUDE.md` out. So it is ours, and it is usually the one nobody has ever pruned.

Read it end to end and give **every block exactly one verdict**:

| Verdict | The test | Where it goes |
|---|---|---|
| **Stays** | An environment or org fact the model can't discover, true in *every* project | stays put |
| **Stays (safety)** | A prohibition on something irreversible | stays put, **verbatim**, never moved into a lazily-loaded skill |
| **Becomes a skill** | A task-specific procedure — steps, invocation syntax, used sometimes | `~/.claude/skills/<name>/SKILL.md`, frontmatter written to step 15's standard |
| **Becomes a memory** | A fact about the dev or the ongoing work, not a rule | auto-memory (see the soul-md playbook) |
| **Deleted** | Derivable, generic, or enforced by a linter | — |

The move that pays: a procedure with invocation syntax, relevant in maybe one session in twenty,
sitting resident in every one of them. As a skill it costs a single description line and loads its
detail only when used.

The move that must not happen: relocating a safety rule into a skill. A skill that isn't loaded
can't stop anything.

Propose the whole restructure as **one reviewable set** — before/after resident line and token
counts, every moved block quoted, every new skill's frontmatter shown — and apply only after
confirmation.

---

## STEP 17: Workflows you repeat but never wrote down

**Every other check in this skill, and every check in `/doctor`, can only find what the dev already
wrote.** Steps 12–16 read files. `/doctor` check 4 turns a workflow into a skill only if that
workflow is already sitting in a `CLAUDE.md`. None of them can see the deploy dance done every week
and never documented once.

`/insights` reads the *sessions*, so it can. That is why this step exists and why it runs last.

The call was already fired back at STEP 0.6, so the result is cached and there is no wait here:

```bash
node "$SKILL_DIR/scripts/insights.mjs"            # cached from STEP 0.6
node "$SKILL_DIR/scripts/scan.mjs" --section usage  # fallback: no session history
```

**Privacy.** The report is the dev's own local data. Read it live, with them, to drive the proposals
below — never paste its contents anywhere shared, and skip anything resembling a secret, token, or
private path.

Look for a recurring multi-step task with a stable shape — same tools, same order, same domain —
that has no skill and no `CLAUDE.md` entry. Recurring **friction** counts too: the same thing going
wrong repeatedly is a workflow that deserves writing down once.

Then propose **a skill**. Never a `CLAUDE.md` addition:

- `~/.claude/skills/<name>/SKILL.md`, frontmatter written to step 15's standard.
- Body drafted from the observed shape and confirmed with the dev before writing.
- If they don't recognize it as a real pattern, **drop it.** Three sessions is a coincidence, not a
  workflow.
- **Never propose a rule.** If the only honest output is "add a line telling Claude to do X", that
  belongs in step 12's queue as a candidate to question — not here.

**If `sections` comes back empty or carries a `note`,** the `/insights` HTML layout changed under the
parser. The `report` path is still valid: read the file directly. The script deliberately doesn't
cache an empty parse, so a later run re-tries.

Record every skill created here by name — STEP 11 needs that list.
