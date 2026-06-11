# SOUL.md playbook — step 10

> Loaded on demand by SKILL.md. The UX contract and Rules in SKILL.md apply here.

## STEP 10: Propose a `SOUL.md` (give the install a soul)

Cleanup removes junk; this step adds identity. `SOUL.md` is a stable profile of the **human** — who they are, how they want to be talked to — so Claude knows who it's serving on every session.

**First, explain the value to the dev** (plain language), then offer to build one via AskUserQuestion (Yes / Not now):

> Cleaning Claude is half the job — the other half is Claude knowing *who it's talking to*. A `SOUL.md` is your profile: tone, how much autonomy you give, pet peeves, default stack, what "done" means to you. It loads every session via `@SOUL.md` and makes every answer fit you instead of a generic dev. It's the **soul** to the install's clean body.

`SOUL.md` vs the other files:
- `CLAUDE.md` = **how** to work (operational rules, per project).
- `SOUL.md` = **who** the human is (stable identity — tone, autonomy, peeves, stack, definition of done).
- Keep churny state (active projects, current tasks) OUT of SOUL — it goes stale. Put it in memory / an MCP instead.

If the dev says yes, **interview them with AskUserQuestion buttons** (their preferred input). Cover these axes, ~3 questions per round, options + free-text "Other":
1. **Role** — what they do (sets the tone).
2. **Communication** — language, verbosity, how much jargon, learning style (analogy-first vs trade-offs vs examples).
3. **Pet peeves** — what to always avoid (preamble, assuming, sycophancy, over-engineering…).
4. **On disagreement** — push back hard / point out + alternative / obey-but-warn.
5. **Autonomy** — how far to run before checking in; clarify it means executing the agreed plan, not inventing scope.
6. **Default stack** — languages/frameworks to suggest first.
7. **Definition of done** — what makes them trust a delivery (ran it / tested+verified / clean+explained).
8. **Tone** — dry/blunt vs light vs neutral.

Then:
- Write `~/.claude/SOUL.md` from the answers — tight, only facts that change how the agent acts.
- Wire it: add `@SOUL.md` to the top of `~/.claude/CLAUDE.md` so it loads each session (it is NOT auto-loaded otherwise).
- Read it back and offer to adjust. Stop when more questions would only add bloat — say so honestly.

**Keep it lean (hard budget).** `SOUL.md` rides into every session via `@SOUL.md` (on top of `CLAUDE.md`) — the two share one context budget, so the same discipline applies:
- **≤ 200 lines and ideally ≤ ~1500 tokens** (`wc -l ~/.claude/SOUL.md`).
- Only facts that **change how the agent acts**. No biography, no nice-to-know trivia, no churny state (projects/tasks go to memory, not here).
- One crisp line per trait. If an interview answer doesn't shift behavior, drop it instead of recording it.
- Show the final line+token count so the dev sees what loads every session.
