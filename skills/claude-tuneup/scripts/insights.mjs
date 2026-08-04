#!/usr/bin/env node
// Run Claude Code's built-in /insights headlessly (no browser) and extract the useful
// sections of the generated HTML report. Read-only. Cross-OS.
// The report is the dev's own local data — printed for live use, never stored by this skill.
//
//   node insights.mjs              -> cached result if fresh, else generate
//   node insights.mjs --no-cache   -> force a fresh run (one model call)
//
// CACHE: Results are cached to avoid costly model calls on repeated runs.
// Cache lives beside the backups (~/.claude-tuneup/, override $CLAUDE_TUNEUP_STATE) and
// expires after 1 hour. It used to sit INSIDE ~/.claude — the one place this skill's own
// state must never live, and where the skill's own root-file scan would then offer to
// delete it as a stray cache.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CLAUDE_DIR, stateBase, out, isMain } from './lib.mjs';
import { spawnClaude, withCache } from './headless.mjs';

export const CACHE_FILE = path.join(stateBase(), 'insights-cache.json');
// Where the cache used to live. Swept once, best-effort, so upgrading doesn't strand a
// stale file in the dev's install. A regenerable cache is the one thing this skill may
// hard-remove.
const LEGACY_CACHE_FILE = path.join(CLAUDE_DIR, '.claude-tuneup-insights-cache.json');
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const RECURSION_GUARD = 'CLAUDE_TUNEUP_INSIGHTS_RUNNING';

export function buildArgv() {
  return ['-p', '/insights'];
}

function sweepLegacyCache() {
  try { fs.rmSync(LEGACY_CACHE_FILE, { force: true }); } catch {}
}

export function section(html, anchorRe) {
  const re = new RegExp(anchorRe + '(.*?)(<h2|<h3|$)', 's');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

const WANT = [
  ['suggestedClaudeMd', 'Suggested CLAUDE\\.md Additions'],
  ['whatYouWorkOn', 'What You Work On'],
  ['howYouUse', 'How You Use Claude Code'],
  ['friction', 'Where Things Go Wrong'],
];

export function parseSections(html) {
  const sections = {};
  for (const [key, anchor] of WANT) {
    const s = section(html, anchor);
    if (s) sections[key] = s.slice(0, 2000);
  }
  return sections;
}

// Spawn `claude -p "/insights"`, which prints a line containing file://….html and opens
// no browser. Returns the report path, or a reason.
// Exported for offline tests. The injectable exec function keeps tests from ever spawning Claude.
export function locateReport({ exec = execFileSync } = {}) {
  // The recursion guard (never let insights spawn insights and fork model calls), the
  // 2-minute cap, and the degrade-never-throw error handling all live in headless.mjs.
  // A timeout is NOT fatal here: the `file://` line is all this needs, so partial output
  // is still worth matching against.
  const run = spawnClaude({
    argv: buildArgv(),
    guard: RECURSION_GUARD,
    label: 'insights',
    timeoutMs: 120000,
    emptyStdoutReason: (elapsedMs) => `insights timed out after ${elapsedMs / 1000}s (no output). Try again later.`,
    exec,
  });
  if (!run.ok) return run;
  const m = run.stdout.match(/file:\/\/(\S+\.html)/);
  const reportPath = m ? decodeURIComponent(m[1]) : null;
  if (!reportPath || !fs.existsSync(reportPath)) {
    return { ok: false, reason: 'no report (needs session history, or claude -p unavailable)' };
  }
  return { ok: true, report: reportPath };
}

export function generate({ noCache = false, exec = execFileSync } = {}) {
  sweepLegacyCache();
  // Empty sections usually mean the /insights HTML layout changed under us. That result is
  // returned but never cached — a retry after a fix must re-parse instead of being frozen
  // for an hour behind the miss.
  return withCache({
    file: CACHE_FILE,
    ttlMs: CACHE_TTL_MS,
    noCache,
    cacheable: (result) => result.ok && Object.keys(result.sections).length > 0,
  }, () => {
    const located = locateReport({ exec });
    if (!located.ok) return located;

    let html = '';
    try { html = fs.readFileSync(located.report, 'utf8'); }
    catch { return { ok: false, reason: `report at ${located.report} could not be read` }; }

    const sections = parseSections(html);
    const result = { ok: true, report: located.report, sections };
    if (Object.keys(sections).length === 0) {
      result.note = 'No known sections matched — the /insights HTML format may have changed. Read the report file directly and extract "Suggested CLAUDE.md Additions" by hand.';
    }
    return result;
  });
}

function usage() {
  process.stdout.write('Usage: node insights.mjs [--no-cache] [--help]\n');
}

if (isMain(import.meta.url)) {
  if (process.argv.includes('--help')) usage();
  else out(generate({ noCache: process.argv.includes('--no-cache') }));
}
