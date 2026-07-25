# Ticket: `doctor.mjs` — run Claude Code's built-in `/doctor` headlessly, report-only

## Goal

Add two files to `skills/claude-tuneup/scripts/`:

- `doctor.mjs` — spawns `claude -p "/doctor <report-only instruction>"`, parses the markdown
  report it prints on stdout, emits JSON on stdout.
- `doctor.test.mjs` — `node:test` + `node:assert/strict`, no network, no `claude` spawn.

Do **not** touch any other file. Do not edit `SKILL.md`, `README.md`, `CHANGELOG.md`,
`package.json`, or any `references/*.md` — those are handled separately.

## Read first

- `skills/claude-tuneup/scripts/insights.mjs` — the closest existing sibling. Same shape:
  `execFileSync('claude', ['-p', …])`, recursion guard, cache file, silent failure.
  **Copy its structure and its failure contract.** Differences are listed below.
- `skills/claude-tuneup/scripts/lib.mjs` — the shared core. Everything that reads the install
  must route through it.
- `skills/claude-tuneup/scripts/version-check.test.mjs` — the test style to mirror: the module
  exports small pure functions, the test imports them by name, and the side-effecting part of
  the script runs only at the bottom of the file.
- `skills/claude-tuneup/scripts/fixtures/doctor-report.md` — **a real `/doctor` report**,
  captured from an actual run and then sanitized. This is the parser's fixture. Build the
  parser against this file, not against any description of the format.

## Hard invariants (from `CLAUDE.md` — breaking one fails the ticket)

- **Node built-ins only.** No dependencies. No Python. No Node-version-specific APIs.
- **Cross-OS** (macOS / Windows / Linux). No shell strings, no `bash -c`, no assuming `python3`.
- **Paths via `fileURLToPath`**, never `new URL().pathname` — install paths contain spaces.
- **`CLAUDE_TUNEUP_HOME` overrides `HOME`.** Never call `os.homedir()` directly; import
  `CLAUDE_DIR` / `stateBase()` from `lib.mjs`. The whole test suite depends on this.
- **Read-only.** This script deletes nothing and moves nothing. Its only write is its own
  cache file.
- `npm test` must pass when you are done.

## Behaviour spec

### Invocation

```
node doctor.mjs              # cached result if fresh, else one real run
node doctor.mjs --no-cache   # force a fresh run
node doctor.mjs --help       # usage, exit 0, no side effects
```

### The `claude` call

```js
execFileSync('claude', ['-p', `/doctor ${REPORT_ONLY}`], { … })
```

where

```js
const REPORT_ONLY = 'Report only. Do not apply, edit, or write anything — output the findings and proposals as text.';
```

**`REPORT_ONLY` is a safety mechanism, not a preference.** `/doctor`'s command handler appends
any trailing text as `## Additional instructions from the user`. Headless has no
`AskUserQuestion`, so `/doctor`'s own confirmation gates cannot fire — without this instruction
a headless agent can read its own "propose, then apply" prompt and just apply. This has been
verified end-to-end against a real install: with the instruction present, no settings file,
memory file, agent, or skill was modified.

Consequences for the implementation:

1. Export the argv builder as a pure function (e.g. `buildArgv()`) so it can be tested.
2. `doctor.test.mjs` **must** assert that the argv returned always contains the report-only
   instruction, verbatim, for every code path that builds it. Treat this as the ticket's
   most important test.

### Options for `execFileSync`

- `encoding: 'utf8'`
- `timeout: 600000` — **600 s, not 120 s.** A real run was measured at **359 seconds**. The
  `insights.mjs` two-minute ceiling would have killed it mid-run. Do not lower this.
- `killSignal: 'SIGTERM'`
- `maxBuffer` large enough for a ~15 KB report with headroom (e.g. 10 MB).
- `env: { ...process.env, [RECURSION_GUARD]: '1' }` with
  `RECURSION_GUARD = 'CLAUDE_TUNEUP_DOCTOR_RUNNING'`. If that variable is already set on entry,
  return `{ ok: false, reason: … }` immediately and spawn nothing — same guard as `insights.mjs`.

### Cache

- Location: under `stateBase()` from `lib.mjs` — **not** inside the skill directory, and not in
  `CLAUDE_DIR`. Suggested `path.join(stateBase(), 'doctor-cache.json')`. Create parent dirs.
- TTL: 1 hour, same as `insights.mjs`.
- Shape: `{ ts, data }`.
- **Never cache a failed or empty parse.** If the report parsed to zero checks, return the
  result with a `note` and skip `saveCache` — a retry after a parser fix must re-parse.
- All cache reads and writes are wrapped so a corrupt or unwritable cache never throws.

### Failure contract — degrade silently, always

Return `{ ok: false, reason: '<one line, human-readable>' }` and exit **0** when:

