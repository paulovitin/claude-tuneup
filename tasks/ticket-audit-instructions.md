# Ticket: `audit-instructions.mjs` + auto-memory fields in `scan.mjs --section memory`

Two deliverables. The skill playbooks already call both — `references/instructions.md` and
`references/soul-md.md` were written against the contracts below, so read them first and match them
exactly.

## Read first

- `skills/claude-tuneup/scripts/lib.mjs` — the shared core. Everything routes through it.
- `skills/claude-tuneup/scripts/scan.mjs` — especially `analyzeMemory()` (exported, pure, tested)
  and `scanMemory()` (does the I/O, calls it). Same split applies to anything you add.
- `skills/claude-tuneup/scripts/scan.test.mjs` — the test style: build a fake tree, point
  `CLAUDE_TUNEUP_HOME` at it, assert on the JSON.
- `skills/claude-tuneup/scripts/doctor.mjs` — the most recent script; follow its shape for exported
  pure functions plus a guarded `isMain` entry point.
- `skills/claude-tuneup/references/instructions.md` — what part 1 must produce.
- `skills/claude-tuneup/references/soul-md.md` §10.1 — what part 2 must produce.

## Hard invariants (from `CLAUDE.md` — breaking one fails the ticket)

- **Node built-ins only.** No dependencies, **no YAML library**, no Python.
- **Cross-OS** (macOS / Windows / Linux). Handle `\r\n`. No shell strings.
- **Paths via `fileURLToPath`**, never `new URL().pathname`.
- **`CLAUDE_TUNEUP_HOME` overrides `HOME`.** Never `os.homedir()` directly — import from `lib.mjs`.
- **Read-only.** Neither deliverable writes anything, ever.
- `npm test` must pass.

---

# Part 1 — `skills/claude-tuneup/scripts/audit-instructions.mjs`

Plus `audit-instructions.test.mjs`. Read-only, JSON out via `lib.out()`, `--help` supported.

```
node audit-instructions.mjs              # instruction-line signals
node audit-instructions.mjs --surfaces   # every resident description
node audit-instructions.mjs --help
```

**The division of labor is the whole point: this script detects signals and never classifies.** It
emits candidates and counts; the agent decides what they mean. Do not add a verdict, a severity, a
score, or a suggested rewrite to any output. Getting this wrong is worse than shipping nothing,
because the agent would inherit a judgment the script isn't qualified to make.

## Default mode — instruction-line signals

