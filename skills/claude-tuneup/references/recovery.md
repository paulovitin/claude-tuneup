# Recovery and run preparation

Read the section selected by SKILL.md. `$SKILL_DIR` remains the skill root; helper paths do not change when reading this reference. The entrypoint owns the mutation contract and question format.

## Restore a previous run

For `restore`, undo the selected scope without running cleanup. Reuse the developer's explicit choice of item, restore point, and scope; ask only for information or authorization that is still missing.

### One specified item

When the developer asks to restore only a named removed/created item, use `list` or `search` to resolve its recorded path and restore point. If multiple runs are plausible, show the candidates and settle that ambiguity. Do not broaden a settled one-item scope into a full restore.

Apply `node "$SKILL_DIR/scripts/restore.mjs" apply <RP> --only <path>`. This path does not restore configuration snapshots. It brings back the recorded removed item or moves a recorded creation to `<RP>/undone-creations/`; a newer item at the destination is preserved via the collision path. Report the actual result and any collision. Follow **Fix a regression in a later session** to update only that item's decision; do not `revert-run` the unrelated accepted changes. Leave current configs and other items alone, keep the restore point available, and stop. Offer another tune-up attempt only if requested.

### Full run or selected category


1. List restore points: `node "$SKILL_DIR/scripts/restore.mjs" list` (timestamp, how many items removed, log size).
2. Ask (AskUserQuestion, with the mandatory "What does this do?" button) which restore point to use.
3. Ask the **scope**: "Full restore" / "Configs only" / "Removed items only" (plus the explain button). Configs-only is the safe pick when the dev just wants a botched `CLAUDE.md`/`.claude.json` edit undone; items-only brings back deleted skills/dirs without touching configs.
4. **For a scope that includes configs, warn before applying.** That restore copies *old* configs back over the current ones. `.claude.json` carries live state (projects, session pointers) — so restoring it can drop projects/sessions created **after** the backup. Say this explicitly and confirm. The script protects you two ways: it first saves the **current** configs into a `pre-restore-…` folder (so the restore is itself reversible), and it never overwrites a newer item that re-took a removed path (those land at `<path>.restored-<ts>` instead).
5. Apply: `node "$SKILL_DIR/scripts/restore.mjs" apply <RP> [--configs-only|--items-only]` — prints `restored`, `collisions` (items that couldn't take their original path and where they went), `undoneCreations` (skills the run *added*, moved into `<RP>/undone-creations/` — report these by name; a dev who has started using one will want it back), `preRestoreSnapshot` (the pre-restore safety copy, when configs were restored), and `manualReAdd` (marketplaces/plugins for you to replay).
6. If JSON configs were restored, validate them: `node "$SKILL_DIR/scripts/validate-json.mjs" ~/.claude.json ~/.claude/settings.json`. Report `collisions` to the dev so they resolve any `.restored-<ts>` items by hand. Offer to keep or purge the restore point + the pre-restore snapshot afterward.
7. For a full-run undo, retire that run's decisions: `node "$SKILL_DIR/scripts/ledger.mjs" revert-run <run-id>`, where `<run-id>` is `$RP`'s basename — the restore point *is* its run id by construction (`restorepoint.mjs`'s `runIdOf`, also surfaced as the `runId` field in `restore.mjs list`/`search`/`apply` output, so you never have to compute it by hand). Undoing a run un-decides it — leaving the verdicts in place would keep suppressing questions about changes that no longer exist. The ledger itself survives (it lives beside the backups, not inside them), so every *other* run's decisions stand. For `--configs-only` or `--items-only`, update only affected item decisions using the surgical recovery procedure; do not retire accepted changes that remain applied.
8. Then offer the retry — see "After an undo" below.

---

## Restore point (STEP 0.5)

A tune-up must be undoable. Before the first **mutation** of the run (not on dry runs), create a restore point and log every action into it.

Backups live in a **stable location outside the skill** — `~/.claude-tuneup/backups/<run-id>/` (override with `$CLAUDE_TUNEUP_STATE`). This is on purpose: a skill update, reinstall, or move between `~/.claude/skills` and `~/.agents/skills` must **not** take the undo history with it. Snapshots are chmod-restricted (owner-only) because `.claude.json` can carry tokens. `restore` still scans the legacy in-skill `.backups/` too, so older restore points keep working.

```bash
RP=$(node "$SKILL_DIR/scripts/backup.mjs" create)   # snapshots configs, prints the restore-point path
```

`backup.mjs create` snapshots the small irreplaceable config files (`.claude.json`, `settings*.json`, `CLAUDE.md`, `SOUL.md`), seeds `actions.log` + `removed.json`, and names the restore point with a collision-proof run id (so two runs in the same second never clobber each other).

Deletion policy:
- **Unique / irreplaceable** (real skills, project data, configs, anything the dev can't easily regenerate) → `node "$SKILL_DIR/scripts/backup.mjs" stash "$RP" <path>` (moves it into the restore point, logged + restorable), never `rm`.
- **Anything the run CREATES** (steps 16 and 17 write new skills) → `node "$SKILL_DIR/scripts/backup.mjs" created "$RP" <path>`, right after writing it. A run subtracts *and* adds, so recording only the removals makes "undo everything" a false promise and leaves an addition untraceable when it turns out to be what broke something. The file is not copied or touched — this only records that the run put it there.
- **Self-regenerating artifacts** (venvs, plugin caches) → hard `rm` is fine; they rebuild. OS cruft (`.DS_Store`, `Thumbs.db`) → skip entirely.
- **Marketplace / plugin removals** → can't move; record the re-add command: `node "$SKILL_DIR/scripts/backup.mjs" log "$RP" "marketplace removed: <name> (re-add: claude plugin marketplace add <url>)"`.
- Config edits are covered by the snapshot above.

Tell the dev the restore point exists and how to undo (see STEP 11). Only ONE restore point per run; if a step is skipped, the snapshot is still valid.

---

## Initial diagnostics (STEP 0.6)

Both are Claude Code's own built-ins, both run headless, and **both are fired here, at the start.**

```bash
node "$SKILL_DIR/scripts/doctor.mjs"     # ~6 minutes; report-only, changes nothing
node "$SKILL_DIR/scripts/insights.mjs"   # reads the dev's sessions
```

**Tell the dev the wait is coming, with the real number** — *"the built-in checkup takes about six
minutes"* — never a vague "one moment". Then start both; they don't depend on each other.

**Why `/insights` fires here even though step 17 is the last step to use it.** Its result is cached
for an hour, so the call and the consumption don't have to happen at the same moment. Running it now
also means it reads the session history **before** cleanup step 6 offers to prune it — otherwise the
run would degrade its own evidence and never notice.

**Why `/doctor` runs at all.** It sees things this skill's scan structurally cannot: real per-component
usage counts across every project, resident-token estimates, and connectors that cost context without
ever being called. Steps 1, 2 and 4 read its verdicts instead of guessing. It is also the right tool
for a project's checked-in `CLAUDE.md`, which is why step 9 hands that work to it by name.

**Report-only is enforced.** `doctor.mjs` always appends an instruction telling `/doctor` to report and
apply nothing — a test asserts this — because a headless run has no confirmation prompts to stop it.
Never call `claude -p "/doctor"` by hand from this skill; go through the script.

**Both are optional by design.** Either can return `{ ok: false, reason }` — no session history, no
`claude` on PATH, a timeout. Say so in one line and **continue the run without it.** A tune-up must
never depend on either succeeding.

---

## When a step fails mid-run

**A failed mutation halts the run.** Not the step — the run. Everything after it was going to
reason about an install state that no longer matches what either of you thinks is there. This is the
same logic as Rule 3, applied to a worse case.

Two kinds of failure, and only one of them halts:

- **Read failures continue.** A scan section that returns nothing, `/doctor` or `/insights` coming
  back `ok:false` — say it in one line and carry on. That is already the contract in STEP 0.6.
- **Mutation failures halt.** A `move`/stash that threw, a `plugin uninstall` that exited non-zero,
  a config edit whose `validate-json.mjs` came back bad, a delete that didn't stick.

**Never roll back automatically.** An unrequested rollback is a second destructive surprise on top
of the first. Halt, report, ask.

What to report, before offering anything:

1. **The raw error.** Verbatim — exit code, stderr, the failing path. Do not paraphrase it into
   reassurance.
2. **What already changed** in this run, from `$RP/actions.log`, and **what never ran** because you
   stopped. The dev's first question is "what state am I in?" — answer it before asking anything.
3. **Whether it is recoverable**: is the item sitting in `$RP/removed/`, or was this a hard `rm` of
   something regenerable?

Then AskUserQuestion, with the mandatory explain button:

- **"Roll everything back"** → `restore.mjs apply $RP`, then `ledger.mjs revert-run <run-id>`. The
  whole run, gone. Warn about the `.claude.json` caveat exactly as the `restore` path does.
- **"Undo just this step"** → put back only what this step touched:
  `restore.mjs apply $RP --only <path>` per item. Leaves the earlier steps' accepted work alone.
- **"Leave it and stop"** → change nothing further. Report the partial state and where the restore
  point is. A perfectly legitimate answer.
- **"Tell me how to fix it"** → the dev describes what to do differently. Record it as a retry
  reason and re-run **only the failed step** under it — see the retry contract below, which is the
  same machinery.

If the failure was a **broken config**, do that repair first and independently: a malformed
`~/.claude.json` or `settings.json` takes the whole install down, so restore that file from the
snapshot and re-validate before offering anything else. Don't make the dev choose between buttons
while their install won't start.

---

## Fix a regression in a later session

The common case is not a crash. It is a tune-up that finished cleanly, the dev going back to work,
and something being wrong three days later — in a session with no memory of the run, and no idea
which of a dozen changes did it. `restore list` shows timestamps and counts, which is useless for
mapping a symptom to a cause. The evidence has been in every restore point's `actions.log` the
whole time; this reads it.

**Route here on any "X stopped working / X is gone / did you delete Y?"** — including inside another
run. Do **not** start a tune-up.

1. **Get the symptom in the dev's own words.** Free text, not buttons — this is content, not a
   decision, so Rule 6 doesn't apply. What stopped working, and roughly when it last worked.
2. **Pick the search terms yourself** from what they said, and say which ones you used. "my deploy
   skill stopped firing" → `deploy skill`. The script matches and ranks; choosing the terms is
   judgment, which is your half of the split.

   ```bash
   node "$SKILL_DIR/scripts/restore.mjs" search deploy skill
   ```

   Each candidate carries `score` (how many terms hit) and matches in four places:
   `items` (**removed** — undo puts them back), `created` (**added** — undo takes them away),
   `log` lines, and lines from the snapshotted `CLAUDE.md`/`AGENTS.md`/`SOUL.md`, so "the rule I
   had about commits is gone" is findable too. `.claude.json` and `settings*.json` are never
   searched; they can carry tokens.

   **A regression can come from either direction.** The obvious cause is something removed, but a
   skill step 17 created can shadow an existing one and change routing without deleting anything —
   and the two need opposite fixes. Read the bucket, never infer the direction from the path.
3. **Show the candidates ranked, with dates, and let the dev confirm.** `score` is relevance, not
   proof — never present the top hit as the answer. If nothing matches, say so plainly and offer a
   manual walk through `restore list`; a confident wrong guess here costs them real work.
4. **Recover surgically by default.** `restore.mjs apply <RP> --only <path>` handles one item in
   whichever direction it needs: a removed item goes back, a created one is moved into
   `<RP>/undone-creations/` — moved, never deleted, because the dev may have edited a skill this
   tool wrote for them. Full rollback is available and should be offered, but it also reverts
   everything the dev was happy with — say that out loud before they pick it.
5. **Record it**, so the next tune-up doesn't propose the same removal again:

   ```bash
   node "$SKILL_DIR/scripts/ledger.mjs" decide "$KEY" keep --note "<the symptom, in their words>"
   ```

   This is the step that makes `fix` more than a rescue: without it, the next run reproposes exactly
   what just broke their setup.

---

## After an undo

An undo is the strongest signal this tool ever gets. It means a run reached the end, the dev looked
at the result, and rejected it. **Full-run undo paths end here** — a full `restore`, and STEP 11's "Undo
everything".

**1. Ask whether to retry.** AskUserQuestion, with the mandatory explain button:

- **"Try again — I'll tell you what went wrong"**
- **"No, leave it undone"** ← always available, always first-class. Someone who just wants out must
  never have to argue their way past a retry prompt.

If they decline, stop. Say the undo stands and the restore point is still on disk. Nothing else.

**2. The reason is required.** No reason, no retry — the reason is the only thing the next attempt
knows that this one didn't, so without it a retry is the same run again. Collect two things:

- **A category, as buttons** (this is the part a step can act on mechanically): *deleted something I
  needed* · *rewrote a rule I wanted kept* · *broke a config* · *changed too much at once* · *took
  too long* · *something else*.
- **Their own words, as free text.** This is content, not a decision, so Rule 6 does not apply — ask
  for it plainly. Then read it back and confirm you understood before doing anything.

```bash
node "$SKILL_DIR/scripts/ledger.mjs" record-retry --of <undone-run-id> \
  --category <slug> --reason "<their words>"
```

It returns `depth` — how many attempts already sit behind this one.

**3. Turn the reason into constraints before re-running.** This is the step that makes a retry
different from a repeat. Carrying the reason "in mind" is not enough; convert it into things the
run mechanically cannot do:

- **Name the items.** For everything the reason points at — a skill, a rule, a config key — record a
  standing keep, so no step can propose it again:
  `ledger.mjs decide "$KEY" keep --note "<reason>"`. Read `$RP/actions.log` and `$RP/removed.json`
  to resolve "my deploy skill" into the exact path the last run touched.
- **Nothing the previous run did comes back by default.** The dev reverted that result as a whole.
  Re-propose an individual piece of it only if the reason says that piece was fine.
- **Match the category to a behavior change**, and say which one you applied:

  | Category | What changes in the retry |
  |---|---|
  | deleted something I needed | that item is a standing keep; the whole step re-runs in propose-only mode, one item at a time |
  | rewrote a rule I wanted kept | every rewrite in steps 12/15/16 is shown as a diff and confirmed individually — no batched rewrite questions |
  | broke a config | config-editing steps (3, 4, 5, 8, 19) run last, one edit per confirmation, `validate-json.mjs` after each |
  | changed too much at once | drop to a single group per run; propose the smallest coherent change set and stop |
  | took too long | skip the closing `/doctor` pass, reuse the cached opening one, and cut the scope to the group that matters |
  | something else | no mechanical rule fires — the words are all you have, so restate your reading of them and get it confirmed before starting |

**4. Scope it down by default.** Suggest re-running **only the group that produced the problem**,
with "run everything again" as an explicit alternative the dev can pick. A run that just broke
something is the worst candidate for repeating in full — say that plainly rather than quietly
narrowing the scope on them.

**5. A retry is a new run.** New restore point (STEP 0.5), new run id, and record it as part of the
lineage: `ledger.mjs record-run --retry-of <undone-run-id> --id <new-run-id> …`. Before starting,
read `ledger.mjs retries --of <run-id>`: on a second retry you must satisfy the **earlier** reasons
too, or you will fix the newest complaint by reintroducing the oldest.

**6. Two failures is the cap.** If `depth` is already ≥ 2, do **not** offer a third pass. Say so
directly — twice wrong means the tool is misreading something about this install, and a third
sweep will not find it. Offer instead: a single named step, a `--dry-run`, or nothing at all.

---
