# Lessons

Rules written after a correction, to stop the same mistake recurring. Read at session start.

## A fix isn't done when the tests pass — it's done when the docs match

*2026-07-27, after the Windows path fix in #17.*

Two behavioral fixes went in with green CI on all three OSes and no doc change. Both
warranted one:

- **Shipped behavior changed → `CHANGELOG.md` needs an entry.** The test is whether the
  old behavior ever reached a user. `checkCmdPath` had been blind to Windows paths since
  #3, so fixing it changes what a released version does and belongs under `[Unreleased]`.
  A bug in code introduced *earlier in the same unmerged branch* does not — it never
  shipped, and an entry for it is noise. Apply that test per commit, not per PR.
- **A bug that was possible because of a missing rule → `CLAUDE.md` invariant.** If the
  next person could reasonably write the same bug, the fix is incomplete until the rule
  exists. "Anything reading a path out of a string must accept `C:\...`" is now an
  invariant precisely because nothing stopped it being written POSIX-only.

Both belong in the **same commit as the fix**. Doing it after being asked means the merged
history has a window where the code and the docs disagree.

Corollary on scope: `SKILL.md` documents each script's flags, so it changes when the flag
surface changes. Adding a guard that produces a better error for an existing flag is not a
doc change — resist padding the diff to look thorough.
