# Instructions playbook — steps 12–18

> Loaded on demand by `SKILL.md`. The UX contract and Rules in `SKILL.md` apply here.

Every check here implements one rule from Anthropic's [**The new rules of context engineering for
Claude 5 generation models**](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) — step 12 is judgment over rigid rules, 13 is not fighting the
harness, 14 is saying it once, 15 is interfaces over examples, 16 is progressive disclosure.

Cleanup takes junk off the disk. This group takes junk out of the **instructions** — the files that
load into every session and shape how Claude behaves. Nothing here is about space; everything here
is about whether what the dev wrote still helps.

**Where these run.** The user-level layer: `~/.claude/CLAUDE.md` (and `AGENTS.md` through its
imports), `~/.claude/agents/*.md`, `~/.claude/skills/*/SKILL.md` frontmatter, `~/.claude/commands/**/*.md`,
`~/.claude/output-styles/*.md`, and the skills/agents/commands a plugin brings with it. A project's own
files only when the dev is standing in one *and* opts in — for a checked-in project `CLAUDE.md`, say so
plainly: **`/doctor` checks 3 and 4 do that job, run it there.**

**Cost is labelled, not assumed.** Every surface `--surfaces` returns carries a `residency`:

| Label | Means | How to talk about it |
|---|---|---|
| `confirmed` | verified resident every session | state the token cost as fact |
| `inferred` | believed resident, not verified against a running Claude Code | say **"possible"** cost; never argue a rewrite as confidently |
| `none` | costs nothing until selected (an unpicked output style) | clutter, not spend — that is STEP 18's business |

`approxResidentTokens` counts only `confirmed`; `approxResidentTokensInferred` is reported separately.
**Never add them together for the dev** — half the sum would be a guess wearing a number's clothes.

**Plugin-bundled surfaces are report-only.** They arrive with a `plugin` name and `reportOnly: true`.
They count toward the budget and toward duplication findings, but the action is never "delete this
file" — it is uninstalling the plugin, which is STEP 2's decision, under STEP 2's `listingReliable`
fuse.

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

Compare every resident surface at once, which nothing else does:

1. `~/.claude/CLAUDE.md` (+ `AGENTS.md` via import)
2. `~/.claude/agents/*.md` — frontmatter `description` **and** body
3. `~/.claude/skills/*/SKILL.md` — frontmatter `description`
4. `~/.claude/commands/**/*.md` — frontmatter `description`, named by path (`git/commit.md` → `git:commit`)
5. `~/.claude/output-styles/*.md` — the **active** one's body, which replaces the system prompt
6. Plugin-bundled skills/agents/commands — report-only
7. MCP tool descriptions, read-only, when a live listing is available

Four failure shapes to look for:

- **Global file → agent body.** An agent already inherits the global file; the copy is pure
  duplication that also drifts.
- **Global file → skill description.** The worst kind: the skill listing is resident in *every*
  session, budgeted at roughly 1% of context.
- **Agent description → agent body.** The description says *when to route here*; the body says
  *what to do*. A description that restates the body inflates the resident listing.
- **Command ↔ skill.** A slash command and a skill covering the same procedure is the newest way to
  pay twice: the command is explicit invocation, the skill is model-chosen. Keeping both is a
  legitimate choice — keeping both *and* maintaining the steps in both is not. Propose one as the
  body and the other as a pointer to it.

Then propose the placement rule:

| Kind of information | Its one home |
|---|---|
| Routing / selection ("use this when…") | the `description` field |
| Execution instructions | the body |
| A procedure the dev invokes deliberately, by name | a slash command in `~/.claude/commands/` |
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
- **Missing entirely** — everything in `noFrontmatter`. A slash command with no `description` still
  works when typed, but nothing can route to it and the dev's own list reads as blank. Cheapest fix
  in the whole group: one line of frontmatter.
- **Over budget** — sum every resident description against the ~1% listing budget. Past it, routing
  degrades. `/doctor` check 1 reports the total; this step names *which* descriptions are paying it.

Propose a rewrite per item — capability plus boundary, no example phrases — with before/after
character counts. Order the queue by `residentChars` descending: the longest description is where a
rewrite actually buys something.

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

Every skill this step writes goes through `backup.mjs created "$RP" <path>`, same as STEP 17's —
a block moved out of `CLAUDE.md` into a new skill is an addition as much as a subtraction, and
undo has to be able to reverse both halves.

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

Record every skill created here **two ways**, right after writing it:

```bash
node "$SKILL_DIR/scripts/backup.mjs" created "$RP" ~/.claude/skills/<name>
```

- In the restore point, with the command above — so `restore` can undo the addition and a later
  `fix` can trace a regression back to it. A skill that shadows an existing one changes routing
  without deleting anything, and nothing else in the run would record that it appeared.
- By name in your own working list — STEP 11 and the STEP 18 filter both need it.

---

## STEP 18: Surfaces that are installed but inert

Steps 14–15 ask whether a description is *good*. This one asks whether the thing behind it ever
fires. Something installed and never triggered is the quietest cost in an install: it never shows
up as a problem, because it never shows up at all.

```bash
node "$SKILL_DIR/scripts/audit-instructions.mjs" --surfaces
node "$SKILL_DIR/scripts/scan.mjs" --section usage
```

Four shapes, each with a different honest answer:

| Shape | Signal | What to say |
|---|---|---|
| **Unselected output style** | `kind: output-style`, `active: false` | It costs **nothing** resident — an output style only loads when picked. This is clutter, and the honest pitch is tidiness, not tokens. Don't dress it up as savings. |
| **Never-used agent** | zero count in `usage.agents` | Only when `usage.countersPresent` includes `agentUsage`. Otherwise there is **no data**, which is not the same as no use — say so and skip. |
| **Command duplicating a skill** | STEP 14's command ↔ skill finding | Route it back to STEP 14; the fix is deduplication, not deletion. |
| **Unreadable frontmatter** | anything in `skipped` | Not a removal candidate at all. The file may be fine and our parser conservative. Report the path and the reason, offer to look at it together. |

Two hard rules:

1. **Absence of a counter is not absence of use.** `scanUsage` reports `countersPresent` precisely so
   this step can tell "used zero times" from "we cannot see usage". Never merge them.
2. **Nothing created by this run is ever a candidate here** — same trap as STEP 11's verification
   pass, same safeguard: filter against the names from steps 16 and 17.

Removals go through `backup.mjs stash`, never `rm` — an output style or agent is the dev's own
writing. Plugin-bundled surfaces (`reportOnly: true`) are out of scope: the action there is STEP 2.