Scan `~/.claude/CLAUDE.md`, plus `~/.claude/AGENTS.md` when `CLAUDE.md` imports it (reuse
`scan.mjs`'s `parseImports` rather than reimplementing import detection — export it if needed).

Emit one record per matching line:

```jsonc
{ "file": "/abs/path/CLAUDE.md", "line": 14, "text": "<the line, trimmed>", "signal": "absolute" }
```

`signal` is one of, and a line may produce **several records if it matches several signals** — do not
pick a winner:

| signal | matches |
|---|---|
| `absolute` | `never`, `always`, `must`, `do not`, `don't`, `no exceptions`, `under no circumstances`, and ALL-CAPS imperative words (≥ 3 letters, e.g. `NEVER`, `ALWAYS`) |
| `numeric-threshold` | a bare number bound: `≤ N`, `<= N`, `max N`, `at most N`, `no more than N`, `N lines`, `N tokens` |
| `format-mandate` | instructions about output shape: `bullet points`, `respond in`, `format as`, `no comments`, `docstring`, `emoji` |
| `enumerated-ban` | a prohibition listing 2+ items: "never use X, Y, or Z" — a negation followed by a comma-or-`or` list |
| `harness-vocabulary` | any term from the trigger list in `references/harness-invariants.md` (`subagent`, `delegate`, `Agent tool`, `at session start`, `always read`, `never ask`, `always ask`, `remember this in`, `lessons.md`, `/tmp`, `hand off`) |

Matching rules:

- **Case-insensitive**, except the ALL-CAPS check, which is case-sensitive by definition.
- **Word boundaries.** `never` must not fire inside `nevertheless`.
- **Skip fenced code blocks entirely.** A `never` inside an example is not an instruction. Track
  ``` and `~~~` fences.
- **Skip blank lines, markdown headings, and bare `@import` lines.**
- Include a top-level `{ files: [...], totalLines, candidates: [...] }` wrapper so the agent can see
  what was scanned even when nothing matched.

High recall is correct here. A false candidate costs the agent one glance; a missed rule ships.

## `--surfaces` mode

Extract every `description` that is resident in context, from:

1. `~/.claude/skills/*/SKILL.md` — frontmatter `name` + `description`
2. `~/.claude/agents/*.md` — frontmatter `name` + `description`, **and** the body length
3. `~/.agents/skills/*/SKILL.md` — same as 1 (this location is part of the install; see `scan.mjs`)

```jsonc
{
  "surfaces": [
    { "kind": "skill", "path": "…", "name": "foo", "description": "…", "descriptionChars": 210, "bodyChars": 4400 }
  ],
  "totalDescriptionChars": 1830,
  "approxResidentTokens": 458,
  "skipped": [ { "path": "…", "reason": "frontmatter could not be parsed confidently" } ]
}
```

**The frontmatter reader is the risk in this ticket.** Write a minimal reader for the `key: value`
subset, and make it **fail closed**:

- Frontmatter is a `---` fence at the very start of the file, closed by another `---`.
- Handle: plain scalars, single- and double-quoted values (**a quoted value may contain `:`** — this
  is the common case for descriptions and a naive `split(':')` gets it wrong), and values continued
  across following indented lines.
- Do **not** attempt block scalars (`|`, `>`), anchors, arrays of maps, or nested maps.
- Anything you cannot parse confidently goes into `skipped` with a reason and is **omitted from
  `surfaces`**. Never guess at a description and never emit a partial one.

A mis-read description would make step 14 report a duplicate that doesn't exist, and the dev would
delete something real on our word. Fail closed.

## Tests for part 1

Build fake trees under `CLAUDE_TUNEUP_HOME` (follow `scan.test.mjs`). Cover at minimum:

1. Each of the five signals fires on a line that should match.
2. `never` does **not** fire inside `nevertheless` (word boundary).
3. A line matching two signals produces two records.
4. Lines inside a fenced code block produce **zero** records.
5. Headings, blanks, and bare `@AGENTS.md` lines produce zero records.
6. `AGENTS.md` is scanned when imported, and **not** scanned when it isn't.
7. Frontmatter: a `description:` containing a colon parses whole.
8. Frontmatter: a quoted description containing a colon parses whole.
9. Frontmatter: a block scalar (`description: |`) lands in `skipped`, not in `surfaces`.
10. A file with no frontmatter lands in `skipped`, not in `surfaces`.
11. `totalDescriptionChars` equals the sum of the emitted descriptions.
12. Empty install → valid JSON with empty arrays, no throw.

---

# Part 2 — auto-memory fields in `scan.mjs --section memory`

Extend the existing `memory` section. **Additive only** — every field it returns today must keep its
current name and meaning, and `scan.test.mjs`'s existing assertions must keep passing untouched.

New fields:

| field | value |
|---|---|
| `autoMemoryEnabled` | `false` when `CLAUDE_CODE_DISABLE_AUTO_MEMORY` is set in the environment **or** `autoMemoryEnabled: false` appears in `~/.claude/settings.json`; otherwise `true` |
| `autoMemoryDirectory` | the resolved `autoMemoryDirectory` from `~/.claude/settings.json`, with a leading `~/` expanded against `HOME` from `lib.mjs`; `null` if unset |
| `memoryScope` | `"global"` when `autoMemoryDirectory` is set, `"per-project"` otherwise |
| `memoryDir` | `{ path, exists, fileCount }` for the effective directory, or `null` if it can't be located |
| `teamMounts` | `true`/`false` — whether a `team/` subdirectory exists under the memory dir. **Presence only. Never read its contents.** |
| `soulStatus` | `"absent"` \| `"present-unwired"` \| `"present-wired"` — see below |

`soulStatus` values: `absent` (no `SOUL.md`), `present-unwired` (file exists, `CLAUDE.md` does not
import it), `present-wired` (file exists and is imported). Reuse the existing `importsSoul`.

**Locating the per-project memory dir.** When `autoMemoryDirectory` is unset, memory lives under
`~/.claude/projects/<sanitized-cwd>/memory/`. The sanitization transform is undocumented. **Do not
reimplement it.** List `~/.claude/projects/` and match against the existing entries. If no entry
matches the cwd, set `memoryDir: null` — the playbook treats that as "couldn't locate it, change
nothing", which is the correct outcome. **Never construct a path and assume it's right.**

Keep the `analyzeMemory()` split intact: the pure function takes already-read data and stays
testable without touching a real install; the I/O stays in `scanMemory()`.

## Tests for part 2

Extend `scan.test.mjs`. At minimum:

1. `autoMemoryEnabled` is `false` when the env var is set, and `false` when the settings flag is
   `false`, and `true` otherwise.
2. `autoMemoryDirectory` expands a leading `~/`.
3. `memoryScope` follows `autoMemoryDirectory`.
4. `memoryDir` is `null` when no `projects/` entry matches — and nothing throws.
5. `teamMounts` is `true` when the `team/` dir exists, and the test asserts nothing about contents.
6. All three `soulStatus` values.
7. Every pre-existing memory-section assertion still passes, unmodified.

---

## Definition of done

- `npm test` passes, including the new and extended tests.
- `--help` works on `audit-instructions.mjs` and exits 0.
- Files added/modified: `scripts/audit-instructions.mjs`, `scripts/audit-instructions.test.mjs`,
  `scripts/scan.mjs`, `scripts/scan.test.mjs`. **Nothing else** — do not touch `SKILL.md`,
  `references/*`, `README*`, `CHANGELOG.md`, or `package.json`.
