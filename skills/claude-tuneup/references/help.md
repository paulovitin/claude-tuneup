# Claude Tuneup help

On `help` or `?`, show this card and stop without running helpers.

```
claude-tuneup — audit your Claude Code instructions + reclaim disk (undoable; asks first)

Runs the built-in /doctor first and works from its report.
A complement to it, not a replacement.

Groups:
  cleanup       steps 1–8,19 remove junk + fix config integrity
  instructions  steps 12–18  audit the rules + descriptions that load every session
  claude.md     step  9      the global CLAUDE.md + its AGENTS.md bridge
  soul.md       step 10      migrate a legacy SOUL.md into auto-memory, then retire it
  summary       step 11      always runs last; shows what changed + how to undo

How to trigger:
  claude-tuneup                    → runs everything
  claude-tuneup cleanup            → run a group by name
  claude-tuneup instructions       → (cleanup | instructions | claude.md | soul.md | summary)
  claude-tuneup 1-3                → run a step range
  claude-tuneup 6,7                → run specific steps
  claude-tuneup claude.md soul.md  → combine groups
  claude-tuneup restore            → undo a previous run from a backup
  claude-tuneup fix                → "X stopped working": find which run did it, put back
                                     just that one thing
  claude-tuneup --dry-run          → scan + report what would change, touch nothing
  claude-tuneup --all              → also re-ask everything you kept in earlier runs
  claude-tuneup help               → show this card

A full run waits ~6 min on /doctor up front, and asks before spending another 6 to verify.

Backups: every run snapshots configs + moved items to ~/.claude-tuneup/backups/<run-id>/.
Undo anytime with "claude-tuneup restore". If something only breaks days later,
"claude-tuneup fix" traces it back and restores just that item. After any undo it
asks what went wrong and offers a second attempt built around your answer.
```