- `claude` is not on `PATH` (`ENOENT`)
- the call times out (say so, with the elapsed seconds)
- it exits non-zero with no usable stdout
- stdout has no recognisable report structure

A tune-up run must never depend on this succeeding. Nothing here throws to the caller, and the
process never exits non-zero for an expected failure.

### Parsing

Output is **markdown on stdout**, not a file path (that is `/insights`; this is different).
Build the parser from the fixture. Export the parser as a pure function
`parseReport(markdown)` so the test can call it with the fixture and no spawn.

Target shape:

```jsonc
{
  "ok": true,
  "summary": "…prose from ## Summary…",
  "detail": [
    {
      "component": "alpha-skill",
      "type": "skill",
      "scope": "user (`~/.claude/skills`)",
      "uses": "172",
      "usedInWindow": "no (last 2099‑01‑15)",
      "residentTokens": "~320",
      "verdict": "keep",              // normalized keyword
      "verdictRaw": "**keep** — heaviest-used skill you own"
    }
  ],
  "checks": [
    { "n": 0, "title": "setup health: nothing wrong", "section": "proposed", "body": "…" },
    { "n": 5, "title": "hooks: all fast, …",          "section": "warnings", "body": "…" }
  ]
}
```

Rules the parser must follow:

- Split top level on `^## `, then checks on `^### Check (\d+)\b`. A check heading is
  `### Check N — <title>`; the separator is an em dash (U+2014) and **the title itself can
  contain a colon and further dashes** — take everything after the first ` — ` as the title.
- Record which `##` section each check came from: `## Proposed actions` → `section: "proposed"`,
  `## Warnings (no actions)` → `section: "warnings"`.
- **Check numbers are not contiguous and not ordered by section.** The fixture has 0,1,2,3,4,7,8,9
  under Proposed actions and 5,6 under Warnings. Never assume a range, never index by position.
- A check with nothing to report still emits its heading (`Check 0 — setup health: nothing wrong`).
  Keep it; do not filter empties.
- **Ignore markdown inside fenced code blocks** when splitting on headings. The fixture contains
  fenced blocks inside a check body; a line inside a fence must never be read as a heading or as
  a table row.
- The `## Detail` table: 7 columns, pipe-delimited, with a `|---|` separator row to skip. Cells
  contain backticks, `**bold**`, em dashes, and non-breaking hyphens (U+2011). Keep the raw cell
  text; do not strip formatting beyond trimming.
- **Verdicts: match on the leading keyword only, never the whole cell.** Known keywords are
  `keep`, `remove`, `not touching`, `no action`. Strip leading `**` first. An unrecognised
  verdict must become `null` (meaning "no opinion") — **never guess**, and never drop the row.
- The trailing `## Nothing was changed` section is not a check. Ignore it, but treat its absence
  as unremarkable — do not use it as a validity signal.
- Unknown `##` sections must be ignored without error. `/doctor` is compiled into the Claude Code
  binary and its format will drift; the parser degrades, it does not throw.

### Output

`lib.out(result)` — JSON on stdout, same as the other scripts.

## Tests (`doctor.test.mjs`)

At minimum:

1. `buildArgv()` always contains the verbatim report-only instruction. **Non-negotiable.**
2. `buildArgv()` produces `['-p', '/doctor …']` — the instruction is part of the `/doctor`
   argument, not a separate argv entry.
3. `parseReport(fixture)` finds all 10 checks, with the right numbers, and does **not** invent
   checks 10+ or assume contiguity.
4. Checks 5 and 6 are tagged `section: "warnings"`; 0–4 and 7–9 are `"proposed"`.
5. The detail table parses to the right number of rows with 7 fields each.
6. Verdict normalization: `**keep** — …` → `keep`; `**remove** — also never authorized…` →
   `remove`; `not touching — already off` → `not touching`; a fabricated garbage verdict → `null`
   with the row still present.
7. A check title containing a colon survives intact (`setup health: nothing wrong`).
8. Fenced-code content does not leak into heading or table parsing (check 1 has a JSON fence,
   check 3 has two plain fences).
9. `parseReport('')` and `parseReport('random text')` return a not-ok result rather than throwing.
10. The recursion guard: with `CLAUDE_TUNEUP_DOCTOR_RUNNING=1` set, the entry point returns
    `ok: false` and spawns nothing.

Read the fixture with `fileURLToPath(new URL('./fixtures/doctor-report.md', import.meta.url))`.

**No test may spawn `claude`.** The whole suite must run offline and fast.

## Definition of done

- `npm test` passes, including the new file.
- `node skills/claude-tuneup/scripts/doctor.mjs --help` prints usage and exits 0.
- No file outside `skills/claude-tuneup/scripts/doctor.mjs` and
  `skills/claude-tuneup/scripts/doctor.test.mjs` is added or modified.
